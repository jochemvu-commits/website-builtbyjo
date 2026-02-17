(function () {
    // Basic Configuration from script tag attributes
    const currentScript = document.currentScript;
    const config = {
        api: currentScript.dataset.api,
        businessId: currentScript.dataset.businessId,
        name: currentScript.dataset.name || 'Assistant',
        greeting: currentScript.dataset.greeting || 'Hello! How can I help you today?',
        color: currentScript.dataset.color || '#3b82f6'
    };

    // State
    let state = {
        isOpen: false,
        sessionId: null,
        isTyping: false,
        messages: []
    };

    // Generate Session ID
    function generateSessionId() {
        return 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize Session
    if (!localStorage.getItem('bj_session_id')) {
        localStorage.setItem('bj_session_id', generateSessionId());
    }
    state.sessionId = localStorage.getItem('bj_session_id');

    // Load Font
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // CSS Styles
    const styles = `
        #bjWidget {
            font-family: 'DM Sans', sans-serif;
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            pointer-events: none; /* Allow clicks through empty space */
        }
        
        #bjWidget * {
            box-sizing: border-box;
        }

        /* Toggle Button */
        #bjWidget .bj-toggle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: ${config.color};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
            position: relative;
            pointer-events: auto;
            margin-top: 16px;
        }

        #bjWidget .bj-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        #bjWidget .bj-icon {
            width: 28px;
            height: 28px;
            fill: #ffffff; 
            transition: opacity 0.3s ease, transform 0.3s ease;
            position: absolute;
        }

        #bjWidget .bj-icon.bj-close-icon {
            opacity: 0;
            transform: rotate(-90deg);
        }

        #bjWidget.bj-open .bj-icon.bj-chat-icon {
            opacity: 0;
            transform: rotate(90deg);
        }

        #bjWidget.bj-open .bj-icon.bj-close-icon {
            opacity: 1;
            transform: rotate(0);
        }

        #bjWidget .bj-notification-dot {
            position: absolute;
            top: 0;
            right: 0;
            width: 20px;
            height: 20px;
            background-color: #ef4444; /* Red */
            border-radius: 50%;
            border: 2px solid #0f0f0f; /* Match bg behind it if needed, or just white border */
            color: white;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 1;
            transform: scale(1);
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        
        #bjWidget.bj-open .bj-notification-dot {
            opacity: 0;
            transform: scale(0);
        }

        /* Chat Window */
        #bjWidget .bj-window {
            width: 380px;
            height: 540px;
            background-color: #0f0f0f;
            border: 1px solid #2a2a2a;
            border-radius: 16px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            transform-origin: bottom right;
            transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            visibility: hidden;
        }

        #bjWidget.bj-open .bj-window {
            opacity: 1;
            transform: translateY(0) scale(1);
            visibility: visible;
        }

        /* Header */
        #bjWidget .bj-header {
            padding: 16px 20px;
            background-color: #1a1a1a;
            border-bottom: 1px solid #2a2a2a;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        #bjWidget .bj-header-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        #bjWidget .bj-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }

        #bjWidget .bj-title-area {
            display: flex;
            flex-direction: column;
        }

        #bjWidget .bj-name {
            font-size: 16px;
            font-weight: 600;
            color: #e8e8e8;
            margin-bottom: 2px;
        }

        #bjWidget .bj-status {
            font-size: 12px;
            color: #10b981; /* Green */
            display: flex;
            align-items: center;
            gap: 4px;
        }

        #bjWidget .bj-status-dot {
            width: 6px;
            height: 6px;
            background-color: #10b981;
            border-radius: 50%;
        }

        #bjWidget .bj-reset-btn {
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: background 0.2s ease, color 0.2s ease;
        }

        #bjWidget .bj-reset-btn:hover {
            background-color: #2a2a2a;
            color: #e8e8e8;
        }
        
        #bjWidget .bj-reset-icon {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }

        /* Messages Area */
        #bjWidget .bj-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            padding-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            scrollbar-width: thin;
            scrollbar-color: #2a2a2a transparent;
        }
        
        #bjWidget .bj-messages::-webkit-scrollbar {
            width: 6px;
        }
        
        #bjWidget .bj-messages::-webkit-scrollbar-track {
            background: transparent;
        }
        
        #bjWidget .bj-messages::-webkit-scrollbar-thumb {
            background-color: #2a2a2a;
            border-radius: 3px;
        }

        /* Message Bubbles */
        #bjWidget .bj-message-wrapper {
            display: flex;
            flex-direction: column;
            max-width: 85%;
            animation: bj-fade-in-up 0.3s ease forwards;
            opacity: 0;
            transform: translateY(10px);
        }
        
        #bjWidget .bj-message-wrapper.bj-bot {
            align-self: flex-start;
        }
        
        #bjWidget .bj-message-wrapper.bj-user {
            align-self: flex-end;
            align-items: flex-end;
        }

        #bjWidget .bj-bot-label {
            font-size: 11px;
            color: ${config.color};
            margin-bottom: 4px;
            margin-left: 12px;
            font-weight: 500;
        }

        #bjWidget .bj-message-bubble {
            padding: 12px 16px;
            font-size: 14px;
            line-height: 1.5;
            color: #e8e8e8;
            word-wrap: break-word;
        }

        #bjWidget .bj-bot .bj-message-bubble {
            background-color: #1a1a1a;
            border: 1px solid #2a2a2a;
            border-radius: 14px 14px 14px 2px;
        }

        #bjWidget .bj-user .bj-message-bubble {
            background-color: ${config.color}; /* Blue */
            color: #ffffff;
            border-radius: 14px 14px 2px 14px;
        }
        
        #bjWidget .bj-message-bubble strong {
            font-weight: 600;
        }

        /* Typing Indicator */
        #bjWidget .bj-typing {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 12px 16px;
            background-color: #1a1a1a;
            border: 1px solid #2a2a2a;
            border-radius: 14px 14px 14px 2px;
            align-self: flex-start;
            margin-top: 8px;
            width: fit-content;
            animation: bj-fade-in-up 0.3s ease forwards;
        }

        #bjWidget .bj-dot {
            width: 6px;
            height: 6px;
            background-color: #9ca3af;
            border-radius: 50%;
            animation: bj-bounce 1.4s infinite ease-in-out both;
        }

        #bjWidget .bj-dot:nth-child(1) { animation-delay: -0.32s; }
        #bjWidget .bj-dot:nth-child(2) { animation-delay: -0.16s; }

        /* Quick Replies */
        #bjWidget .bj-quick-replies {
            padding: 0 20px 12px 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        #bjWidget .bj-quick-reply-btn {
            background: transparent;
            border: 1px solid ${config.color};
            color: ${config.color};
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        #bjWidget .bj-quick-reply-btn:hover {
            background-color: ${config.color};
            color: #ffffff;
        }

        /* Input Area */
        #bjWidget .bj-input-area {
            padding: 16px 20px;
            background-color: #1a1a1a;
            border-top: 1px solid #2a2a2a;
        }

        #bjWidget .bj-input-wrapper {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        #bjWidget .bj-input {
            flex: 1;
            background-color: #0f0f0f; /* Darker than surface */
            border: 1px solid #2a2a2a;
            border-radius: 24px;
            padding: 10px 16px;
            font-size: 14px;
            color: #e8e8e8;
            outline: none;
            font-family: 'DM Sans', sans-serif;
            transition: border-color 0.2s ease;
        }

        #bjWidget .bj-input:focus {
            border-color: ${config.color};
        }

        #bjWidget .bj-send-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: ${config.color};
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: opacity 0.2s ease;
            flex-shrink: 0;
        }

        #bjWidget .bj-send-btn:hover {
            opacity: 0.9;
        }
        
        #bjWidget .bj-send-btn:disabled {
            background-color: #2a2a2a;
            cursor: not-allowed;
            color: #525252;
        }

        #bjWidget .bj-send-icon {
            width: 20px;
            height: 20px;
            fill: #ffffff;
        }
        
        #bjWidget .bj-send-btn:disabled .bj-send-icon {
            fill: #525252;
        }

        #bjWidget .bj-branding {
            text-align: center;
            font-size: 11px;
        }

        #bjWidget .bj-branding a {
            color: #525252;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        #bjWidget .bj-branding a:hover {
            color: #9ca3af;
        }

            #bjWidget .bj-link {
                color: ${config.color};
                text-decoration: underline;
                font-weight: 500;
            }
            
            #bjWidget .bj-link:hover {
                opacity: 0.8;
            }
            
            #bjWidget .bj-calendly-btn {
                display: block;
                width: 100%;
                background-color: ${config.color};
                color: #ffffff !important;
                text-align: center;
                padding: 10px 20px;
                border-radius: 8px;
                text-decoration: none !important;
                font-weight: 600;
                margin-top: 8px;
                margin-bottom: 8px;
                transition: opacity 0.2s ease;
            }
            
            #bjWidget .bj-calendly-btn:hover {
                opacity: 0.9;
            }

            /* Animations */
            @keyframes bj-fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes bj-bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
            
            /* Mobile Responsive */
            @media (max-width: 480px) {
                #bjWidget .bj-toggle {
                   margin-right: -8px; /* Slight adjustment for padding */
                }
                
                #bjWidget .bj-window {
                    position: fixed;
                    bottom: 100px; /* Above toggle with space */
                    right: 8px; /* 16px total distinct space */
                    width: calc(100vw - 32px); /* 16px margin each side */
                    height: calc(100vh - 120px);
                    right: 16px; 
                }
                
                #bjWidget {
                     right: 16px;
                     bottom: 16px;
                     align-items: flex-end; /* Keep aligned right */
                }
            }

        /* Light Mode Support */
        [data-theme="light"] #bjWidget .bj-window {
            background-color: #ffffff;
            border-color: #e5e7eb;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }

        [data-theme="light"] #bjWidget .bj-header {
            background-color: #f9fafb;
            border-bottom-color: #e5e7eb;
        }

        [data-theme="light"] #bjWidget .bj-name {
            color: #1f2937;
        }

        [data-theme="light"] #bjWidget .bj-reset-btn {
            color: #6b7280;
        }

        [data-theme="light"] #bjWidget .bj-reset-btn:hover {
            background-color: #f3f4f6;
            color: #1f2937;
        }

        [data-theme="light"] #bjWidget .bj-messages {
            scrollbar-color: #d1d5db transparent;
        }

        [data-theme="light"] #bjWidget .bj-messages::-webkit-scrollbar-thumb {
            background-color: #d1d5db;
        }

        [data-theme="light"] #bjWidget .bj-message-bubble {
            color: #1f2937;
        }

        [data-theme="light"] #bjWidget .bj-bot .bj-message-bubble {
            background-color: #f3f4f6;
            border-color: #e5e7eb;
        }

        [data-theme="light"] #bjWidget .bj-typing {
            background-color: #f3f4f6;
            border-color: #e5e7eb;
        }

        [data-theme="light"] #bjWidget .bj-dot {
            background-color: #9ca3af;
        }

        [data-theme="light"] #bjWidget .bj-input-area {
            background-color: #f9fafb;
            border-top-color: #e5e7eb;
        }

        [data-theme="light"] #bjWidget .bj-input {
            background-color: #ffffff;
            border-color: #e5e7eb;
            color: #1f2937;
        }

        [data-theme="light"] #bjWidget .bj-send-btn:disabled {
            background-color: #e5e7eb;
        }

        [data-theme="light"] #bjWidget .bj-branding a {
            color: #9ca3af;
        }

        [data-theme="light"] #bjWidget .bj-branding a:hover {
            color: #6b7280;
        }

        [data-theme="light"] #bjWidget .bj-notification-dot {
            border-color: #ffffff;
        }
    `;

    // Inject Styles
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Create Widget Container
    const widgetContainer = document.createElement("div");
    widgetContainer.id = "bjWidget";

    // Icons
    const icons = {
        chat: `<svg class="bj-icon bj-chat-icon" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M216,48H40A16,16,0,0,0,24,64V224a15.84,15.84,0,0,0,9.25,14.5A16.05,16.05,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L93,192h123a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,128H93a8.13,8.13,0,0,0-5.26,1.93l-47.74,42V64h176Z"></path></svg>`,
        close: `<svg class="bj-icon bj-close-icon" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>`,
        send: `<svg class="bj-send-icon" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M231.87,114l-168-95.89A16,16,0,0,0,40.92,37.34L71.55,128,40.92,218.67A16,16,0,0,0,56,240a16.15,16.15,0,0,0,7.93-2.1l167.92-96.05a16,16,0,0,0,.05-27.89ZM56,224a.56.56,0,0,0,0-.12L85.74,136H144a8,8,0,0,0,0-16H85.74L56.06,32.16A.46.46,0,0,0,56,32l168,96Z"></path></svg>`,
        reset: `<svg class="bj-reset-icon" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M224,48v48a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h26.49A88.17,88.17,0,0,0,45.8,92.56a8,8,0,0,1-13.6-8.24A104.18,104.18,0,0,1,199.18,80H176a8,8,0,0,1,0-16h40A8,8,0,0,1,224,48ZM210.2,155.44a8,8,0,0,0-13.6,8.24A88.17,88.17,0,0,1,61.51,152H88a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V166.82A104.18,104.18,0,0,0,210.2,155.44Z"></path></svg>`
    };

    // Main HTML Structure
    widgetContainer.innerHTML = `
        <div class="bj-window">
            <div class="bj-header">
                <div class="bj-header-info">
                    <div class="bj-avatar"><img src="/widget/logo.png" style="width:40px;height:40px;border-radius:50%;" alt="Kai"></div>
                    <div class="bj-title-area">
                        <div class="bj-name">${config.name}</div>
                        <div class="bj-status">
                            <div class="bj-status-dot"></div>
                            Online
                        </div>
                    </div>
                </div>
                <button class="bj-reset-btn" title="Start new chat">
                    ${icons.reset}
                </button>
            </div>
            
            <div class="bj-messages" id="bjMessages">
                <!-- Messages injected here -->
            </div>
            
            <div class="bj-quick-replies" id="bjQuickReplies">
                <!-- Quick replies injected here -->
            </div>

            <div class="bj-input-area">
                <form class="bj-input-wrapper" id="bjChatForm">
                    <input type="text" class="bj-input" placeholder="Type a message..." aria-label="Type a message">
                    <button type="submit" class="bj-send-btn" disabled>
                        ${icons.send}
                    </button>
                </form>
                <div class="bj-branding">
                    <a href="https://builtbyjo.co" target="_blank" rel="noopener noreferrer">Powered by builtbyjo</a>
                </div>
            </div>
        </div>

        <div class="bj-toggle" id="bjToggle">
            ${icons.chat}
            ${icons.close}
            <div class="bj-notification-dot">1</div>
        </div>
    `;

    document.body.appendChild(widgetContainer);

    // Elements
    const toggleBtn = widgetContainer.querySelector('#bjToggle');
    const windowEl = widgetContainer.querySelector('.bj-window');
    const messagesEl = widgetContainer.querySelector('#bjMessages');
    const quickRepliesEl = widgetContainer.querySelector('#bjQuickReplies');
    const form = widgetContainer.querySelector('#bjChatForm');
    const input = widgetContainer.querySelector('.bj-input');
    const sendBtn = widgetContainer.querySelector('.bj-send-btn');
    const resetBtn = widgetContainer.querySelector('.bj-reset-btn');
    const notificationDot = widgetContainer.querySelector('.bj-notification-dot');

    // Helper: Parse Markdown (Basic + URLs)
    function parseMarkdown(text) {
        if (!text) return '';
        let html = text;

        // URLs -> Links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        html = html.replace(urlRegex, (url) => {
            if (url.includes('calendly.com')) {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="bj-calendly-btn">Book a Free Call →</a>`;
            }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="bj-link">${url}</a>`;
        });

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Newlines
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    // Default Quick Replies
    const defaultQuickReplies = [];

    // Functions
    function toggleChat() {
        state.isOpen = !state.isOpen;
        if (state.isOpen) {
            widgetContainer.classList.add('bj-open');
            notificationDot.style.opacity = '0';
            setTimeout(() => input.focus(), 100);

            // First open logic
            if (state.messages.length === 0) {
                addBotMessage(config.greeting);
            }
        } else {
            widgetContainer.classList.remove('bj-open');
        }
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addMessageUI(text, isBot) {
        const wrapper = document.createElement('div');
        wrapper.className = `bj-message-wrapper ${isBot ? 'bj-bot' : 'bj-user'}`;

        let content = '';
        if (isBot) {
            content += `<div class="bj-bot-label">${config.name}</div>`;
        }
        content += `<div class="bj-message-bubble">${parseMarkdown(text)}</div>`;

        wrapper.innerHTML = content;
        messagesEl.appendChild(wrapper);
        scrollToBottom();
    }

    function addBotMessage(text) {
        state.messages.push({ role: 'assistant', content: text });
        addMessageUI(text, true);
    }

    function addUserMessage(text) {
        state.messages.push({ role: 'user', content: text });
        addMessageUI(text, false);
    }

    function showTyping() {
        if (state.isTyping) return;
        state.isTyping = true;
        const typingEl = document.createElement('div');
        typingEl.id = 'bjTypingIndicator';
        typingEl.className = 'bj-typing';
        typingEl.innerHTML = `
            <div class="bj-dot"></div>
            <div class="bj-dot"></div>
            <div class="bj-dot"></div>
        `;
        messagesEl.appendChild(typingEl);
        scrollToBottom();
    }

    function hideTyping() {
        if (!state.isTyping) return;
        state.isTyping = false;
        const typingEl = document.getElementById('bjTypingIndicator');
        if (typingEl) typingEl.remove();
    }

    function renderQuickReplies(replies) {
        quickRepliesEl.innerHTML = '';
        if (!replies || replies.length === 0) return;

        replies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'bj-quick-reply-btn';
            btn.textContent = reply;
            btn.onclick = () => handleSendMessage(reply);
            quickRepliesEl.appendChild(btn);
        });
    }

    async function handleSendMessage(text) {
        if (!text.trim()) return;

        // Use the text passed or from input
        const messageText = text;
        input.value = '';
        sendBtn.disabled = true;

        // Clear quick replies immediately when user acts
        renderQuickReplies([]);

        addUserMessage(messageText);
        showTyping();

        try {
            const response = await fetch(config.api, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: messageText,
                    sessionId: state.sessionId,
                    businessId: config.businessId
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();

            hideTyping();

            // Handle response which might be object or just text
            // Expecting { message: "...", quickReplies: [...] }
            // Or just a direct text if simplicity is preferred, but prompt implies specific structure
            const botText = data.reply || "I received your message but got an empty response.";
            addBotMessage(botText);

            if (data.quickReplies && Array.isArray(data.quickReplies)) {
                renderQuickReplies(data.quickReplies);
            }

        } catch (error) {
            console.error('Chat Widget Error:', error);
            hideTyping();
            addBotMessage("Having trouble connecting. You can reach us at jay@builtbyjo.co");
        } finally {
            sendBtn.disabled = false;
            // Keep input focused
            if (window.innerWidth > 480) { // Don't force focus on mobile to avoid keyboard jumping
                input.focus();
            }
        }
    }

    function resetSession() {
        // Clear UI
        messagesEl.innerHTML = '';
        quickRepliesEl.innerHTML = '';
        state.messages = [];

        // Reset Session ID
        localStorage.removeItem('bj_session_id'); // Clear old format
        state.sessionId = generateSessionId();
        localStorage.setItem('bj_session_id', state.sessionId);

        // Restart flow
        addBotMessage(config.greeting);
        renderQuickReplies(defaultQuickReplies);
    }

    // Event Listeners
    toggleBtn.addEventListener('click', toggleChat);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(input.value);
    });

    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim();
    });

    resetBtn.addEventListener('click', () => {
        // Confirm first? Maybe overkill for simple widget. Let's just do it or clear silently.
        // Prompt implies "reset/new chat button", so direct action is fine.
        resetSession();
    });

    // Handle clicks outside to close? Not strictly requested, but good UX.
    // Spec says 'opens above toggle'. Usually widgets stay open until explicitly closed or toggle clicked.
    // I will stick to toggle button for closing.

})();

/**
 * AI 悬浮球组件 - ai-assistant.js
 * 功能：提供智能问答、语音输入、快捷跳转
 */
(function() {
    // ==========================================================
    // 0. 依赖管理 (自动加载 crypto-js)
    // ==========================================================
    function loadCryptoJS(callback) {
        if (typeof CryptoJS !== 'undefined') {
            callback();
            return;
        }
        var script = document.createElement('script');
        script.src = "crypto-js.min.js";
        script.onload = callback;
        script.onerror = function() {
            console.error("AI助手依赖加载失败：CryptoJS");
            alert("AI助手组件加载失败，请检查网络或路径。");
        };
        document.head.appendChild(script);
    }

    // ==========================================================
    // 1. 初始化主逻辑
    // ==========================================================
    function initAIAssistant() {
        // --- 默认跳转逻辑 (如果外部 HTML 已经定义了 window.openSystemPage，则不覆盖) ---
        if (!window.openSystemPage) {
            window.openSystemPage = function(pageCode) {
                if(pageCode === 'reserve') {
                    alert("【系统提示】正在为您跳转到 [在线预约] 界面...");
                } else if (pageCode === 'consult') {
                    alert("【系统提示】正在打开 [专家咨询] 窗口...");
                } else if (pageCode.indexOf('scene-bundle.html') > -1) {
                    window.open(pageCode);
                } else if (pageCode.indexOf('scene-bundle.html') > -1) {
                    // 示例：新窗口打开
                    window.open(pageCode);
                } else if (pageCode === 'download_center') {
                    alert("正在跳转下载中心...");
                } else {
                    alert("未定义的跳转页面: " + pageCode);
                }
            };
        }

        // --- 配置中心 ---
        const CONFIG = {
            APPID: "1562f943",
            APISecret: "YTNkYTE3MjkyMWMyODA3MTBkNTkyM2Zm",
            APIKey: "2cdbcc531505a58d8ce79bd2fb86d416",
            hostUrl: "wss://spark-api.xf-yun.com/v1.1/chat"
        };

        // --- 本地知识库 ---
        const LOCAL_KB = [
            {
                keywords: ["预约", "排队", "取号", "挂号"],
                answer: `您可以直接点击此处：<span class="ai-link" onclick="openSystemPage('reserve')">【进入在线预约大厅】</span><br>系统支持提前7天预约办理。`
            },
            {
                keywords: ["怎么用", "如何使用", "操作指南"],
                answer: `<b>使用帮助：</b><br>1. 询问具体事项（如社保、公积金）。<br>2. 点击链接直接办理业务。<br>3. 遇到困难可点击：<span class="ai-link" onclick="openSystemPage('consult')">【呼叫人工客服】</span>`
            },
            {
                keywords: ["下载", "表格", "材料"],
                answer: `常用表格下载专区已为您准备好，请点击 <span class="ai-link" onclick="openSystemPage('download_center')">此处跳转下载中心</span>。`
            },
            {
                keywords: ["出生", "医保", "户口"],
                answer: `人生一件事出生专区已为您准备好，请点击 <span class="ai-link" onclick="openSystemPage('scene-bundle.html?scene=birth')">此处跳转人生一件事</span>。`
            },
            {
                keywords: ["学位", "录取", "报名", "学区"],
                answer: `人生一件事入学专区已为您准备好，请点击 <span class="ai-link" onclick="openSystemPage('scene-bundle.html?scene=school')">此处跳转人生一件事</span>。`
            }
        ];

        // --- 注入 CSS 和 HTML ---
        var aiHtml = `
        <style>
            @keyframes ripple { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
            .mic-listening { color: #EF4444 !important; animation: ripple 1.5s infinite; border-color: #EF4444 !important; }
            .ai-msg-bubble { padding: 10px 14px; border-radius: 12px; font-size: 14px; max-width: 80%; line-height: 1.5; margin-bottom: 15px; position: relative; word-wrap: break-word; }
            .ai-msg-left { background: #fff; color: #374151; border-radius: 0 12px 12px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); align-self: flex-start; }
            .ai-msg-right { background: #1E40AF; color: #fff; border-radius: 12px 0 12px 12px; align-self: flex-end; }
            .ai-link { color: #2563EB; font-weight: bold; cursor: pointer; text-decoration: underline; transition: color 0.2s; }
            .ai-link:hover { color: #D97706; }
            .typing-indicator span { display: inline-block; width: 6px; height: 6px; background-color: #9CA3AF; border-radius: 50%; animation: typing 1.4s infinite ease-in-out both; margin: 0 2px; }
            .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
            .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
            @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            /* 引入 Layui Icon (如果宿主页面没有layui，这里使用CDN加载图标字体，或者您可以直接换成SVG) */
            @import url('layui//layui.css'); 
        </style>

        <div id="ai-float-ball" style="position: fixed; right: 30px; bottom: 100px; z-index: 99999;">
            <div id="ai-entry-btn" style="width: 60px; height: 60px; background: linear-gradient(135deg, #2563EB, #1E40AF); border-radius: 50%; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.5); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;">
                <i class="layui-icon layui-icon-dialogue" style="font-size: 32px; color: #fff;"></i>
            </div>
        </div>

        <div id="ai-chat-panel" style="position: fixed; right: 30px; bottom: 170px; width: 380px; height: 550px; background: #F3F4F6; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 99999; display: none; flex-direction: column; overflow: hidden; border: 1px solid #fff;">
            <div style="background: #1E40AF; padding: 15px 20px; color: #fff; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-weight: bold; font-size: 16px;">智能导办助手</span>
                    <div style="font-size: 12px; opacity: 0.8; display:flex; align-items:center; margin-top:2px;">
                        <span style="width:8px; height:8px; background:#10B981; border-radius:50%; margin-right:5px;"></span> 在线中
                    </div>
                </div>
                <i class="layui-icon layui-icon-down" style="cursor: pointer;" onclick="document.getElementById('ai-chat-panel').style.display='none'"></i>
            </div>

            <div id="ai-msg-box" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column;">
                <div class="ai-msg-bubble ai-msg-left">
                    您好！我是您的政务助手。<br>您可以试着问我：<br>“<span class="ai-link" onclick="window.setAiInput('我要预约');window.sendAiMsg()">我要预约</span>” 或 “<span class="ai-link" onclick="window.setAiInput('操作指南');window.sendAiMsg()">操作指南</span>”
                </div>
            </div>

            <div style="padding: 15px; background: #fff; display: flex; align-items: center; gap: 10px;">
                <button id="btn-mic-float" style="background:none; border:1px solid #ddd; border-radius:50%; width:40px; height:40px; cursor:pointer; color:#666; transition:0.3s;" title="语音输入">
                    <i class="layui-icon layui-icon-voice" style="font-size: 20px;"></i>
                </button>
                <input type="text" id="ai-input" placeholder="输入问题..." style="flex: 1; border: 1px solid #E5E7EB; border-radius: 20px; padding: 10px 15px; outline: none; font-size: 14px; background:#F9FAFB;">
                <button onclick="window.sendAiMsg()" style="background: #1E40AF; color: #fff; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 10px rgba(30, 64, 175, 0.3);">
                    <i class="layui-icon layui-icon-release" style="font-size: 18px; margin-left: 2px;"></i>
                </button>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', aiHtml);

        // --- 核心逻辑 ---
        var ball = document.getElementById('ai-entry-btn');
        var panel = document.getElementById('ai-chat-panel');
        var msgBox = document.getElementById('ai-msg-box');
        var input = document.getElementById('ai-input');
        
        // 辅助函数：外部调用 input 设置值
        window.setAiInput = function(val) { input.value = val; };

        ball.onclick = function() {
            panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'flex' : 'none';
            if(panel.style.display === 'flex') input.focus();
        };

        function appendMsg(text, side) {
            var cls = side === 'right' ? 'ai-msg-right' : 'ai-msg-left';
            if(!text.includes('<')) text = text.replace(/\n/g, '<br>');
            var html = `<div class="ai-msg-bubble ${cls}">${text}</div>`;
            msgBox.insertAdjacentHTML('beforeend', html);
            msgBox.scrollTop = msgBox.scrollHeight;
        }

        function matchLocalKnowledge(text) {
            if (!text) return null;
            for (let item of LOCAL_KB) {
                for (let keyword of item.keywords) {
                    if (text.includes(keyword)) return item.answer;
                }
            }
            return null;
        }

        window.sendAiMsg = function() {
            var val = input.value.trim();
            if(!val) return;

            appendMsg(val, 'right');
            input.value = '';

            var localAnswer = matchLocalKnowledge(val);
            if (localAnswer) {
                setTimeout(function() { appendMsg(localAnswer, 'left'); }, 300);
                return;
            }

            var loadingId = 'loading-' + new Date().getTime();
            var loadingHtml = `<div id="${loadingId}" class="ai-msg-bubble ai-msg-left"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
            msgBox.insertAdjacentHTML('beforeend', loadingHtml);
            msgBox.scrollTop = msgBox.scrollHeight;

            connectSparkWebSocket(val, loadingId);
        };

        input.addEventListener('keypress', function(e){ if(e.key === 'Enter') window.sendAiMsg(); });

        // --- WebSocket 逻辑 ---
        function getWebsocketUrl() {
            return new Promise((resolve, reject) => {
                try {
                    var url = new URL(CONFIG.hostUrl);
                    var host = url.host;
                    var path = url.pathname;
                    var date = new Date().toGMTString();
                    var algorithm = 'hmac-sha256';
                    var headers = 'host date request-line';
                    var signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
                    var signatureSha = CryptoJS.HmacSHA256(signatureOrigin, CONFIG.APISecret);
                    var signature = CryptoJS.enc.Base64.stringify(signatureSha);
                    var authorizationOrigin = `api_key="${CONFIG.APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
                    var authorization = btoa(authorizationOrigin);
                    path = `${path}?authorization=${authorization}&date=${date}&host=${host}`;
                    resolve(`wss://${host}${path}`);
                } catch (err) { reject(err); }
            });
        }

        function connectSparkWebSocket(question, loadingId) {
            getWebsocketUrl().then(url => {
                let socket = new WebSocket(url);
                let totalRes = "";
                const systemContext = "你是一个专业的政府政务服务助手。如果用户问如何办理某事，请简要回答。";
                socket.onopen = () => {
                    var params = {
                        "header": { "app_id": CONFIG.APPID, "uid": "guest" },
                        "parameter": { "chat": { "domain": "lite", "temperature": 0.5, "max_tokens": 1024 } },
                        "payload": { "message": { "text": [ { "role": "user", "content": systemContext + question } ] } }
                    };
                    socket.send(JSON.stringify(params));
                };
                socket.onmessage = (event) => {
                    let data = JSON.parse(event.data);
                    if (data.header.code !== 0) {
                        socket.close();
                        document.getElementById(loadingId)?.remove();
                        appendMsg("服务报错: " + data.header.message, 'left');
                        return;
                    }
                    if (data.payload && data.payload.choices && data.payload.choices.text) {
                        totalRes += data.payload.choices.text[0].content;
                    }
                    if (data.header.status === 2) {
                        socket.close();
                        document.getElementById(loadingId)?.remove();
                        appendMsg(totalRes, 'left');
                    }
                };
                socket.onerror = (err) => {
                    document.getElementById(loadingId)?.remove();
                    appendMsg("连接断开。", 'left');
                };
            });
        }

        // --- 语音识别模块 ---
        var micBtn = document.getElementById('btn-mic-float');
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            var recognition = new SpeechRecognition();
            recognition.lang = 'zh-CN';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onstart = function() { micBtn.classList.add('mic-listening'); input.placeholder = "正在聆听..."; };
            recognition.onend = function() { micBtn.classList.remove('mic-listening'); input.placeholder = "输入问题..."; };
            recognition.onresult = function(event) { input.value = event.results[0][0].transcript; window.sendAiMsg(); };
            micBtn.onclick = function() { if (micBtn.classList.contains('mic-listening')) recognition.stop(); else recognition.start(); };
        } else { micBtn.style.display = 'none'; }
    }

    // ==========================================================
    // 3. 启动入口
    // ==========================================================
    // 等待页面加载完成 -> 加载依赖 -> 初始化AI
    window.addEventListener('load', function() {
        loadCryptoJS(initAIAssistant);
    });

})();
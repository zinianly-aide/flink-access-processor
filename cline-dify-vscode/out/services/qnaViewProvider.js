"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QnaViewProvider = void 0;
const vscode = __importStar(require("vscode"));
class QnaViewProvider {
    constructor(extensionUri, difyService, mcpService, citationService) {
        this.extensionUri = extensionUri;
        this.difyService = difyService;
        this.mcpService = mcpService;
        this.citationService = citationService;
        this.messages = [];
        this.commandMappings = [
            { pattern: /(打开|设置).*(配置|设置)/i, command: 'cline-dify-assistant.configureSettings', successMessage: '已启动配置命令，可在命令面板中继续操作。' },
            { pattern: /(查看|显示).*(结构|目录)/i, command: 'cline-dify-assistant.showProjectStructure', successMessage: '已打开项目结构视图。' },
            { pattern: /(查看|显示).*(变更|diff|差异)/i, command: 'cline-dify-assistant.openChangeTracker', successMessage: '已打开 Code Change Tracker 面板。' },
            { pattern: /(调试|运行).*(生成代码|生成器)/i, command: 'cline-dify-assistant.debugGeneratedCode', successMessage: '已触发调试生成器命令。' }
        ];
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        webviewView.webview.html = this.getHtml(this.messages);
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'askQuestion':
                    await this.handleQuestion(message.text);
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('cline-dify-assistant.configureSettings');
                    break;
            }
        });
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.refresh();
            }
        });
    }
    async handleQuestion(text) {
        const trimmed = (text ?? '').trim();
        if (!trimmed) {
            return;
        }
        this.messages.push({ role: 'user', content: trimmed });
        this.postMessages();
        if (await this.tryHandleCitation(trimmed)) {
            return;
        }
        if (await this.tryHandleLocalCommand(trimmed)) {
            return;
        }
        if (await this.tryHandleMcp(trimmed)) {
            return;
        }
        const response = await this.difyService.getModelResponse(trimmed, 'Q&A');
        this.messages.push({
            role: 'assistant',
            content: response || '未能获取回答，请检查配置或稍后重试。'
        });
        this.postMessages();
    }
    refresh() {
        if (!this._view) {
            return;
        }
        this._view.webview.html = this.getHtml(this.messages);
        setTimeout(() => this.postMessages(), 100);
    }
    async tryHandleLocalCommand(text) {
        for (const mapping of this.commandMappings) {
            if (mapping.pattern.test(text)) {
                await vscode.commands.executeCommand(mapping.command);
                this.messages.push({ role: 'assistant', content: mapping.successMessage });
                this.postMessages();
                return true;
            }
        }
        return false;
    }
    async tryHandleCitation(text) {
        const citation = await this.citationService.handleCitationRequest(text);
        if (!citation) {
            return false;
        }
        this.messages.push({ role: 'assistant', content: citation });
        this.postMessages();
        return true;
    }
    async tryHandleMcp(text) {
        if (!this.mcpService.isEnabled()) {
            return false;
        }
        const triggers = [/^\/mcp/i, /^mcp[:：]/i, /使用\s*mcp/i, /调用\s*mcp/i];
        const matched = triggers.some(regex => regex.test(text));
        if (!matched) {
            return false;
        }
        const query = text.replace(/^\/?mcp[:：]?/i, '').replace(/使用\s*mcp/i, '').replace(/调用\s*mcp/i, '').trim() || text;
        try {
            const result = await this.mcpService.executeQuery(query);
            this.messages.push({ role: 'assistant', content: `MCP 结果：\n${result}` });
        }
        catch (error) {
            this.messages.push({ role: 'assistant', content: `MCP 查询失败：${error?.message ?? error}` });
        }
        this.postMessages();
        return true;
    }
    postMessages() {
        this._view?.webview.postMessage({ type: 'updateMessages', messages: this.messages });
    }
    getHtml(_messages) {
        const config = vscode.workspace.getConfiguration('cline-dify-assistant');
        const provider = config.get('provider', 'dify');
        const model = provider === 'ollama'
            ? config.get('ollamaModel', 'llama3')
            : config.get('model', 'gpt-4');
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; margin: 0; }
        h2 { margin-top: 0; color: #4F46E5; }
        .chat-container { display: flex; flex-direction: column; gap: 8px; height: calc(100vh - 200px); overflow-y: auto; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; }
        .message { padding: 10px 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
        .user { background: #e0f2fe; align-self: flex-end; }
        .assistant { background: #f3f4f6; align-self: flex-start; }
        .input-row { margin-top: 12px; display: flex; gap: 8px; }
        input { flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid #d1d5db; }
        button { padding: 8px 14px; border: none; border-radius: 6px; background: #4F46E5; color: white; cursor: pointer; }
        button:disabled { background: #cbd5f5; cursor: not-allowed; }
        .settings { margin-top: 16px; font-size: 12px; color: #6b7280; }
        .settings button { margin-top: 6px; background: transparent; border: 1px solid #4F46E5; color: #4F46E5; padding: 6px 12px; }
    </style>
</head>
<body>
    <h2>Q&A Assistant</h2>
    <div class="chat-container" id="chat"></div>
    <div class="input-row">
        <input id="questionInput" type="text" placeholder="输入问题并按下发送" />
        <button id="sendButton">发送</button>
    </div>
    <div class="settings">
        当前 Provider: <strong>${provider}</strong> · Model: <strong>${model}</strong><br>
        <button id="openSettings">打开配置</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const chat = document.getElementById('chat');
        const input = document.getElementById('questionInput');
        const button = document.getElementById('sendButton');
        const openSettings = document.getElementById('openSettings');

        function renderMessages(messages) {
            chat.innerHTML = '';
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'message ' + msg.role;
                div.textContent = msg.content;
                chat.appendChild(div);
            });
            chat.scrollTop = chat.scrollHeight;
        }

        button.addEventListener('click', () => {
            const value = input.value.trim();
            if (!value) { return; }
            button.disabled = true;
            vscode.postMessage({ type: 'askQuestion', text: value });
            input.value = '';
            setTimeout(() => { button.disabled = false; }, 300);
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                button.click();
            }
        });

        openSettings.addEventListener('click', () => {
            vscode.postMessage({ type: 'openSettings' });
        });

        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'updateMessages') {
                renderMessages(message.messages || []);
            }
        });
    </script>
</body>
</html>`;
    }
}
exports.QnaViewProvider = QnaViewProvider;
QnaViewProvider.viewType = 'cline-dify-assistant-qna';
//# sourceMappingURL=qnaViewProvider.js.map
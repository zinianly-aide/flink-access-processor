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
exports.FeaturesViewProvider = exports.SettingsViewProvider = void 0;
const vscode = __importStar(require("vscode"));
class SettingsViewProvider {
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'updateSetting':
                    void this._updateSetting(data.key, data.value);
                    break;
            }
        });
        // Refresh when the view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && this._view) {
                this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            }
        });
    }
    async _updateSetting(key, value) {
        console.log(`Updating setting: ${key} = ${value}`);
        try {
            const config = vscode.workspace.getConfiguration('cline-dify-assistant');
            const hasWorkspace = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
            const target = hasWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
            await config.update(key, value, target);
            // Force refresh the view to show updated values
            if (this._view) {
                this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            }
            vscode.window.showInformationMessage(`${key} updated successfully!`);
            console.log(`Setting ${key} updated successfully`);
        }
        catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            vscode.window.showErrorMessage(`Failed to update ${key}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    _getHtmlForWebview(webview) {
        // Get current settings
        const config = vscode.workspace.getConfiguration('cline-dify-assistant');
        const apiKey = config.get('apiKey', '');
        const baseUrl = config.get('baseUrl', 'https://api.dify.ai');
        const model = config.get('model', 'gpt-4');
        const provider = config.get('provider', 'dify');
        const ollamaBaseUrl = config.get('ollamaBaseUrl', 'http://localhost:11434');
        const ollamaModel = config.get('ollamaModel', 'llama3');
        const mcpEnabled = config.get('mcpEnabled', false);
        const mcpBaseUrl = config.get('mcpBaseUrl', 'http://localhost:3921');
        const mcpApiKey = config.get('mcpApiKey', '');
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cline Dify Assistant Settings</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 16px;
                        line-height: 1.6;
                        color: #333;
                        background-color: #fff;
                    }
                    h1 {
                        font-size: 18px;
                        margin-bottom: 20px;
                        color: #4F46E5;
                    }
                    .setting-group {
                        margin-bottom: 20px;
                    }
                    .setting-label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                    }
                    .setting-input {
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                    .setting-input[type="password"] {
                        font-family: monospace;
                    }
                    .setting-select {
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 14px;
                        background-color: #fff;
                    }
                    .setting-description {
                        font-size: 12px;
                        color: #666;
                        margin-top: 4px;
                    }
                    .save-button {
                        background-color: #4F46E5;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        margin-top: 10px;
                    }
                    .save-button:hover {
                        background-color: #4338CA;
                    }
                </style>
            </head>
            <body>
                <h1>Settings</h1>

                <div class="setting-group">
                    <label class="setting-label" for="provider">Backend Provider</label>
                    <select id="provider" class="setting-select">
                        <option value="dify" ${provider === 'dify' ? 'selected' : ''}>Dify (Cloud API)</option>
                        <option value="ollama" ${provider === 'ollama' ? 'selected' : ''}>Ollama (Local Backend)</option>
                    </select>
                    <div class="setting-description">Choose which backend to use for AI responses</div>
                </div>

                <div class="setting-group">
                    <label class="setting-label" for="apiKey">Dify API Key</label>
                    <input 
                        type="password" 
                        id="apiKey" 
                        class="setting-input" 
                        placeholder="sk-..." 
                        value="${apiKey}"
                    >
                    <div class="setting-description">Get your API key from Dify Console</div>
                </div>

                <div class="setting-group">
                    <label class="setting-label" for="baseUrl">API Base URL</label>
                    <input 
                        type="text" 
                        id="baseUrl" 
                        class="setting-input" 
                        placeholder="https://api.dify.ai" 
                        value="${baseUrl}"
                    >
                    <div class="setting-description">Dify API endpoint URL</div>
                </div>

                <div class="setting-group">
                    <label class="setting-label" for="model">AI Model</label>
                    <input 
                        type="text" 
                        id="model" 
                        class="setting-input" 
                        placeholder="gpt-4" 
                        value="${model}"
                    >
                    <div class="setting-description">Model to use for generation</div>
                </div>

                <div class="setting-group">
                    <label class="setting-label" for="ollamaBaseUrl">Ollama Base URL</label>
                    <input 
                        type="text" 
                        id="ollamaBaseUrl" 
                        class="setting-input" 
                        placeholder="http://localhost:11434" 
                        value="${ollamaBaseUrl}"
                    >
                    <div class="setting-description">Only used when provider is Ollama</div>
                </div>

                <div class="setting-group">
                    <label class="setting-label" for="ollamaModel">Ollama Model</label>
                    <input 
                        type="text" 
                        id="ollamaModel" 
                        class="setting-input" 
                        placeholder="llama3" 
                        value="${ollamaModel}"
                    >
                    <div class="setting-description">Model tag installed locally in Ollama</div>
                </div>

                <hr />
                <h2>MCP 设置</h2>

                <div class="setting-group">
                    <label class="setting-label" for="mcpEnabled">
                        <input type="checkbox" id="mcpEnabled" ${mcpEnabled ? 'checked' : ''} />
                        启用 MCP 集成
                    </label>
                    <div class="setting-description">启用后可以通过 MCP 查询上下文数据</div>
                </div>

                <div class="setting-group">
                    <label class="setting-label" for="mcpBaseUrl">MCP Base URL</label>
                    <input 
                        type="text" 
                        id="mcpBaseUrl" 
                        class="setting-input" 
                        placeholder="http://localhost:3921" 
                        value="${mcpBaseUrl}"
                    >
                </div>

                <div class="setting-group">
                    <label class="setting-label" for="mcpApiKey">MCP API Key</label>
                    <input 
                        type="password" 
                        id="mcpApiKey" 
                        class="setting-input" 
                        placeholder="可选" 
                        value="${mcpApiKey}"
                    >
                </div>

                <button class="save-button" onclick="saveSettings()">Save Settings</button>

                <script>
                    // Debug: Check if acquireVsCodeApi is available
                    console.log('acquireVsCodeApi available:', typeof acquireVsCodeApi !== 'undefined');
                    
                    const vscode = acquireVsCodeApi();

                    function saveSettings() {
                        const provider = document.getElementById('provider').value;
                        const apiKey = document.getElementById('apiKey').value;
                        const baseUrl = document.getElementById('baseUrl').value;
                        const model = document.getElementById('model').value;
                        const ollamaBaseUrl = document.getElementById('ollamaBaseUrl').value;
                        const ollamaModel = document.getElementById('ollamaModel').value;
                        const mcpEnabled = document.getElementById('mcpEnabled').checked;
                        const mcpBaseUrl = document.getElementById('mcpBaseUrl').value;
                        const mcpApiKey = document.getElementById('mcpApiKey').value;
                        
                        console.log('Saving settings:', { provider, apiKey, baseUrl, model, ollamaBaseUrl, ollamaModel, mcpEnabled, mcpBaseUrl });
                        
                        // Send messages one by one
                        try {
                            vscode.postMessage({ type: 'updateSetting', key: 'provider', value: provider });
                            vscode.postMessage({ type: 'updateSetting', key: 'apiKey', value: apiKey });
                            vscode.postMessage({ type: 'updateSetting', key: 'baseUrl', value: baseUrl });
                            vscode.postMessage({ type: 'updateSetting', key: 'model', value: model });
                            vscode.postMessage({ type: 'updateSetting', key: 'ollamaBaseUrl', value: ollamaBaseUrl });
                            vscode.postMessage({ type: 'updateSetting', key: 'ollamaModel', value: ollamaModel });
                            vscode.postMessage({ type: 'updateSetting', key: 'mcpEnabled', value: mcpEnabled });
                            vscode.postMessage({ type: 'updateSetting', key: 'mcpBaseUrl', value: mcpBaseUrl });
                            vscode.postMessage({ type: 'updateSetting', key: 'mcpApiKey', value: mcpApiKey });
                            console.log('Messages sent successfully');
                        } catch (error) {
                            console.error('Error sending messages:', error);
                        }
                    }
                </script>
            </body>
            </html>`;
    }
}
exports.SettingsViewProvider = SettingsViewProvider;
SettingsViewProvider.viewType = 'cline-dify-assistant-settings';
class FeaturesViewProvider {
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'executeCommand':
                    this._executeCommand(data.command);
                    break;
            }
        });
    }
    _executeCommand(command) {
        vscode.commands.executeCommand(command);
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cline Dify Assistant Features</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 16px;
                        line-height: 1.6;
                        color: #333;
                        background-color: #fff;
                    }
                    h1 {
                        font-size: 18px;
                        margin-bottom: 20px;
                        color: #4F46E5;
                    }
                    h2 {
                        font-size: 16px;
                        margin-top: 24px;
                        margin-bottom: 12px;
                        color: #555;
                    }
                    .feature-card {
                        background-color: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 6px;
                        padding: 16px;
                        margin-bottom: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .feature-card:hover {
                        background-color: #e9ecef;
                        transform: translateY(-1px);
                    }
                    .feature-title {
                        font-weight: 500;
                        margin-bottom: 8px;
                        color: #4F46E5;
                    }
                    .feature-description {
                        font-size: 13px;
                        color: #666;
                        margin-bottom: 12px;
                    }
                    .feature-command {
                        font-size: 12px;
                        color: #888;
                        font-family: monospace;
                    }
                </style>
            </head>
            <body>
                <h1>Features</h1>

                <h2>Settings</h2>
                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.configureSettings')">
                    <div class="feature-title">Configure Assistant</div>
                    <div class="feature-description">Update API keys, provider, and model without opening the sidebar</div>
                    <div class="feature-command">cline-dify-assistant.configureSettings</div>
                </div>

                <h2>Core Features</h2>
                
                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.generateCode')">
                    <div class="feature-title">Generate Code</div>
                    <div class="feature-description">Generate code based on natural language descriptions</div>
                    <div class="feature-command">cline-dify-assistant.generateCode</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.explainCode')">
                    <div class="feature-title">Explain Code</div>
                    <div class="feature-description">Explain selected code in plain English</div>
                    <div class="feature-command">cline-dify-assistant.explainCode</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.improveCode')">
                    <div class="feature-title">Improve Code</div>
                    <div class="feature-description">Suggest improvements to selected code</div>
                    <div class="feature-command">cline-dify-assistant.improveCode</div>
                </div>

                <h2>Project Management</h2>
                
                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.generateDirectoryStructure')">
                    <div class="feature-title">Generate Directory Structure</div>
                    <div class="feature-description">Create directories and files based on input patterns</div>
                    <div class="feature-command">cline-dify-assistant.generateDirectoryStructure</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.executeCommand')">
                    <div class="feature-title">Execute Command Line</div>
                    <div class="feature-description">Run terminal commands within VS Code</div>
                    <div class="feature-command">cline-dify-assistant.executeCommand</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.showProjectStructure')">
                    <div class="feature-title">Show Project Structure</div>
                    <div class="feature-description">Display project file hierarchy</div>
                    <div class="feature-command">cline-dify-assistant.showProjectStructure</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.readFileContent')">
                    <div class="feature-title">Read File Content</div>
                    <div class="feature-description">View file contents without opening</div>
                    <div class="feature-command">cline-dify-assistant.readFileContent</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.openChangeTracker')">
                    <div class="feature-title">Code Change Tracker</div>
                    <div class="feature-description">Track git status and diff inside a panel</div>
                    <div class="feature-command">cline-dify-assistant.openChangeTracker</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.insertCodeCitation')">
                    <div class="feature-title">Insert Code Citation</div>
                    <div class="feature-description">引用文件或代码片段到当前编辑器</div>
                    <div class="feature-command">cline-dify-assistant.insertCodeCitation</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.runMcpQuery')">
                    <div class="feature-title">Run MCP Query</div>
                    <div class="feature-description">通过 MCP 服务获取上下文数据</div>
                    <div class="feature-command">cline-dify-assistant.runMcpQuery</div>
                </div>

                <h2>Dual-Role Generator</h2>
                
                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.startDualRoleGenerator')">
                    <div class="feature-title">Start Dual-Role Generator</div>
                    <div class="feature-description">Generate documentation and code from project description</div>
                    <div class="feature-command">cline-dify-assistant.startDualRoleGenerator</div>
                </div>

                <div class="feature-card" onclick="executeCommand('cline-dify-assistant.debugGeneratedCode')">
                    <div class="feature-title">Debug Generated Code</div>
                    <div class="feature-description">Run test commands to verify generated code</div>
                    <div class="feature-command">cline-dify-assistant.debugGeneratedCode</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function executeCommand(command) {
                        vscode.postMessage({ type: 'executeCommand', command: command });
                    }
                </script>
            </body>
            </html>`;
    }
}
exports.FeaturesViewProvider = FeaturesViewProvider;
FeaturesViewProvider.viewType = 'cline-dify-assistant-features';
//# sourceMappingURL=viewProvider.js.map
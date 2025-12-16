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
exports.DifyService = void 0;
const vscode = __importStar(require("vscode"));
const difyProvider_1 = require("./difyProvider");
const ollamaProvider_1 = require("./ollamaProvider");
const configService_1 = require("./configService");
const loggerService_1 = require("./loggerService");
const SUPPORTED_COMPLETION_LANGUAGES = new Set([
    'javascript',
    'typescript',
    'typescriptreact',
    'javascriptreact',
    'python',
    'go',
    'java',
    'csharp',
    'cpp',
    'rust',
    'php',
    'ruby'
]);
class DifyService {
    constructor(context) {
        this.currentProvider = null;
        this.providers = new Map();
        this.context = context;
        this.configService = new configService_1.ConfigService();
        this.logger = new loggerService_1.LoggerService();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.text = '$(robot) Cline Dify: Idle';
        this.statusBarItem.tooltip = 'Cline Dify Assistant 状态（点击配置）';
        this.statusBarItem.command = 'cline-dify-assistant.configureSettings';
        this.statusBarItem.show();
        this.context.subscriptions.push(this.statusBarItem);
        // Initialize providers
        this.initializeProviders();
        // Listen for configuration changes
        this.configService.watch((key, newValue, oldValue) => {
            this.logger.debug(`Configuration changed: ${key}`, { oldValue, newValue });
            if (key === 'provider' || key.startsWith('apiKey') || key.startsWith('baseUrl') || key.startsWith('ollama')) {
                this.initializeProviders();
            }
        });
        this.logger.info('Cline Dify Service initialized');
    }
    /**
     * Initialize AI providers based on configuration
     */
    initializeProviders() {
        try {
            const providerType = this.configService.get('provider');
            const apiKey = this.configService.get('apiKey');
            const baseUrl = this.configService.get('baseUrl');
            const model = this.configService.get('model');
            const ollamaUrl = this.configService.get('ollamaUrl');
            const ollamaModel = this.configService.get('ollamaModel');
            // Initialize Dify provider
            const difyProvider = new difyProvider_1.DifyProvider(apiKey, baseUrl, model);
            this.providers.set('dify', difyProvider);
            // Initialize Ollama provider
            const ollamaProvider = new ollamaProvider_1.OllamaProvider(ollamaModel, ollamaUrl);
            this.providers.set('ollama', ollamaProvider);
            // Set current provider
            this.currentProvider = this.providers.get(providerType) || difyProvider;
            this.logger.info(`Initialized provider: ${providerType}`, {
                model: this.currentProvider?.getInfo().name
            });
        }
        catch (error) {
            this.logger.error('Failed to initialize providers:', error instanceof Error ? error : new Error(String(error)));
            this.showError('Failed to initialize AI providers. Please check your configuration.');
        }
    }
    /**
     * Get the current AI provider
     */
    getProvider() {
        if (!this.currentProvider) {
            this.initializeProviders();
            if (!this.currentProvider) {
                throw new Error('Failed to initialize any AI provider');
            }
        }
        return this.currentProvider;
    }
    /**
     * Show error message
     */
    showError(message) {
        this.logger.error(message);
        vscode.window.showErrorMessage(message);
    }
    /**
     * Show information message
     */
    showInfo(message) {
        this.logger.info(message);
        vscode.window.showInformationMessage(message);
    }
    /**
     * Set status bar text
     */
    setStatus(label, busy) {
        if (!this.statusBarItem) {
            return;
        }
        const icon = busy ? '$(sync~spin)' : '$(robot)';
        this.statusBarItem.text = `${icon} Cline Dify: ${label}`;
        this.statusBarItem.tooltip = busy ? `正在执行：${label}` : 'Cline Dify Assistant 状态（点击配置）';
    }
    /**
     * Get model response from the current provider
     */
    async getModelResponse(prompt, contextLabel = 'Processing') {
        try {
            this.setStatus(contextLabel, true);
            this.logger.debug('Getting model response', { prompt: prompt.substring(0, 100) + '...' });
            const result = await this.getProvider().generate(prompt);
            this.setStatus('Idle', false);
            this.logger.info('Model response received');
            return result;
        }
        catch (error) {
            this.logger.error('Error calling AI backend:', error instanceof Error ? error : new Error(String(error)));
            const providerType = this.configService.get('provider');
            this.showError(`Failed to get response from ${providerType}. Please verify your configuration.`);
            this.setStatus('Error', false);
            return '';
        }
    }
    /**
     * Generate code based on natural language description
     */
    async generateCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.showError('No active editor found.');
            return;
        }
        const prompt = await vscode.window.showInputBox({
            prompt: 'Describe the code you want to generate:',
            placeHolder: 'e.g., A function to calculate factorial'
        });
        if (!prompt) {
            return;
        }
        await this.logger.showProgress('Generating Code...', async () => {
            const response = await this.getModelResponse(prompt, '生成代码');
            if (response) {
                editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, response);
                });
                this.showInfo('Code generated successfully!');
            }
        });
    }
    /**
     * Explain selected code
     */
    async explainCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.showError('No active editor found.');
            return;
        }
        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        if (!selectedCode.trim()) {
            this.showError('Please select some code to explain.');
            return;
        }
        await this.logger.showProgress('Explaining Code...', async () => {
            const prompt = `Explain the following code:\n\n${selectedCode}`;
            const response = await this.getModelResponse(prompt, '解释代码');
            if (response) {
                this.showResponseInPanel(response, 'Code Explanation');
                this.showInfo('Code explanation generated!');
            }
        });
    }
    /**
     * Improve selected code
     */
    async improveCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.showError('No active editor found.');
            return;
        }
        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        if (!selectedCode.trim()) {
            this.showError('Please select some code to improve.');
            return;
        }
        await this.logger.showProgress('Improving Code...', async () => {
            const prompt = `Improve the following code and explain the changes:\n\n${selectedCode}`;
            const response = await this.getModelResponse(prompt, '改进代码');
            if (response) {
                this.showResponseInPanel(response, 'Improved Code');
                this.showInfo('Code improvement suggestions generated!');
            }
        });
    }
    /**
     * Provide code completions
     */
    async provideCompletionItems(document, position) {
        // This is a simplified implementation
        // In a real-world scenario, you'd want to use more sophisticated context analysis
        if (!SUPPORTED_COMPLETION_LANGUAGES.has(document.languageId)) {
            return [];
        }
        const line = document.lineAt(position).text;
        const prefix = line.substring(0, position.character);
        const trimmedPrefix = prefix.trim();
        // Only provide completions if we have a meaningful prefix
        if (trimmedPrefix.length < 3) {
            return [];
        }
        try {
            const prompt = `Act as an expert ${document.languageId} coding assistant. Provide only the code that should complete the following prefix without any commentary or markdown fences:\n\n${prefix}`;
            const response = await this.getModelResponse(prompt, '代码补全');
            if (response) {
                const sanitized = this.sanitizeCompletion(response);
                if (!sanitized) {
                    return [];
                }
                const completionItem = new vscode.CompletionItem(sanitized.split('\n')[0], vscode.CompletionItemKind.Snippet);
                completionItem.insertText = new vscode.SnippetString(sanitized);
                return [completionItem];
            }
        }
        catch (error) {
            this.logger.error('Error providing completions:', error instanceof Error ? error : new Error(String(error)));
        }
        return [];
    }
    /**
     * Show response in a webview panel
     */
    showResponseInPanel(content, title) {
        // Create or show the webview panel
        const panel = vscode.window.createWebviewPanel('clineDifyResponse', title, vscode.ViewColumn.Beside, {
            enableScripts: false
        });
        panel.webview.html = this.getWebviewContent(content);
    }
    /**
     * Get webview HTML content
     */
    getWebviewContent(content) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cline Dify Assistant</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    padding: 16px;
                    line-height: 1.6;
                    color: #333;
                    background-color: #fff;
                }
                pre {
                    background-color: #f5f5f5;
                    padding: 12px;
                    border-radius: 6px;
                    overflow-x: auto;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                }
                code {
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    background-color: #f5f5f5;
                    padding: 2px 4px;
                    border-radius: 3px;
                }
            </style>
        </head>
        <body>
            ${content.replace(/\n/g, '<br>').replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')}
        </body>
        </html>
        `;
    }
    /**
     * Configure settings via interactive wizard
     */
    async configureSettings() {
        const providerPick = await vscode.window.showQuickPick([
            { label: 'Dify (Cloud API)', description: 'Use the hosted Dify API', value: 'dify' },
            { label: 'Ollama (Local Backend)', description: 'Use a local Ollama server', value: 'ollama' }
        ], {
            placeHolder: 'Select the backend provider to use',
            ignoreFocusOut: true,
            canPickMany: false
        });
        if (!providerPick) {
            return;
        }
        try {
            await this.configService.set('provider', providerPick.value);
            if (providerPick.value === 'dify') {
                const apiKey = await vscode.window.showInputBox({
                    prompt: 'Enter your Dify API Key',
                    value: this.configService.get('apiKey'),
                    ignoreFocusOut: true,
                    placeHolder: 'sk-...'
                });
                if (apiKey === undefined) {
                    return;
                }
                await this.configService.set('apiKey', apiKey.trim());
                const baseUrl = await vscode.window.showInputBox({
                    prompt: 'Enter Dify API Base URL',
                    value: this.configService.get('baseUrl'),
                    ignoreFocusOut: true
                });
                if (baseUrl === undefined) {
                    return;
                }
                await this.configService.set('baseUrl', baseUrl.trim() || 'https://api.dify.ai');
                const model = await vscode.window.showInputBox({
                    prompt: 'Enter the model name to use',
                    value: this.configService.get('model'),
                    ignoreFocusOut: true
                });
                if (model === undefined) {
                    return;
                }
                await this.configService.set('model', model.trim() || 'gpt-4');
            }
            else {
                const ollamaUrl = await vscode.window.showInputBox({
                    prompt: 'Enter the Ollama server URL',
                    value: this.configService.get('ollamaUrl'),
                    ignoreFocusOut: true
                });
                if (ollamaUrl === undefined) {
                    return;
                }
                await this.configService.set('ollamaUrl', ollamaUrl.trim() || 'http://localhost:11434');
                const ollamaModel = await vscode.window.showInputBox({
                    prompt: 'Enter the Ollama model name',
                    value: this.configService.get('ollamaModel'),
                    ignoreFocusOut: true
                });
                if (ollamaModel === undefined) {
                    return;
                }
                await this.configService.set('ollamaModel', ollamaModel.trim() || 'llama3');
            }
            // Reinitialize providers with new configuration
            this.initializeProviders();
            this.showInfo('Cline Dify Assistant settings updated.');
        }
        catch (error) {
            this.logger.error('Failed to update settings:', error instanceof Error ? error : new Error(String(error)));
            this.showError('Failed to update settings. Please try again.');
        }
    }
    /**
     * Sanitize completion response
     */
    sanitizeCompletion(completion) {
        return completion
            .replace(/```[a-z]*\n?/gi, '')
            .replace(/```/g, '')
            .trim();
    }
    /**
     * Get current provider info
     */
    getProviderInfo() {
        return this.currentProvider?.getInfo() || null;
    }
    /**
     * Validate configuration
     */
    validateConfiguration() {
        const validation = this.configService.validateAll();
        if (!validation.valid) {
            this.logger.logConfigErrors(validation.errors);
            return false;
        }
        return true;
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.DifyService = DifyService;
//# sourceMappingURL=difyService.js.map
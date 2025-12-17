import * as vscode from 'vscode';
import { AIProvider } from './aiProvider';
import { DifyProvider } from './difyProvider';
import { OllamaProvider } from './ollamaProvider';
import { ConfigService } from './configService';
import { LoggerService } from './loggerService';
import { ChatCompletionRequestMessage } from './types';
import { escapeHtml, getDefaultCsp, getNonce } from './webviewSecurity';
import { GenerateOptions, StreamHandle } from './aiProvider';

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

type ProviderType = 'dify' | 'ollama';

export class DifyService {
    private context: vscode.ExtensionContext;
    private configService: ConfigService;
    private logger: LoggerService;
    private statusBarItem: vscode.StatusBarItem;
    private currentProvider: AIProvider | null = null;
    private providers: Map<ProviderType, AIProvider> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configService = new ConfigService();
        this.logger = new LoggerService();
        
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.text = '$(robot) Cline Dify: Idle';
        this.statusBarItem.tooltip = 'Cline Dify Assistant 状态（点击配置）';
        this.statusBarItem.command = 'cline-dify-assistant.configureSettings';
        if (this.configService.get<boolean>('ui.showStatusBar')) {
            this.statusBarItem.show();
        }
        this.context.subscriptions.push(this.statusBarItem);
        
        // Initialize providers
        this.initializeProviders();
        
        // Listen for configuration changes
        this.configService.watch((key, newValue, oldValue) => {
            this.logger.debug(`Configuration changed: ${key}`, { oldValue, newValue });
            
            // Reinitialize providers if provider-related config changes
            if (key === 'provider' || key.startsWith('apiKey') || key.startsWith('baseUrl') || key.startsWith('ollama')) {
                this.initializeProviders();
            }
            
            // Update UI settings
            if (key === 'ui.showStatusBar') {
                if (newValue === true) {
                    this.statusBarItem.show();
                } else {
                    this.statusBarItem.hide();
                }
            }
        });
        
        this.logger.info('Cline Dify Service initialized');
    }

    /**
     * Initialize AI providers based on configuration
     */
    private initializeProviders(): void {
        try {
            const providerType = this.configService.get<ProviderType>('provider');
            const apiKey = this.configService.get<string>('apiKey');
            const baseUrl = this.configService.get<string>('baseUrl');
            const model = this.configService.get<string>('model');
            const ollamaUrl = this.configService.get<string>('ollamaBaseUrl');
            const ollamaModel = this.configService.get<string>('ollamaModel');

            // Initialize Dify provider
            const difyProvider = new DifyProvider(apiKey, baseUrl, model);
            this.providers.set('dify', difyProvider);

            // Initialize Ollama provider
            const ollamaProvider = new OllamaProvider(ollamaModel, ollamaUrl);
            this.providers.set('ollama', ollamaProvider);

            // Set current provider
            this.currentProvider = this.providers.get(providerType) || difyProvider;
            this.logger.info(`Initialized provider: ${providerType}`, {
                model: this.currentProvider?.getInfo().name
            });
        } catch (error) {
            this.logger.error('Failed to initialize providers:', error instanceof Error ? error : new Error(String(error)));
            this.showError('Failed to initialize AI providers. Please check your configuration.');
        }
    }

    /**
     * Get the current AI provider
     */
    private getProvider(): AIProvider {
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
    private showError(message: string): void {
        this.logger.error(message);
        vscode.window.showErrorMessage(message);
    }

    private showErrorWithActions(message: string, error?: Error): void {
        this.logger.showErrorWithActions(
            message,
            error,
            [
                {
                    title: '打开配置',
                    callback: () => {
                        void vscode.commands.executeCommand('cline-dify-assistant.configureSettings');
                    }
                },
                {
                    title: '查看日志',
                    callback: () => {
                        this.logger.revealOutputChannel();
                    }
                }
            ]
        );
    }

    /**
     * Show information message
     */
    private showInfo(message: string): void {
        this.logger.info(message);
        vscode.window.showInformationMessage(message);
    }

    /**
     * Set status bar text
     */
    private setStatus(label: string, busy: boolean): void {
        if (!this.statusBarItem) {
            return;
        }

        const icon = busy ? '$(sync~spin)' : '$(robot)';
        this.statusBarItem.text = `${icon} Cline Dify: ${label}`;
        this.statusBarItem.tooltip = busy ? `正在执行：${label}` : 'Cline Dify Assistant 状态（点击配置）';
    }

    /**
     * Get model response from the current provider (non-streaming)
     */
    public async getModelResponse(prompt: string, contextLabel: string = 'Processing', options?: GenerateOptions): Promise<string> {
        try {
            this.setStatus(contextLabel, true);
            this.logger.debug('Getting model response', { prompt: prompt.substring(0, 100) + '...' });
            
            const result = await this.getProvider().generate(prompt, options);
            this.setStatus('Idle', false);
            this.logger.info('Model response received');
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Error calling AI backend:', err);
            const providerType = this.configService.get<string>('provider');
            this.showErrorWithActions(`Failed to get response from ${providerType}. Please verify your configuration.`, err);
            this.setStatus('Error', false);
            return '';
        }
    }

    /**
     * Get model response from the current provider (streaming)
     */
    public async getModelStreamResponse(
        prompt: string, 
        contextLabel: string = 'Processing',
        callback: (chunk: string) => void,
        doneCallback?: () => void
    ): Promise<StreamHandle | null> {
        try {
            this.setStatus(contextLabel, true);
            this.logger.debug('Getting streaming model response', { prompt: prompt.substring(0, 100) + '...' });
            
            const messages: ChatCompletionRequestMessage[] = [
                {
                    role: 'system' as const,
                    content: 'You are an expert AI coding assistant. Provide clear, concise, and accurate responses.'
                },
                {
                    role: 'user' as const,
                    content: prompt
                }
            ];
            
            const streamHandle = await this.getProvider().stream(messages, undefined, callback);

            streamHandle.done
                .then(() => {
                    doneCallback?.();
                    this.logger.info('Streaming model response completed');
                    this.setStatus('Idle', false);
                })
                .catch((error) => {
                    const err = error instanceof Error ? error : new Error(String(error));
                    this.logger.error('Streaming model response failed:', err);
                    const providerType = this.configService.get<string>('provider');
                    this.showErrorWithActions(`Streaming response failed from ${providerType}.`, err);
                    this.setStatus('Error', false);
                });

            return streamHandle;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Error calling AI backend:', err);
            const providerType = this.configService.get<string>('provider');
            this.showErrorWithActions(`Failed to get streaming response from ${providerType}. Please verify your configuration.`, err);
            this.setStatus('Error', false);
            return null;
        }
    }

    /**
     * Generate code based on natural language description
     */
    public async generateCode() {
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
    public async explainCode() {
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
    public async improveCode() {
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
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
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
        } catch (error) {
            this.logger.error('Error providing completions:', error instanceof Error ? error : new Error(String(error)));
        }

        return [];
    }

    /**
     * Show response in a webview panel
     */
    private showResponseInPanel(content: string, title: string) {
        // Create or show the webview panel
        const panel = vscode.window.createWebviewPanel(
            'clineDifyResponse',
            title,
            vscode.ViewColumn.Beside,
            {
                enableScripts: false
            }
        );

        panel.webview.html = this.getWebviewContent(panel.webview, content);
    }

    /**
     * Get webview HTML content
     */
    private getWebviewContent(webview: vscode.Webview, content: string): string {
        const nonce = getNonce();
        const csp = getDefaultCsp(webview, nonce);
        const rendered = this.renderContentSafely(content);
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${csp}">
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
            ${rendered}
        </body>
        </html>
        `;
    }

    private renderContentSafely(content: string): string {
        // Render text + fenced code blocks safely without allowing HTML injection.
        const parts = content.split('```');
        const rendered = parts.map((part, index) => {
            const safe = escapeHtml(part);
            if (index % 2 === 1) {
                return `<pre><code>${safe}</code></pre>`;
            }
            return `<div>${safe.replace(/\n/g, '<br>')}</div>`;
        });
        return rendered.join('');
    }

    /**
     * Configure settings via interactive wizard
     */
    public async configureSettings() {
        const providerPick = await vscode.window.showQuickPick([
            { label: 'Dify (Cloud API)', description: 'Use the hosted Dify API', value: 'dify' as ProviderType },
            { label: 'Ollama (Local Backend)', description: 'Use a local Ollama server', value: 'ollama' as ProviderType }
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
                    value: this.configService.get<string>('apiKey'),
                    ignoreFocusOut: true,
                    placeHolder: 'sk-...'
                });
                if (apiKey === undefined) {
                    return;
                }
                await this.configService.set('apiKey', apiKey.trim());

                const baseUrl = await vscode.window.showInputBox({
                    prompt: 'Enter Dify API Base URL',
                    value: this.configService.get<string>('baseUrl'),
                    ignoreFocusOut: true
                });
                if (baseUrl === undefined) {
                    return;
                }
                await this.configService.set('baseUrl', baseUrl.trim() || 'https://api.dify.ai');

                const model = await vscode.window.showInputBox({
                    prompt: 'Enter the model name to use',
                    value: this.configService.get<string>('model'),
                    ignoreFocusOut: true
                });
                if (model === undefined) {
                    return;
                }
                await this.configService.set('model', model.trim() || 'gpt-4');
            } else {
                const ollamaUrl = await vscode.window.showInputBox({
                    prompt: 'Enter the Ollama server URL',
                    value: this.configService.get<string>('ollamaBaseUrl'),
                    ignoreFocusOut: true
                });
                if (ollamaUrl === undefined) {
                    return;
                }
                await this.configService.set('ollamaBaseUrl', ollamaUrl.trim() || 'http://localhost:11434');

                const ollamaModel = await vscode.window.showInputBox({
                    prompt: 'Enter the Ollama model name',
                    value: this.configService.get<string>('ollamaModel'),
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
        } catch (error) {
            this.logger.error('Failed to update settings:', error instanceof Error ? error : new Error(String(error)));
            this.showError('Failed to update settings. Please try again.');
        }
    }

    /**
     * Sanitize completion response
     */
    private sanitizeCompletion(completion: string): string {
        return completion
            .replace(/```[a-z]*\n?/gi, '')
            .replace(/```/g, '')
            .trim();
    }

    /**
     * Get current provider info
     */
    public getProviderInfo(): any {
        return this.currentProvider?.getInfo() || null;
    }

    /**
     * Validate configuration
     */
    public validateConfiguration(): boolean {
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
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}

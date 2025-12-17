import * as vscode from 'vscode';
import { LogLevel } from './types';

/**
 * Logger Service for structured logging and telemetry
 */
export class LoggerService {
    private outputChannel: vscode.OutputChannel;
    private currentLogLevel: LogLevel = 'info';
    private logLevelMap: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        fatal: 4
    };

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Cline Dify Assistant');
        this.loadLogLevel();
    }

    /**
     * Load log level from configuration
     */
    private loadLogLevel(): void {
        const config = vscode.workspace.getConfiguration('cline-dify-assistant');
        const level = config.get<string>('logLevel', 'info') as LogLevel;
        this.currentLogLevel = level;
    }

    /**
     * Check if a log level is enabled
     */
    private isLevelEnabled(level: LogLevel): boolean {
        return this.logLevelMap[level] >= this.logLevelMap[this.currentLogLevel];
    }

    /**
     * Format log message
     */
    private formatMessage(level: LogLevel, message: string, metadata?: any): string {
        const timestamp = new Date().toISOString();
        const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metadataStr}`;
    }

    /**
     * Log a debug message
     */
    public debug(message: string, metadata?: any): void {
        if (this.isLevelEnabled('debug')) {
            const formatted = this.formatMessage('debug', message, metadata);
            this.outputChannel.appendLine(formatted);
            console.debug(formatted);
        }
    }

    /**
     * Log an info message
     */
    public info(message: string, metadata?: any): void {
        if (this.isLevelEnabled('info')) {
            const formatted = this.formatMessage('info', message, metadata);
            this.outputChannel.appendLine(formatted);
            console.info(formatted);
        }
    }

    /**
     * Log a warning message
     */
    public warn(message: string, metadata?: any): void {
        if (this.isLevelEnabled('warn')) {
            const formatted = this.formatMessage('warn', message, metadata);
            this.outputChannel.appendLine(formatted);
            console.warn(formatted);
        }
    }

    /**
     * Log an error message
     */
    public error(message: string, error?: Error, metadata?: any): void {
        if (this.isLevelEnabled('error')) {
            const errorDetails = error ? `\n${error.stack || error.message}` : '';
            const formatted = this.formatMessage('error', `${message}${errorDetails}`, metadata);
            this.outputChannel.appendLine(formatted);
            console.error(formatted);
        }
    }

    /**
     * Log a fatal message
     */
    public fatal(message: string, error?: Error, metadata?: any): void {
        if (this.isLevelEnabled('fatal')) {
            const errorDetails = error ? `\n${error.stack || error.message}` : '';
            const formatted = this.formatMessage('fatal', `${message}${errorDetails}`, metadata);
            this.outputChannel.appendLine(formatted);
            console.error(formatted);
        }
    }

    /**
     * Show an error message with action buttons
     */
    public showErrorWithActions(
        message: string,
        error?: Error,
        actions?: { title: string; callback: () => void }[]
    ): void {
        const items: vscode.MessageItem[] = (actions ?? []).map(action => ({ title: action.title }));

        vscode.window.showErrorMessage(message, ...(items || [])).then(selection => {
            if (!selection || !actions) {
                return;
            }
            const action = actions.find(a => a.title === selection.title);
            action?.callback();
        });

        // Log the error to output channel
        this.error(message, error);
    }

    /**
     * Show an information message
     */
    public showInfo(message: string, actions?: string[]): Thenable<string | undefined> {
        return vscode.window.showInformationMessage(message, ...(actions || []));
    }

    /**
     * Show a warning message
     */
    public showWarning(message: string, actions?: string[]): Thenable<string | undefined> {
        return vscode.window.showWarningMessage(message, ...(actions || []));
    }

    /**
     * Show a quick pick menu
     */
    public showQuickPick<T extends vscode.QuickPickItem>(
        items: T[],
        options?: vscode.QuickPickOptions
    ): Thenable<T | undefined> {
        return vscode.window.showQuickPick(items, options);
    }

    /**
     * Show an input box
     */
    public showInputBox(
        options?: vscode.InputBoxOptions
    ): Thenable<string | undefined> {
        return vscode.window.showInputBox(options);
    }

    /**
     * Show a progress notification
     */
    public showProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
    ): Promise<T> {
        // Wrap Thenable<T> to Promise<T>
        return Promise.resolve(vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            task
        ));
    }

    /**
     * Reveal the output channel
     */
    public revealOutputChannel(): void {
        this.outputChannel.show();
    }

    /**
     * Clear the output channel
     */
    public clearOutput(): void {
        this.outputChannel.clear();
    }

    /**
     * Dispose the logger service
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }

    /**
     * Log configuration validation errors
     */
    public logConfigErrors(errors: string[]): void {
        this.error('Configuration validation failed:', undefined, { errors });
        this.showErrorWithActions(
            `Configuration validation failed: ${errors[0]}`,
            undefined,
            [
                {
                    title: 'Open Configuration',
                    callback: () => {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'cline-dify-assistant');
                    }
                },
                {
                    title: 'View Logs',
                    callback: () => {
                        this.revealOutputChannel();
                    }
                }
            ]
        );
    }

    /**
     * Log API error with helpful actions
     */
    public logApiError(message: string, error: any): void {
        let errorMessage = message;
        
        if (error.response) {
            errorMessage += ` - ${error.response.status}: ${error.response.data.message || error.response.statusText}`;
        } else if (error.message) {
            errorMessage += ` - ${error.message}`;
        }

        this.error(errorMessage, error);
        
        // Determine appropriate actions
        const actions: { title: string; callback: () => void }[] = [
            {
                title: 'View Logs',
                callback: () => this.revealOutputChannel()
            }
        ];

        // Add context-specific actions
        if (error.response?.status === 401) {
            actions.unshift({
                title: 'Update API Key',
                callback: () => {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'cline-dify-assistant.apiKey');
                }
            });
        }

        if (error.code === 'ECONNREFUSED') {
            actions.unshift({
                title: 'Check Connection',
                callback: () => {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'cline-dify-assistant.baseUrl');
                }
            });
        }

        this.showErrorWithActions(errorMessage, error, actions);
    }
}

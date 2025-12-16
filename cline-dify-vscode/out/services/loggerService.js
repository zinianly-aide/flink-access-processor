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
exports.LoggerService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Logger Service for structured logging and telemetry
 */
class LoggerService {
    constructor() {
        this.currentLogLevel = 'info';
        this.logLevelMap = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            fatal: 4
        };
        this.outputChannel = vscode.window.createOutputChannel('Cline Dify Assistant');
        this.loadLogLevel();
    }
    /**
     * Load log level from configuration
     */
    loadLogLevel() {
        const config = vscode.workspace.getConfiguration('cline-dify-assistant');
        const level = config.get('logLevel', 'info');
        this.currentLogLevel = level;
    }
    /**
     * Check if a log level is enabled
     */
    isLevelEnabled(level) {
        return this.logLevelMap[level] >= this.logLevelMap[this.currentLogLevel];
    }
    /**
     * Format log message
     */
    formatMessage(level, message, metadata) {
        const timestamp = new Date().toISOString();
        const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metadataStr}`;
    }
    /**
     * Log a debug message
     */
    debug(message, metadata) {
        if (this.isLevelEnabled('debug')) {
            const formatted = this.formatMessage('debug', message, metadata);
            this.outputChannel.appendLine(formatted);
            console.debug(formatted);
        }
    }
    /**
     * Log an info message
     */
    info(message, metadata) {
        if (this.isLevelEnabled('info')) {
            const formatted = this.formatMessage('info', message, metadata);
            this.outputChannel.appendLine(formatted);
            console.info(formatted);
        }
    }
    /**
     * Log a warning message
     */
    warn(message, metadata) {
        if (this.isLevelEnabled('warn')) {
            const formatted = this.formatMessage('warn', message, metadata);
            this.outputChannel.appendLine(formatted);
            console.warn(formatted);
        }
    }
    /**
     * Log an error message
     */
    error(message, error, metadata) {
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
    fatal(message, error, metadata) {
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
    showErrorWithActions(message, error, actions) {
        const formattedActions = actions?.map(action => {
            return { title: action.title, command: '', arguments: [] };
        });
        vscode.window.showErrorMessage(message, ...(formattedActions || [])).then(selection => {
            if (selection && actions) {
                const action = actions.find(a => a.title === selection.title);
                if (action) {
                    action.callback();
                }
            }
        });
        // Log the error to output channel
        this.error(message, error);
    }
    /**
     * Show an information message
     */
    showInfo(message, actions) {
        return vscode.window.showInformationMessage(message, ...(actions || []));
    }
    /**
     * Show a warning message
     */
    showWarning(message, actions) {
        return vscode.window.showWarningMessage(message, ...(actions || []));
    }
    /**
     * Show a quick pick menu
     */
    showQuickPick(items, options) {
        return vscode.window.showQuickPick(items, options);
    }
    /**
     * Show an input box
     */
    showInputBox(options) {
        return vscode.window.showInputBox(options);
    }
    /**
     * Show a progress notification
     */
    showProgress(title, task) {
        // Wrap Thenable<T> to Promise<T>
        return Promise.resolve(vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        }, task));
    }
    /**
     * Reveal the output channel
     */
    revealOutputChannel() {
        this.outputChannel.show();
    }
    /**
     * Clear the output channel
     */
    clearOutput() {
        this.outputChannel.clear();
    }
    /**
     * Dispose the logger service
     */
    dispose() {
        this.outputChannel.dispose();
    }
    /**
     * Log configuration validation errors
     */
    logConfigErrors(errors) {
        this.error('Configuration validation failed:', undefined, { errors });
        this.showErrorWithActions(`Configuration validation failed: ${errors[0]}`, undefined, [
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
        ]);
    }
    /**
     * Log API error with helpful actions
     */
    logApiError(message, error) {
        let errorMessage = message;
        if (error.response) {
            errorMessage += ` - ${error.response.status}: ${error.response.data.message || error.response.statusText}`;
        }
        else if (error.message) {
            errorMessage += ` - ${error.message}`;
        }
        this.error(errorMessage, error);
        // Determine appropriate actions
        const actions = [
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
exports.LoggerService = LoggerService;
//# sourceMappingURL=loggerService.js.map
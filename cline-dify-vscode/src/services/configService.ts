import * as vscode from 'vscode';
import { ConfigItem } from './types';

/**
 * Configuration Service for managing extension settings
 */
export class ConfigService {
    private readonly CONFIG_SECTION = 'cline-dify-assistant';
    private configItems: Map<string, ConfigItem> = new Map();
    private cachedValues: Map<string, any> = new Map();

    constructor() {
        this.initializeConfigItems();
        this.snapshotCurrentValues();
    }

    /**
     * Initialize all configuration items
     */
    private initializeConfigItems(): void {
        const items: ConfigItem[] = [
            // AI Provider configuration
            {
                key: 'provider',
                defaultValue: 'dify',
                description: 'AI Provider to use (dify or ollama)',
                type: 'string',
                scope: 'global',
                validate: (value: string) => ['dify', 'ollama'].includes(value)
            },
            {
                key: 'apiKey',
                defaultValue: '',
                description: 'Dify API Key',
                type: 'string',
                scope: 'global',
                required: false
            },
            {
                key: 'baseUrl',
                defaultValue: 'https://api.dify.ai',
                description: 'Dify API Base URL',
                type: 'string',
                scope: 'global',
                validate: (value: string) => /^https?:\/\/.+/.test(value)
            },
            {
                key: 'model',
                defaultValue: 'gpt-4',
                description: 'AI Model to use',
                type: 'string',
                scope: 'global'
            },
            {
                key: 'ollamaBaseUrl',
                defaultValue: 'http://localhost:11434',
                description: 'Ollama API URL',
                type: 'string',
                scope: 'global',
                validate: (value: string) => /^https?:\/\/.+/.test(value)
            },
            {
                key: 'ollamaModel',
                defaultValue: 'llama3',
                description: 'Default Ollama Model',
                type: 'string',
                scope: 'global'
            },

            // MCP configuration
            {
                key: 'mcpEnabled',
                defaultValue: false,
                description: 'Enable MCP integration',
                type: 'boolean',
                scope: 'workspace'
            },
            {
                key: 'mcpBaseUrl',
                defaultValue: 'http://localhost:3921',
                description: 'MCP server base URL',
                type: 'string',
                scope: 'workspace',
                validate: (value: string) => /^https?:\/\/.+/.test(value)
            },
            {
                key: 'mcpApiKey',
                defaultValue: '',
                description: 'MCP API key (optional)',
                type: 'string',
                scope: 'workspace'
            },
            
            // Generator configuration
            {
                key: 'generator.temperature',
                defaultValue: 0.7,
                description: 'Temperature for code generation',
                type: 'number',
                scope: 'workspace',
                validate: (value: number) => value >= 0 && value <= 2
            },
            {
                key: 'generator.maxTokens',
                defaultValue: 2048,
                description: 'Maximum tokens for generation',
                type: 'number',
                scope: 'workspace',
                validate: (value: number) => value > 0 && value <= 8192
            },
            {
                key: 'generator.conflictStrategy',
                defaultValue: 'ask',
                description: 'Conflict resolution strategy',
                type: 'string',
                scope: 'workspace',
                validate: (value: string) => ['overwrite', 'skip', 'merge', 'ask'].includes(value)
            },
            
            // UI configuration
            {
                key: 'ui.showStatusBar',
                defaultValue: true,
                description: 'Show status bar item',
                type: 'boolean',
                scope: 'window'
            },
            {
                key: 'ui.autoFocus',
                defaultValue: true,
                description: 'Auto focus on Q&A panel',
                type: 'boolean',
                scope: 'window'
            },

            // Logging
            {
                key: 'logLevel',
                defaultValue: 'info',
                description: 'Logging level',
                type: 'string',
                scope: 'global',
                validate: (value: string) => ['debug', 'info', 'warn', 'error', 'fatal'].includes(value)
            },
            
            // Safety configuration
            {
                key: 'safety.allowCommandExecution',
                defaultValue: false,
                description: 'Allow executing commands',
                type: 'boolean',
                scope: 'global'
            },
            {
                key: 'safety.commandWhitelist',
                defaultValue: ['ls', 'pwd', 'git status', 'npm run', 'yarn run'],
                description: 'Whitelisted commands',
                type: 'array',
                scope: 'global'
            }
        ];

        items.forEach(item => this.configItems.set(item.key, item));
    }

    /**
     * Get a configuration value
     */
    public get<T>(key: string): T {
        const configItem = this.configItems.get(key);
        if (!configItem) {
            throw new Error(`Configuration item '${key}' not found`);
        }

        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const value = config.get<T>(key, configItem.defaultValue as T);

        // Validate the value
        if (configItem.validate && !configItem.validate(value)) {
            vscode.window.showWarningMessage(
                `Invalid value for '${key}': ${value}. Using default value: ${configItem.defaultValue}`
            );
            return configItem.defaultValue as T;
        }

        return value;
    }

    /**
     * Set a configuration value
     */
    public set<T>(key: string, value: T, scope?: vscode.ConfigurationTarget): Promise<void> {
        const configItem = this.configItems.get(key);
        if (!configItem) {
            throw new Error(`Configuration item '${key}' not found`);
        }

        // Validate the value before setting
        if (configItem.validate && !configItem.validate(value)) {
            throw new Error(`Invalid value for '${key}': ${value}`);
        }

        // Check if required
        if (configItem.required && !value) {
            throw new Error(`Configuration item '${key}' is required`);
        }

        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const target = scope || this.getConfigurationTarget(configItem.scope);
        
        // Wrap Thenable<void> to Promise<void>
        return Promise.resolve(config.update(key, value, target));
    }

    /**
     * Get default value for a configuration item
     */
    public getDefault<T>(key: string): T {
        const configItem = this.configItems.get(key);
        if (!configItem) {
            throw new Error(`Configuration item '${key}' not found`);
        }
        return configItem.defaultValue as T;
    }

    /**
     * Validate all configuration items
     */
    public validateAll(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        const provider = this.get<string>('provider');
        
        for (const [key, item] of this.configItems.entries()) {
            const value = this.get(key);
            
            // Check required
            if (key === 'apiKey' && provider === 'dify' && !value) {
                errors.push(`Required configuration '${key}' is missing`);
                continue;
            }

            if (item.required && !value) {
                errors.push(`Required configuration '${key}' is missing`);
            }
            
            // Check validation
            if (item.validate && !item.validate(value)) {
                errors.push(`Invalid value for '${key}': ${value}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }

    /**
     * Get all configuration items
     */
    public getAllItems(): ConfigItem[] {
        return Array.from(this.configItems.values());
    }

    /**
     * Get configuration by section
     */
    public getSection(section: string): Record<string, any> {
        const result: Record<string, any> = {};
        
        for (const [key] of this.configItems.entries()) {
            if (key.startsWith(`${section}.`)) {
                result[key.replace(`${section}.`, '')] = this.get(key);
            }
        }
        
        return result;
    }

    /**
     * Convert scope string to ConfigurationTarget
     */
    private getConfigurationTarget(scope: string): vscode.ConfigurationTarget {
        switch (scope) {
            case 'global':
                return vscode.ConfigurationTarget.Global;
            case 'workspace':
                return vscode.ConfigurationTarget.Workspace;
            case 'window':
                return vscode.ConfigurationTarget.Global;
            default:
                return vscode.ConfigurationTarget.Global;
        }
    }

    /**
     * Get full configuration object
     */
    public getAll(): Record<string, any> {
        const result: Record<string, any> = {};
        
        for (const key of this.configItems.keys()) {
            result[key] = this.get(key);
        }
        
        return result;
    }

    /**
     * Reset configuration to default values
     */
    public async resetAll(): Promise<void> {
        for (const [key, item] of this.configItems.entries()) {
            await this.set(key, item.defaultValue);
        }
    }

    /**
     * Watch for configuration changes
     */
    public watch(callback: (key: string, newValue: any, oldValue: any) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(this.CONFIG_SECTION)) {
                const newConfig = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
                
                for (const key of this.configItems.keys()) {
                    const newValue = newConfig.get(key);
                    const oldValue = this.cachedValues.get(key);
                    
                    if (oldValue !== newValue) {
                        callback(key, newValue, oldValue);
                        this.cachedValues.set(key, newValue);
                    }
                }
            }
        });
    }

    private snapshotCurrentValues(): void {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        for (const key of this.configItems.keys()) {
            this.cachedValues.set(key, config.get(key));
        }
    }
}

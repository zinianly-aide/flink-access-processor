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
exports.ConfigService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Configuration Service for managing extension settings
 */
class ConfigService {
    constructor() {
        this.CONFIG_SECTION = 'cline-dify-assistant';
        this.configItems = new Map();
        this.initializeConfigItems();
    }
    /**
     * Initialize all configuration items
     */
    initializeConfigItems() {
        const items = [
            // AI Provider configuration
            {
                key: 'provider',
                defaultValue: 'dify',
                description: 'AI Provider to use (dify or ollama)',
                type: 'string',
                scope: 'global',
                validate: (value) => ['dify', 'ollama'].includes(value)
            },
            {
                key: 'apiKey',
                defaultValue: '',
                description: 'Dify API Key',
                type: 'string',
                scope: 'global',
                required: true
            },
            {
                key: 'baseUrl',
                defaultValue: 'https://api.dify.ai',
                description: 'Dify API Base URL',
                type: 'string',
                scope: 'global',
                validate: (value) => /^https?:\/\/.+/.test(value)
            },
            {
                key: 'model',
                defaultValue: 'gpt-4',
                description: 'AI Model to use',
                type: 'string',
                scope: 'global'
            },
            {
                key: 'ollamaUrl',
                defaultValue: 'http://localhost:11434',
                description: 'Ollama API URL',
                type: 'string',
                scope: 'global',
                validate: (value) => /^https?:\/\/.+/.test(value)
            },
            {
                key: 'ollamaModel',
                defaultValue: 'llama2',
                description: 'Default Ollama Model',
                type: 'string',
                scope: 'global'
            },
            // Generator configuration
            {
                key: 'generator.temperature',
                defaultValue: 0.7,
                description: 'Temperature for code generation',
                type: 'number',
                scope: 'workspace',
                validate: (value) => value >= 0 && value <= 2
            },
            {
                key: 'generator.maxTokens',
                defaultValue: 2048,
                description: 'Maximum tokens for generation',
                type: 'number',
                scope: 'workspace',
                validate: (value) => value > 0 && value <= 8192
            },
            {
                key: 'generator.conflictStrategy',
                defaultValue: 'ask',
                description: 'Conflict resolution strategy',
                type: 'string',
                scope: 'workspace',
                validate: (value) => ['overwrite', 'skip', 'merge', 'ask'].includes(value)
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
            // Safety configuration
            {
                key: 'safety.allowCommandExecution',
                defaultValue: true,
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
    get(key) {
        const configItem = this.configItems.get(key);
        if (!configItem) {
            throw new Error(`Configuration item '${key}' not found`);
        }
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const value = config.get(key, configItem.defaultValue);
        // Validate the value
        if (configItem.validate && !configItem.validate(value)) {
            vscode.window.showWarningMessage(`Invalid value for '${key}': ${value}. Using default value: ${configItem.defaultValue}`);
            return configItem.defaultValue;
        }
        return value;
    }
    /**
     * Set a configuration value
     */
    set(key, value, scope) {
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
    getDefault(key) {
        const configItem = this.configItems.get(key);
        if (!configItem) {
            throw new Error(`Configuration item '${key}' not found`);
        }
        return configItem.defaultValue;
    }
    /**
     * Validate all configuration items
     */
    validateAll() {
        const errors = [];
        for (const [key, item] of this.configItems.entries()) {
            const value = this.get(key);
            // Check required
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
    getAllItems() {
        return Array.from(this.configItems.values());
    }
    /**
     * Get configuration by section
     */
    getSection(section) {
        const result = {};
        for (const [key, item] of this.configItems.entries()) {
            if (key.startsWith(`${section}.`)) {
                result[key.replace(`${section}.`, '')] = this.get(key);
            }
        }
        return result;
    }
    /**
     * Convert scope string to ConfigurationTarget
     */
    getConfigurationTarget(scope) {
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
    getAll() {
        const result = {};
        for (const key of this.configItems.keys()) {
            result[key] = this.get(key);
        }
        return result;
    }
    /**
     * Reset configuration to default values
     */
    async resetAll() {
        for (const [key, item] of this.configItems.entries()) {
            await this.set(key, item.defaultValue);
        }
    }
    /**
     * Watch for configuration changes
     */
    watch(callback) {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(this.CONFIG_SECTION)) {
                // Get configuration before change
                const oldConfig = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
                // Get configuration after change
                const newConfig = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
                for (const key of this.configItems.keys()) {
                    const oldValue = oldConfig.get(key);
                    const newValue = newConfig.get(key);
                    if (oldValue !== newValue) {
                        callback(key, newValue, oldValue);
                    }
                }
            }
        });
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=configService.js.map
/**
 * Chat completion request message
 */
export interface ChatCompletionRequestMessage {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatCompletionRequestMessage;
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Project plan structure for generator
 */
export interface ProjectPlan {
    version: string;
    projectName: string;
    description: string;
    directories: string[];
    files: ProjectFile[];
    steps: ProjectStep[];
    dependencies: string[];
    metadata: {
        generatedAt: string;
        generatorVersion: string;
        model: string;
    };
}

/**
 * Project file structure
 */
export interface ProjectFile {
    path: string;
    purpose: string;
    language: string;
    dependencies: string[];
    content?: string;
    overwrite?: boolean;
}

/**
 * Project step structure
 */
export interface ProjectStep {
    id: string;
    name: string;
    description: string;
    dependencies: string[];
    action: 'create' | 'modify' | 'delete' | 'run' | 'test';
    target?: string;
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 'overwrite' | 'skip' | 'merge' | 'ask';

/**
 * Intent structure for natural language routing
 */
export interface Intent {
    type: string;
    args: Record<string, any>;
    confidence: number;
    source: 'rule' | 'model';
}

/**
 * Logger severity levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Configuration item structure
 */
export interface ConfigItem<T = any> {
    key: string;
    defaultValue: T;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    scope: 'global' | 'workspace' | 'window';
    required?: boolean;
    validate?: (value: T) => boolean;
}

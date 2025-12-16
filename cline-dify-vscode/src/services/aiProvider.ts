import { ChatCompletionRequestMessage } from './types';

/**
 * AI Provider interface for unified access to different AI services
 */
export interface AIProvider {
    /**
     * Generate text based on a prompt
     */
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    
    /**
     * Chat with the AI using a list of messages
     */
    chat(messages: ChatCompletionRequestMessage[], options?: ChatOptions): Promise<string>;
    
    /**
     * Complete text based on a prefix
     */
    complete(prefix: string, options?: CompleteOptions): Promise<string>;
    
    /**
     * Stream response for real-time interaction
     */
    stream(
        messages: ChatCompletionRequestMessage[], 
        options?: StreamOptions,
        callback?: (chunk: string) => void
    ): Promise<StreamHandle>;
    
    /**
     * Cancel a streaming request
     */
    cancel(streamHandle: StreamHandle): Promise<void>;
    
    /**
     * Get provider information
     */
    getInfo(): ProviderInfo;
}

/**
 * Provider information
 */
export interface ProviderInfo {
    name: string;
    type: 'dify' | 'ollama' | 'openai' | 'other';
    supportsStreaming: boolean;
    supportedModels: string[];
}

/**
 * Generate options
 */
export interface GenerateOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
}

/**
 * Chat options
 */
export interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
}

/**
 * Complete options
 */
export interface CompleteOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
}

/**
 * Stream options
 */
export interface StreamOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
}

/**
 * Stream handle for cancelling streaming requests
 */
export interface StreamHandle {
    id: string;
    cancel: () => void;
}

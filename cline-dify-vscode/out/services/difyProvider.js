"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifyProvider = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Dify AI Provider implementation
 */
class DifyProvider {
    constructor(apiKey, baseUrl = 'https://api.dify.ai', defaultModel = 'gpt-4') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.defaultModel = defaultModel;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    async generate(prompt, options) {
        const messages = [
            {
                role: 'system',
                content: 'You are an expert AI coding assistant. Provide clear, concise, and accurate responses.'
            },
            {
                role: 'user',
                content: prompt
            }
        ];
        return this.chat(messages, options);
    }
    async chat(messages, options) {
        const response = await this.axiosInstance.post('/v1/chat/completions', {
            model: options?.model || this.defaultModel,
            messages,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2048,
            stop: options?.stop,
            top_p: options?.topP,
            frequency_penalty: options?.frequencyPenalty,
            presence_penalty: options?.presencePenalty
        });
        return response.data.choices[0].message.content;
    }
    async complete(prefix, options) {
        const messages = [
            {
                role: 'system',
                content: 'Complete the following code or text.'
            },
            {
                role: 'user',
                content: prefix
            }
        ];
        return this.chat(messages, {
            model: options?.model || this.defaultModel,
            temperature: options?.temperature || 0.7,
            maxTokens: options?.maxTokens || 512,
            stop: options?.stop
        });
    }
    async stream(messages, options, callback) {
        // Dify streaming implementation would go here
        // For now, we'll use the non-streaming implementation as fallback
        const streamId = `dify-stream-${Date.now()}`;
        setTimeout(async () => {
            try {
                const response = await this.chat(messages, options);
                if (callback) {
                    callback(response);
                }
            }
            catch (error) {
                console.error('Streaming error:', error);
            }
        }, 100);
        return {
            id: streamId,
            cancel: () => {
                console.log(`Cancelled stream: ${streamId}`);
            }
        };
    }
    async cancel(streamHandle) {
        streamHandle.cancel();
    }
    getInfo() {
        return {
            name: 'Dify',
            type: 'dify',
            supportsStreaming: true,
            supportedModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-2', 'claude-3', 'gemini-pro']
        };
    }
    /**
     * Update API key
     */
    updateApiKey(apiKey) {
        this.apiKey = apiKey;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    /**
     * Update base URL
     */
    updateBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    /**
     * Update default model
     */
    updateDefaultModel(model) {
        this.defaultModel = model;
    }
}
exports.DifyProvider = DifyProvider;
//# sourceMappingURL=difyProvider.js.map
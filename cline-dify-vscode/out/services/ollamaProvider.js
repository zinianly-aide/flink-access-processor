"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Ollama AI Provider implementation
 */
class OllamaProvider {
    constructor(defaultModel = 'llama2', baseUrl = 'http://localhost:11434') {
        this.streamingConnections = new Map();
        this.defaultModel = defaultModel;
        this.axiosInstance = axios_1.default.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    async generate(prompt, options) {
        const response = await this.axiosInstance.post('/api/generate', {
            model: options?.model || this.defaultModel,
            prompt,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2048,
            stop: options?.stop
        });
        return response.data.response;
    }
    async chat(messages, options) {
        const response = await this.axiosInstance.post('/api/chat', {
            model: options?.model || this.defaultModel,
            messages,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2048,
            stop: options?.stop,
            stream: false
        });
        return response.data.message.content;
    }
    async complete(prefix, options) {
        return this.generate(prefix, {
            model: options?.model || this.defaultModel,
            temperature: options?.temperature || 0.7,
            maxTokens: options?.maxTokens || 512,
            stop: options?.stop
        });
    }
    async stream(messages, options, callback) {
        const streamId = `ollama-stream-${Date.now()}`;
        const controller = new AbortController();
        this.streamingConnections.set(streamId, controller);
        try {
            const response = await this.axiosInstance.post('/api/chat', {
                model: options?.model || this.defaultModel,
                messages,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 2048,
                stop: options?.stop,
                stream: true
            }, {
                signal: controller.signal,
                responseType: 'stream'
            });
            const stream = response.data;
            let buffer = '';
            stream.on('data', (chunk) => {
                buffer += chunk.toString();
                // Process each JSON object in the stream
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.substring(0, newlineIndex).trim();
                    buffer = buffer.substring(newlineIndex + 1);
                    if (line) {
                        try {
                            const data = JSON.parse(line);
                            if (data.message?.content && callback) {
                                callback(data.message.content);
                            }
                        }
                        catch (error) {
                            console.error('Error parsing Ollama stream data:', error);
                        }
                    }
                }
            });
            stream.on('end', () => {
                this.streamingConnections.delete(streamId);
            });
            stream.on('error', (error) => {
                console.error('Ollama stream error:', error);
                this.streamingConnections.delete(streamId);
            });
        }
        catch (error) {
            console.error('Ollama stream request error:', error);
            this.streamingConnections.delete(streamId);
        }
        return {
            id: streamId,
            cancel: () => {
                this.cancel({ id: streamId, cancel: () => { } });
            }
        };
    }
    async cancel(streamHandle) {
        const controller = this.streamingConnections.get(streamHandle.id);
        if (controller) {
            controller.abort();
            this.streamingConnections.delete(streamHandle.id);
            console.log(`Cancelled Ollama stream: ${streamHandle.id}`);
        }
    }
    getInfo() {
        return {
            name: 'Ollama',
            type: 'ollama',
            supportsStreaming: true,
            supportedModels: ['llama2', 'mistral', 'gemma', 'codellama', 'phi', 'llama3']
        };
    }
    /**
     * Update default model
     */
    updateDefaultModel(model) {
        this.defaultModel = model;
    }
    /**
     * List available models
     */
    async listModels() {
        try {
            const response = await this.axiosInstance.get('/api/tags');
            return response.data.models.map((model) => model.name);
        }
        catch (error) {
            console.error('Error listing Ollama models:', error);
            return [];
        }
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollamaProvider.js.map
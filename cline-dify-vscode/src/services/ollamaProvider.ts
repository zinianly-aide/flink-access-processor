import axios, { AxiosInstance } from 'axios';
import { AIProvider, ProviderInfo, GenerateOptions, ChatOptions, CompleteOptions, StreamOptions, StreamHandle } from './aiProvider';
import { ChatCompletionRequestMessage } from './types';

/**
 * Ollama AI Provider implementation
 */
export class OllamaProvider implements AIProvider {
    private axiosInstance: AxiosInstance;
    private defaultModel: string;
    private streamingConnections: Map<string, AbortController> = new Map();

    constructor(defaultModel: string = 'llama2', baseUrl: string = 'http://localhost:11434') {
        this.defaultModel = defaultModel;

        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    async generate(prompt: string, options?: GenerateOptions): Promise<string> {
        const response = await this.axiosInstance.post('/api/generate', {
            model: options?.model || this.defaultModel,
            prompt,
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 2048,
            stop: options?.stop,
            stream: false
        });

        const data = response.data;
        if (typeof data?.response === 'string') {
            return data.response;
        }
        if (typeof data?.message?.content === 'string') {
            return data.message.content;
        }
        if (typeof data === 'string') {
            return data;
        }
        return JSON.stringify(data);
    }

    async chat(messages: ChatCompletionRequestMessage[], options?: ChatOptions): Promise<string> {
        const response = await this.axiosInstance.post('/api/chat', {
            model: options?.model || this.defaultModel,
            messages,
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 2048,
            stop: options?.stop,
            stream: false
        });

        return response.data.message.content;
    }

    async complete(prefix: string, options?: CompleteOptions): Promise<string> {
        return this.generate(prefix, {
            model: options?.model || this.defaultModel,
            temperature: options?.temperature || 0.7,
            maxTokens: options?.maxTokens || 512,
            stop: options?.stop
        });
    }

    async stream(
        messages: ChatCompletionRequestMessage[], 
        options?: StreamOptions,
        callback?: (chunk: string) => void
    ): Promise<StreamHandle> {
        const streamId = `ollama-stream-${Date.now()}`;
        const controller = new AbortController();
        let resolveDone: (() => void) | undefined;
        let rejectDone: ((error: unknown) => void) | undefined;
        const done = new Promise<void>((resolve, reject) => {
            resolveDone = resolve;
            rejectDone = reject;
        });
        
        this.streamingConnections.set(streamId, controller);

        try {
            const response = await this.axiosInstance.post(
                '/api/chat',
                {
                    model: options?.model || this.defaultModel,
                    messages,
                    temperature: options?.temperature || 0.7,
                    num_predict: options?.maxTokens || 2048,
                    stop: options?.stop,
                    stream: true
                },
                {
                    signal: controller.signal,
                    responseType: 'stream',
                    timeout: 0
                }
            );

            const stream = response.data;
            let buffer = '';

            const finish = (error?: unknown) => {
                this.streamingConnections.delete(streamId);
                try {
                    stream.removeAllListeners?.();
                } catch {
                    // ignore
                }

                if (error) {
                    rejectDone?.(error);
                    return;
                }
                resolveDone?.();
            };

            stream.on('data', (chunk: Buffer) => {
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
                        } catch (error) {
                            console.error('Error parsing Ollama stream data:', error);
                        }
                    }
                }
            });

            stream.on('end', () => {
                finish();
            });

            stream.on('error', (error: Error) => {
                console.error('Ollama stream error:', error);
                finish(error);
            });

            stream.on('close', () => {
                finish();
            });
        } catch (error) {
            console.error('Ollama stream request error:', error);
            this.streamingConnections.delete(streamId);
            rejectDone?.(error);
        }

        return {
            id: streamId,
            cancel: () => {
                controller.abort();
                this.streamingConnections.delete(streamId);
                resolveDone?.();
            },
            done
        };
    }

    async cancel(streamHandle: StreamHandle): Promise<void> {
        const controller = this.streamingConnections.get(streamHandle.id);
        if (controller) {
            controller.abort();
            this.streamingConnections.delete(streamHandle.id);
            console.log(`Cancelled Ollama stream: ${streamHandle.id}`);
        }
    }

    getInfo(): ProviderInfo {
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
    public updateDefaultModel(model: string): void {
        this.defaultModel = model;
    }

    /**
     * List available models
     */
    public async listModels(): Promise<string[]> {
        try {
            const response = await this.axiosInstance.get('/api/tags');
            return response.data.models.map((model: any) => model.name);
        } catch (error) {
            console.error('Error listing Ollama models:', error);
            return [];
        }
    }
}

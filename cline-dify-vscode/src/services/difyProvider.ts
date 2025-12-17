import axios, { AxiosInstance } from 'axios';
import { AIProvider, ProviderInfo, GenerateOptions, ChatOptions, CompleteOptions, StreamOptions, StreamHandle } from './aiProvider';
import { ChatCompletionRequestMessage } from './types';

/**
 * Dify AI Provider implementation
 */
export class DifyProvider implements AIProvider {
    private axiosInstance: AxiosInstance;
    private apiKey: string;
    private baseUrl: string;
    private defaultModel: string;

    constructor(apiKey: string, baseUrl: string = 'https://api.dify.ai', defaultModel: string = 'gpt-4') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.defaultModel = defaultModel;

        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async generate(prompt: string, options?: GenerateOptions): Promise<string> {
        const messages: ChatCompletionRequestMessage[] = [
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

    async chat(messages: ChatCompletionRequestMessage[], options?: ChatOptions): Promise<string> {
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

    async complete(prefix: string, options?: CompleteOptions): Promise<string> {
        const messages: ChatCompletionRequestMessage[] = [
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

    async stream(
        messages: ChatCompletionRequestMessage[], 
        options?: StreamOptions,
        callback?: (chunk: string) => void
    ): Promise<StreamHandle> {
        const streamId = `dify-stream-${Date.now()}`;
        const controller = new AbortController();
        let accumulatedResponse = '';

        try {
            const response = await this.axiosInstance.post(
                '/v1/chat/completions',
                {
                    model: options?.model || this.defaultModel,
                    messages,
                    temperature: options?.temperature || 0.7,
                    max_tokens: options?.maxTokens || 2048,
                    stop: options?.stop,
                    stream: true
                },
                {
                    signal: controller.signal,
                    responseType: 'stream'
                }
            );

            const stream = response.data;
            let buffer = '';

            stream.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                
                // Process each SSE event in the stream
                let eventIndex;
                while ((eventIndex = buffer.indexOf('\n\n')) !== -1) {
                    const event = buffer.substring(0, eventIndex).trim();
                    buffer = buffer.substring(eventIndex + 2);
                    
                    if (event && event.startsWith('data: ')) {
                        const dataStr = event.substring(6);
                        if (dataStr === '[DONE]') {
                            // Stream completed
                            stream.destroy();
                            return;
                        }
                        
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.choices && data.choices[0]?.delta?.content) {
                                const chunk = data.choices[0].delta.content;
                                accumulatedResponse += chunk;
                                if (callback) {
                                    callback(chunk);
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing Dify stream data:', error);
                        }
                    }
                }
            });

            stream.on('end', () => {
                console.log(`Stream ${streamId} completed`);
            });

            stream.on('error', (error: Error) => {
                console.error('Dify stream error:', error);
            });

        } catch (error) {
            console.error('Dify stream request error:', error);
        }

        return {
            id: streamId,
            cancel: () => {
                controller.abort();
                console.log(`Cancelled Dify stream: ${streamId}`);
            }
        };
    }

    async cancel(streamHandle: StreamHandle): Promise<void> {
        streamHandle.cancel();
    }

    getInfo(): ProviderInfo {
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
    public updateApiKey(apiKey: string): void {
        this.apiKey = apiKey;
        this.axiosInstance = axios.create({
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
    public updateBaseUrl(baseUrl: string): void {
        this.baseUrl = baseUrl;
        this.axiosInstance = axios.create({
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
    public updateDefaultModel(model: string): void {
        this.defaultModel = model;
    }
}
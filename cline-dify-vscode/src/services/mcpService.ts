import * as vscode from 'vscode';
import axios from 'axios';

export class McpService {
    private context: vscode.ExtensionContext;
    private enabled: boolean = false;
    private baseUrl: string = 'http://localhost:3921';
    private apiKey: string = '';
    private output: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.output = vscode.window.createOutputChannel('Cline MCP');
        this.loadConfiguration();

        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('cline-dify-assistant')) {
                this.loadConfiguration();
            }
        });
    }

    private loadConfiguration() {
        const config = vscode.workspace.getConfiguration('cline-dify-assistant');
        this.enabled = config.get<boolean>('mcpEnabled', false);
        this.baseUrl = config.get<string>('mcpBaseUrl', 'http://localhost:3921');
        this.apiKey = config.get<string>('mcpApiKey', '');
    }

    public isEnabled(): boolean {
        return this.enabled && !!this.baseUrl;
    }

    public async runInteractiveQuery() {
        if (!this.isEnabled()) {
            vscode.window.showErrorMessage('MCP 未启用，请先在设置中开启并配置 MCP 服务。');
            return;
        }

        const query = await vscode.window.showInputBox({
            prompt: '输入 MCP 查询内容',
            placeHolder: '例如：列出项目中的服务文件',
            ignoreFocusOut: true
        });

        if (!query?.trim()) {
            return;
        }

        await this.executeQuery(query.trim());
    }

    public async executeQuery(query: string): Promise<string> {
        if (!this.isEnabled()) {
            throw new Error('MCP 未启用或配置不完整');
        }

        const endpoint = `${this.baseUrl.replace(/\/$/, '')}/query`;
        try {
            const response = await axios.post(
                endpoint,
                { query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
                    }
                }
            );

            const content = response?.data?.result ?? JSON.stringify(response.data, null, 2);
            this.writeOutput(query, content);
            return typeof content === 'string' ? content : JSON.stringify(content);
        } catch (error: any) {
            const message = error?.response?.data?.message ?? error?.message ?? 'MCP 请求失败';
            this.writeOutput(query, `MCP 请求失败: ${message}`);
            throw new Error(message);
        }
    }

    private writeOutput(query: string, result: string) {
        this.output.appendLine(`> MCP Query: ${query}`);
        this.output.appendLine(result);
        this.output.appendLine('--------------------------');
        this.output.show(true);
    }
}

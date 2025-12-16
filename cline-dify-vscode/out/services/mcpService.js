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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpService = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class McpService {
    constructor(context) {
        this.enabled = false;
        this.baseUrl = 'http://localhost:3921';
        this.apiKey = '';
        this.context = context;
        this.output = vscode.window.createOutputChannel('Cline MCP');
        this.loadConfiguration();
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('cline-dify-assistant')) {
                this.loadConfiguration();
            }
        });
    }
    loadConfiguration() {
        const config = vscode.workspace.getConfiguration('cline-dify-assistant');
        this.enabled = config.get('mcpEnabled', false);
        this.baseUrl = config.get('mcpBaseUrl', 'http://localhost:3921');
        this.apiKey = config.get('mcpApiKey', '');
    }
    isEnabled() {
        return this.enabled && !!this.baseUrl;
    }
    async runInteractiveQuery() {
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
    async executeQuery(query) {
        if (!this.isEnabled()) {
            throw new Error('MCP 未启用或配置不完整');
        }
        const endpoint = `${this.baseUrl.replace(/\/$/, '')}/query`;
        try {
            const response = await axios_1.default.post(endpoint, { query }, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
                }
            });
            const content = response?.data?.result ?? JSON.stringify(response.data, null, 2);
            this.writeOutput(query, content);
            return typeof content === 'string' ? content : JSON.stringify(content);
        }
        catch (error) {
            const message = error?.response?.data?.message ?? error?.message ?? 'MCP 请求失败';
            this.writeOutput(query, `MCP 请求失败: ${message}`);
            throw new Error(message);
        }
    }
    writeOutput(query, result) {
        this.output.appendLine(`> MCP Query: ${query}`);
        this.output.appendLine(result);
        this.output.appendLine('--------------------------');
        this.output.show(true);
    }
}
exports.McpService = McpService;
//# sourceMappingURL=mcpService.js.map
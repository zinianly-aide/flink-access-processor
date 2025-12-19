import { Intent } from './types';

export class IntentRouterService {
    public route(raw: string): Intent | null {
        const text = (raw ?? '').trim();
        if (!text) {
            return null;
        }

        if (/^\/help$/i.test(text) || /^帮助$/i.test(text) || /^\/\?$/i.test(text)) {
            return { type: 'help', args: {}, confidence: 1, source: 'rule' };
        }

        if (/(打开|设置).*(配置|设置)/i.test(text)) {
            return { type: 'command', args: { command: 'cline-dify-assistant.configureSettings' }, confidence: 0.9, source: 'rule' };
        }

        if (/(查看|显示).*(结构|目录)/i.test(text)) {
            return { type: 'command', args: { command: 'cline-dify-assistant.showProjectStructure' }, confidence: 0.9, source: 'rule' };
        }

        if (/(查看|显示).*(变更|diff|差异)/i.test(text)) {
            return { type: 'command', args: { command: 'cline-dify-assistant.openChangeTracker' }, confidence: 0.9, source: 'rule' };
        }

        if (/(调试|运行).*(生成代码|生成器)/i.test(text)) {
            return { type: 'command', args: { command: 'cline-dify-assistant.debugGeneratedCode' }, confidence: 0.85, source: 'rule' };
        }

        if (/(安装|引入|更新).*(依赖|dependencies)/i.test(text) || /复制.*安装命令/i.test(text)) {
            return { type: 'command', args: { command: 'cline-dify-assistant.copyInstallCommand' }, confidence: 0.85, source: 'rule' };
        }

        if (/(下一步|后续|接下来).*(建议|操作|怎么做)/i.test(text) || /^next steps$/i.test(text)) {
            return { type: 'command', args: { command: 'cline-dify-assistant.generateNextSteps' }, confidence: 0.85, source: 'rule' };
        }

        if (/引用当前选区/i.test(text) || /引用选区/i.test(text)) {
            return { type: 'citationSelection', args: {}, confidence: 1, source: 'rule' };
        }

        if (/^\/mcp/i.test(text) || /^mcp[:：]/i.test(text) || /使用\s*mcp/i.test(text) || /调用\s*mcp/i.test(text)) {
            const query = text.replace(/^\/?mcp[:：]?/i, '').replace(/使用\s*mcp/i, '').replace(/调用\s*mcp/i, '').trim() || text;
            return { type: 'mcp', args: { query }, confidence: 1, source: 'rule' };
        }

        if (/^引用\s+/i.test(text)) {
            return { type: 'citationText', args: { text }, confidence: 1, source: 'rule' };
        }

        return null;
    }
}

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class CitationService {
    constructor(private readonly context: vscode.ExtensionContext) {}

    public async insertCitationInteractive() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        const fileUri = await this.pickFile(workspaceFolder);
        if (!fileUri) {
            return;
        }

        const rangeInput = await vscode.window.showInputBox({
            prompt: '请输入引用的行区间（格式：start-end，可留空引用全文）',
            placeHolder: '例如：10-30',
            ignoreFocusOut: true
        });

        const range = this.parseRange(rangeInput);
        const citation = await this.buildCitation(fileUri, range);
        if (!citation) {
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.env.clipboard.writeText(citation);
            vscode.window.showInformationMessage('当前没有打开编辑器，已将引用内容复制到剪贴板。');
            return;
        }

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, citation);
        });
    }

    public async buildCitation(fileUri: vscode.Uri, range?: { start: number; end: number }): Promise<string | null> {
        try {
            const content = fs.readFileSync(fileUri.fsPath, 'utf8');
            const lines = content.split(/\r?\n/);
            const start = range?.start ?? 1;
            const end = range?.end ?? lines.length;
            if (start < 1 || end < start) {
                vscode.window.showErrorMessage('行区间不合法。');
                return null;
            }

            const snippet = lines.slice(start - 1, end).join('\n');
            const relativePath = vscode.workspace.asRelativePath(fileUri, false);

            return `> 引用: ${relativePath}:${start}-${end}\n\`\`\`\n${snippet}\n\`\`\`\n`;
        } catch (error: any) {
            vscode.window.showErrorMessage(`读取文件失败: ${error?.message ?? error}`);
            return null;
        }
    }

    public async handleCitationRequest(message: string): Promise<string | null> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return '无法引用：当前没有打开工作区。';
        }

        const match = message.match(/引用\s+([^\s:]+)(?::(\d+)(?:-(\d+))?)?/i);
        if (!match) {
            return null;
        }

        const filePath = match[1];
        const start = match[2] ? parseInt(match[2], 10) : undefined;
        const end = match[3] ? parseInt(match[3], 10) : undefined;

        const absolutePath = path.join(workspaceFolder.uri.fsPath, filePath);
        if (!fs.existsSync(absolutePath)) {
            return `未找到文件：${filePath}`;
        }

        const citation = await this.buildCitation(vscode.Uri.file(absolutePath), start ? { start, end: end ?? start } : undefined);
        return citation ?? '无法生成引用，请检查输入。';
    }

    private async pickFile(workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.Uri | undefined> {
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 200);
        if (!files.length) {
            vscode.window.showWarningMessage('未找到可引用的文件。');
            return undefined;
        }

        const items = files.map(file => ({
            label: vscode.workspace.asRelativePath(file, false),
            description: file.fsPath,
            uri: file
        }));

        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: '选择要引用的文件',
            matchOnDescription: true
        });

        return picked?.uri;
    }

    private parseRange(input?: string): { start: number; end: number } | undefined {
        if (!input) {
            return undefined;
        }

        const match = input.match(/(\d+)\s*-\s*(\d+)/);
        if (!match) {
            const single = parseInt(input, 10);
            if (!isNaN(single)) {
                return { start: single, end: single };
            }
            return undefined;
        }

        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        return { start, end };
    }
}

import * as vscode from 'vscode';
import * as util from 'util';
import { escapeHtml, getDefaultCsp, getNonce } from './webviewSecurity';
import { execFile } from 'child_process';
import { pickWorkspaceFolder } from './workspaceService';
import * as path from 'path';

const execFileAsync = util.promisify(execFile);

type GitFileStatus = { path: string; status: string };
type GitData = { files: GitFileStatus[]; selectedFile?: string; diff?: string; error?: string };

export class ChangeTrackerService {
    private panel?: vscode.WebviewPanel;
    private workspaceRoot?: string;
    private selectedFile?: string;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async showChangeTracker() {
        const workspaceFolder = await pickWorkspaceFolder('选择要追踪变更的工作区文件夹');
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }
        this.workspaceRoot = workspaceFolder.uri.fsPath;

        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'clineDifyChangeTracker',
                'Code Change Tracker',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });

            this.panel.webview.onDidReceiveMessage(async (message) => {
                if (message.type === 'refresh') {
                    await this.refreshPanel();
                }
                if (message.type === 'selectFile') {
                    this.selectedFile = typeof message.path === 'string' ? message.path : undefined;
                    await this.refreshPanel();
                }
                if (message.type === 'openDiff') {
                    const relativePath = typeof message.path === 'string' ? message.path : '';
                    if (relativePath) {
                        await this.openDiff(relativePath);
                    }
                }
            });
        } else {
            this.panel.reveal(vscode.ViewColumn.Beside);
        }

        await this.refreshPanel();
    }

    private async refreshPanel() {
        if (!this.panel) {
            return;
        }

        const rootPath = this.workspaceRoot;
        if (!rootPath) {
            return;
        }

        const data = await this.collectGitData(rootPath, this.selectedFile);
        this.panel.webview.html = this.getWebviewContent(data);
    }

    private async collectGitData(rootPath: string, selectedFile?: string): Promise<GitData> {
        try {
            const statusResult = await execFileAsync('git', ['status', '--porcelain'], { cwd: rootPath });
            const files = this.parsePorcelainStatus(statusResult.stdout || '');

            let diff = '';
            if (selectedFile) {
                const diffResult = await execFileAsync('git', ['diff', '--', selectedFile], { cwd: rootPath });
                diff = diffResult.stdout || '';
            }

            return { files, selectedFile, diff };
        } catch (error: any) {
            console.error('Failed to collect git data:', error);
            return {
                files: [],
                selectedFile,
                diff: '',
                error: error?.message ?? 'Unable to run git commands. Ensure git is installed and the workspace is a repository.'
            };
        }
    }

    private parsePorcelainStatus(output: string): GitFileStatus[] {
        const lines = (output || '').split(/\r?\n/).map(l => l.trimEnd()).filter(Boolean);
        return lines.map(line => {
            if (line.startsWith('?? ')) {
                return { status: '??', path: line.substring(3).trim() };
            }
            const status = line.substring(0, 2).trim() || '?';
            const path = line.substring(3).trim();
            return { status, path };
        });
    }

    private async openDiff(relativePath: string) {
        if (!this.workspaceRoot) {
            return;
        }

        const uri = vscode.Uri.file(path.join(this.workspaceRoot, relativePath));

        try {
            await vscode.commands.executeCommand('git.openChange', uri);
            return;
        } catch {
            // ignore and fall back
        }

        await vscode.commands.executeCommand('vscode.open', uri);
    }

    private getWebviewContent(data: GitData): string {
        const nonce = getNonce();
        const statusSection = data.error
            ? `<div class="error">${escapeHtml(data.error)}</div>`
            : this.renderFileList(data.files, data.selectedFile);

        const diffSection = data.error
            ? ''
            : data.selectedFile
                ? `<h2>Diff: ${escapeHtml(data.selectedFile)}</h2><pre>${escapeHtml(data.diff ?? '') || 'No diffs available'}</pre>`
                : `<div class="hint">点击上方文件列表查看对应 diff，或点击“Open Diff”在编辑器中打开。</div>`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${getDefaultCsp(this.panel!.webview, nonce)}">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; }
        h1 { font-size: 18px; margin-bottom: 12px; color: #111827; }
        h2 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; color: #1f2937; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: 'Consolas', monospace; }
        button { background: #4F46E5; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        .files { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .file-row { display: grid; grid-template-columns: 60px 1fr 90px; gap: 8px; padding: 8px 10px; border-top: 1px solid #f1f5f9; cursor: pointer; align-items: center; }
        .file-row:first-child { border-top: none; }
        .file-row:hover { background: #f8fafc; }
        .file-row.active { background: #eef2ff; }
        .status { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #334155; }
        .path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hint { color: #6b7280; font-size: 12px; padding: 8px 0; }
        .error { color: #b91c1c; background: #fee2e2; padding: 10px; border-radius: 6px; }
    </style>
</head>
<body>
    <h1>Code Change Tracker</h1>
    <button id="refresh">Refresh</button>
    <h2>Git Status</h2>
    ${statusSection}
    ${diffSection}
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.getElementById('refresh').addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' });
        });

        document.addEventListener('click', (event) => {
            const row = event.target.closest?.('[data-file-path]');
            if (!row) { return; }
            const path = row.getAttribute('data-file-path');
            const action = row.getAttribute('data-action');
            if (!path) { return; }
            if (action === 'open') {
                vscode.postMessage({ type: 'openDiff', path });
                return;
            }
            vscode.postMessage({ type: 'selectFile', path });
        });
    </script>
</body>
</html>`;
    }

    private renderFileList(files: GitFileStatus[], selectedFile?: string): string {
        if (!files.length) {
            return `<div class="hint">Working tree clean</div>`;
        }

        const rows = files.map(file => {
            const activeClass = selectedFile === file.path ? 'file-row active' : 'file-row';
            return `<div class="${activeClass}" data-file-path="${escapeHtml(file.path)}">
  <div class="status">${escapeHtml(file.status)}</div>
  <div class="path" title="${escapeHtml(file.path)}">${escapeHtml(file.path)}</div>
  <div><button data-action="open" data-file-path="${escapeHtml(file.path)}">Open Diff</button></div>
</div>`;
        }).join('');

        return `<div class="files">${rows}</div>`;
    }
}

import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(exec);

export class ChangeTrackerService {
    private panel?: vscode.WebviewPanel;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async showChangeTracker() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

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
                    await this.refreshPanel(workspaceFolder.uri.fsPath);
                }
            });
        } else {
            this.panel.reveal(vscode.ViewColumn.Beside);
        }

        await this.refreshPanel(workspaceFolder.uri.fsPath);
    }

    private async refreshPanel(rootPath: string) {
        if (!this.panel) {
            return;
        }

        const data = await this.collectGitData(rootPath);
        this.panel.webview.html = this.getWebviewContent(data);
    }

    private async collectGitData(rootPath: string) {
        try {
            const statusResult = await execAsync('git status --short', { cwd: rootPath });
            const diffResult = await execAsync('git diff', { cwd: rootPath });
            return {
                status: statusResult.stdout || 'Working tree clean',
                diff: diffResult.stdout || 'No diffs available'
            };
        } catch (error: any) {
            console.error('Failed to collect git data:', error);
            return {
                error: error?.message ?? 'Unable to run git commands. Ensure git is installed and the workspace is a repository.'
            };
        }
    }

    private getWebviewContent(data: { status?: string; diff?: string; error?: string }): string {
        const statusSection = data.error
            ? `<div class="error">${this.escapeHtml(data.error)}</div>`
            : `<pre>${this.escapeHtml(data.status ?? '')}</pre>`;

        const diffSection = data.error ? '' : `<pre>${this.escapeHtml(data.diff ?? '')}</pre>`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; }
        h1 { font-size: 18px; margin-bottom: 12px; color: #111827; }
        h2 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; color: #1f2937; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: 'Consolas', monospace; }
        button { background: #4F46E5; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        .error { color: #b91c1c; background: #fee2e2; padding: 10px; border-radius: 6px; }
    </style>
</head>
<body>
    <h1>Code Change Tracker</h1>
    <button id="refresh">Refresh</button>
    <h2>Git Status</h2>
    ${statusSection}
    ${diffSection ? '<h2>Diff</h2>' + diffSection : ''}
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('refresh').addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' });
        });
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

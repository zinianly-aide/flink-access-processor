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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeTrackerService = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process_1.exec);
class ChangeTrackerService {
    constructor(context) {
        this.context = context;
    }
    async showChangeTracker() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel('clineDifyChangeTracker', 'Code Change Tracker', vscode.ViewColumn.Beside, {
                enableScripts: true
            });
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
            this.panel.webview.onDidReceiveMessage(async (message) => {
                if (message.type === 'refresh') {
                    await this.refreshPanel(workspaceFolder.uri.fsPath);
                }
            });
        }
        else {
            this.panel.reveal(vscode.ViewColumn.Beside);
        }
        await this.refreshPanel(workspaceFolder.uri.fsPath);
    }
    async refreshPanel(rootPath) {
        if (!this.panel) {
            return;
        }
        const data = await this.collectGitData(rootPath);
        this.panel.webview.html = this.getWebviewContent(data);
    }
    async collectGitData(rootPath) {
        try {
            const statusResult = await execAsync('git status --short', { cwd: rootPath });
            const diffResult = await execAsync('git diff', { cwd: rootPath });
            return {
                status: statusResult.stdout || 'Working tree clean',
                diff: diffResult.stdout || 'No diffs available'
            };
        }
        catch (error) {
            console.error('Failed to collect git data:', error);
            return {
                error: error?.message ?? 'Unable to run git commands. Ensure git is installed and the workspace is a repository.'
            };
        }
    }
    getWebviewContent(data) {
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
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
exports.ChangeTrackerService = ChangeTrackerService;
//# sourceMappingURL=changeTrackerService.js.map
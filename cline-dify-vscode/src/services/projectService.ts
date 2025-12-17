import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const SENSITIVE_TOKENS = ['rm ', 'rm-', 'mv ', 'sudo', 'chmod', 'chown', 'mkfs', ':(){', 'shutdown', 'reboot'];

export class ProjectService {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Cline Dify Project');
    }

    /**
     * Generate directory structure and files based on input
     */
    public async generateDirectoryStructure() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        const projectRoot = workspaceFolder.uri.fsPath;

        // Get structure input from user
        const structureInput = await vscode.window.showInputBox({
            prompt: 'Enter directory structure (e.g., src/components/Button.tsx,src/utils/helpers.ts)',
            placeHolder: 'src/components/Button.tsx,src/utils/helpers.ts'
        });

        if (!structureInput) {
            return;
        }

        // Parse structure input
        const files = structureInput.split(',').map(file => file.trim()).filter(Boolean);

        try {
            for (const file of files) {
                const filePath = path.join(projectRoot, file);
                const dirPath = path.dirname(filePath);

                // Create directory if it doesn't exist
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                    vscode.window.showInformationMessage(`Created directory: ${dirPath}`);
                }

                // Create file if it doesn't exist
                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, '');
                    vscode.window.showInformationMessage(`Created file: ${file}`);
                } else {
                    vscode.window.showWarningMessage(`File already exists: ${file}`);
                }
            }
        } catch (error) {
            console.error('Error generating directory structure:', error);
            vscode.window.showErrorMessage('Failed to generate directory structure.');
        }
    }

    /**
     * Execute command line commands
     */
    public async executeCommand() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        const config = vscode.workspace.getConfiguration('cline-dify-assistant');
        const allowExecution = config.get<boolean>('safety.allowCommandExecution', false);
        if (!allowExecution) {
            const choice = await vscode.window.showWarningMessage(
                '已禁用命令执行功能（安全设置）。如需启用，请在设置中打开 safety.allowCommandExecution。',
                '打开设置'
            );
            if (choice === '打开设置') {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'cline-dify-assistant.safety.allowCommandExecution');
            }
            return;
        }

        const command = await vscode.window.showInputBox({
            prompt: 'Enter command to execute:',
            placeHolder: 'e.g., ls -la, git status'
        });

        const normalizedCommand = (command ?? '').trim();
        if (!normalizedCommand) {
            return;
        }

        const whitelist = config.get<string[]>('safety.commandWhitelist', []);
        if (!this.isWhitelisted(normalizedCommand, whitelist)) {
            vscode.window.showErrorMessage(`命令不在白名单中，已阻止执行：${normalizedCommand}`);
            return;
        }

        if (this.containsDisallowedShellMeta(normalizedCommand)) {
            vscode.window.showErrorMessage('命令包含不允许的 shell 操作符（如 &&、|、> 等），已阻止执行。');
            return;
        }

        if (this.isSensitiveCommand(normalizedCommand)) {
            const confirmation = await vscode.window.showWarningMessage(
                '该命令可能修改或删除文件，确认继续执行吗？',
                { modal: true },
                '继续执行'
            );

            if (confirmation !== '继续执行') {
                vscode.window.showInformationMessage('命令执行已取消。');
                return;
            }
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Executing: ${normalizedCommand}`,
                cancellable: true
            }, async (_progress, token) => {
                await this.runCommandStreamed(normalizedCommand, workspaceFolder.uri.fsPath, token);
            });
        } catch (error: any) {
            console.error('Error executing command:', error);
            vscode.window.showErrorMessage(`Command execution failed: ${error.message}`);
        }
    }

    private runCommandStreamed(command: string, cwd: string, token: vscode.CancellationToken): Promise<void> {
        return new Promise((resolve, reject) => {
            this.outputChannel.show(true);
            this.outputChannel.appendLine(`$ ${command}`);

            const child = spawn(command, { cwd, shell: true, env: process.env });
            token.onCancellationRequested(() => {
                try {
                    child.kill('SIGTERM');
                } catch {
                    // ignore
                }
                this.outputChannel.appendLine('[cancelled]');
                resolve();
            });

            child.stdout.on('data', (data: Buffer) => {
                this.outputChannel.append(data.toString());
            });

            child.stderr.on('data', (data: Buffer) => {
                this.outputChannel.append(data.toString());
            });

            child.on('error', (err) => {
                this.outputChannel.appendLine(`\n[error] ${err.message}`);
                reject(err);
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                    return;
                }
                reject(new Error(`Process exited with code ${code}`));
            });
        });
    }

    private isWhitelisted(command: string, whitelist: string[]): boolean {
        const trimmed = command.trim();
        if (!trimmed) {
            return false;
        }

        for (const entry of whitelist ?? []) {
            const allowed = (entry ?? '').trim();
            if (!allowed) {
                continue;
            }

            if (trimmed === allowed || trimmed.startsWith(`${allowed} `)) {
                return true;
            }
        }

        return false;
    }

    private containsDisallowedShellMeta(command: string): boolean {
        // Disallow common shell metacharacters/operators to avoid chaining, redirection, and subshells.
        const patterns = [
            /&&/,
            /\|\|/,
            /\|/,
            /;/,
            />/,
            /</,
            /\$\(/,
            /`/,
            /\n/,
            /\r/
        ];
        return patterns.some(pattern => pattern.test(command));
    }

    /**
     * Show project structure
     */
    public async showProjectStructure() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        try {
            const structure = this.buildProjectStructure(workspaceFolder.uri.fsPath);

            // Show project structure in a new panel
            const panel = vscode.window.createWebviewPanel(
                'projectStructure',
                'Project Structure',
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = this.getProjectStructureHtml(structure);
        } catch (error: any) {
            console.error('Error getting project structure:', error);
            vscode.window.showErrorMessage(`Failed to get project structure: ${error.message}`);
        }
    }

    /**
     * Read and display file content
     */
    public async readFileContent() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        const filePath = await vscode.window.showInputBox({
            prompt: 'Enter file path to read:',
            placeHolder: 'e.g., src/components/Button.tsx'
        });

        if (!filePath) {
            return;
        }

        try {
            const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
            if (!fs.existsSync(fullPath)) {
                vscode.window.showErrorMessage(`File not found: ${filePath}`);
                return;
            }

            const content = fs.readFileSync(fullPath, 'utf8');

            // Show file content in a new panel
            const panel = vscode.window.createWebviewPanel(
                'fileContent',
                `File: ${filePath}`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: false
                }
            );

            panel.webview.html = this.getFileContentHtml(filePath, content);
        } catch (error: any) {
            console.error('Error reading file:', error);
            vscode.window.showErrorMessage(`Failed to read file: ${error.message}`);
        }
    }

    private getProjectStructureHtml(structure: string): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Project Structure</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; }
                h1 { font-size: 18px; margin-bottom: 16px; }
                pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: 'Consolas', monospace; }
            </style>
        </head>
        <body>
            <h1>Project Structure</h1>
            <pre>${this.escapeHtml(structure)}</pre>
        </body>
        </html>
        `;
    }

    private getFileContentHtml(filePath: string, content: string): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>File Content</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; }
                h1 { font-size: 18px; margin-bottom: 16px; }
                pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: 'Consolas', monospace; line-height: 1.4; }
            </style>
        </head>
        <body>
            <h1>File: ${this.escapeHtml(filePath)}</h1>
            <pre>${this.escapeHtml(content)}</pre>
        </body>
        </html>
        `;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    private showCommandOutput(command: string, stdout: string, stderr: string) {
        this.outputChannel.appendLine(`$ ${command}`);
        if (stdout) {
            this.outputChannel.appendLine(stdout.trimEnd());
        }
        if (stderr) {
            this.outputChannel.appendLine('[stderr]');
            this.outputChannel.appendLine(stderr.trimEnd());
        }
        this.outputChannel.show(true);
    }

    private isSensitiveCommand(command: string): boolean {
        const normalized = command.toLowerCase();
        return SENSITIVE_TOKENS.some(token => normalized.includes(token));
    }

    private buildProjectStructure(rootPath: string): string {
        const lines: string[] = [];
        const rootName = path.basename(rootPath);
        lines.push(rootName);

        const traverse = (currentPath: string, prefix: string) => {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true })
                .filter(entry => !this.shouldSkipEntry(entry.name))
                .sort((a, b) => a.name.localeCompare(b.name));

            entries.forEach((entry, index) => {
                const connector = index === entries.length - 1 ? '└── ' : '├── ';
                lines.push(`${prefix}${connector}${entry.name}`);

                if (entry.isDirectory()) {
                    const nextPrefix = index === entries.length - 1 ? `${prefix}    ` : `${prefix}│   `;
                    traverse(path.join(currentPath, entry.name), nextPrefix);
                }
            });
        };

        traverse(rootPath, '');
        return lines.join('\n');
    }

    private shouldSkipEntry(name: string): boolean {
        return name === 'node_modules' || name === '.git' || name === '.DS_Store';
    }
}

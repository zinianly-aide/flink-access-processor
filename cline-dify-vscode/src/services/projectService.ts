import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const SENSITIVE_TOKENS = ['rm ', 'rm-', 'mv ', 'sudo', 'chmod', 'chown', 'mkfs', ':(){', 'shutdown', 'reboot'];

export class ProjectService {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Cline Dify Assistant');
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

        const command = await vscode.window.showInputBox({
            prompt: 'Enter command to execute:',
            placeHolder: 'e.g., ls -la, git status'
        });

        if (!command) {
            return;
        }

        if (this.isSensitiveCommand(command)) {
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
                title: `Executing: ${command}`,
                cancellable: false
            }, async () => {
                try {
                    const { stdout, stderr } = await execAsync(command, { cwd: workspaceFolder.uri.fsPath });
                    this.showCommandOutput(command, stdout, stderr);
                } catch (error: any) {
                    this.showCommandOutput(command, error.stdout ?? '', error.stderr ?? error.message ?? '');
                    throw error;
                }
            });
        } catch (error: any) {
            console.error('Error executing command:', error);
            vscode.window.showErrorMessage(`Command execution failed: ${error.message}`);
        }
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

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { pickWorkspaceFolder } from './workspaceService';
import { getDefaultCsp, getNonce } from './webviewSecurity';

const SENSITIVE_TOKENS = ['rm ', 'rm-', 'mv ', 'sudo', 'chmod', 'chown', 'mkfs', ':(){', 'shutdown', 'reboot'];

export class ProjectService {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private structurePanel?: vscode.WebviewPanel;
    private structureState?: {
        rootPath: string;
        rootName: string;
        includeFiles: boolean;
        showHidden: boolean;
        useGitignore: boolean;
        maxDepth: number;
        filter: string;
    };
    private gitignoreCache: Map<string, GitignoreMatcher> = new Map();

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

        const workspaceFolder = await pickWorkspaceFolder('选择要生成目录结构的工作区文件夹');
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
        const workspaceFolder = await pickWorkspaceFolder('选择要执行命令的工作区文件夹');
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
        const workspaceFolder = await pickWorkspaceFolder('选择要查看结构的工作区文件夹');
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        try {
            if (!this.structureState || this.structureState.rootPath !== workspaceFolder.uri.fsPath) {
                this.structureState = {
                    rootPath: workspaceFolder.uri.fsPath,
                    rootName: workspaceFolder.name,
                    includeFiles: true,
                    showHidden: false,
                    useGitignore: true,
                    maxDepth: 4,
                    filter: ''
                };
            }

            if (!this.structurePanel) {
                this.structurePanel = vscode.window.createWebviewPanel(
                    'projectStructure',
                    `Project Structure: ${workspaceFolder.name}`,
                    vscode.ViewColumn.Beside,
                    { enableScripts: true }
                );

                this.structurePanel.onDidDispose(() => {
                    this.structurePanel = undefined;
                });

                this.structurePanel.webview.onDidReceiveMessage(async message => {
                    if (!this.structureState) {
                        return;
                    }

                    switch (message.type) {
                        case 'refresh':
                            await this.refreshProjectStructure();
                            break;
                        case 'updateState':
                            this.structureState = {
                                ...this.structureState,
                                ...message.state
                            };
                            await this.refreshProjectStructure();
                            break;
                        case 'openPath':
                            if (typeof message.path === 'string') {
                                await this.openStructurePath(message.path);
                            }
                            break;
                        case 'copyPath':
                            await this.copyStructurePath(typeof message.path === 'string' ? message.path : '');
                            break;
                        case 'exportTextTree':
                            await this.exportStructureAsText();
                            break;
                    }
                });
            } else {
                this.structurePanel.title = `Project Structure: ${workspaceFolder.name}`;
                this.structurePanel.reveal(vscode.ViewColumn.Beside);
            }

            await this.refreshProjectStructure();
        } catch (error: any) {
            console.error('Error getting project structure:', error);
            vscode.window.showErrorMessage(`Failed to get project structure: ${error.message}`);
        }
    }

    /**
     * Read and display file content
     */
    public async readFileContent() {
        const workspaceFolder = await pickWorkspaceFolder('选择要读取文件的工作区文件夹');
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

    private getProjectStructureHtml(
        webview: vscode.Webview,
        data: StructureData,
        state: ProjectStructureState
    ): string {
        const nonce = getNonce();
        const csp = getDefaultCsp(webview, nonce);
        const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');
        const stateJson = JSON.stringify(state).replace(/</g, '\\u003c');

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <title>Project Structure</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; color: #111827; }
                h1 { font-size: 18px; margin-bottom: 12px; }
                .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
                .toolbar input[type="text"] { flex: 1; min-width: 180px; padding: 6px 8px; border-radius: 6px; border: 1px solid #d1d5db; }
                .toolbar input[type="number"] { width: 64px; padding: 6px 8px; border-radius: 6px; border: 1px solid #d1d5db; }
                .toolbar label { font-size: 12px; color: #374151; display: flex; align-items: center; gap: 4px; }
                button { padding: 6px 10px; border: none; border-radius: 6px; background: #4F46E5; color: white; cursor: pointer; }
                button.secondary { background: transparent; border: 1px solid #4F46E5; color: #4F46E5; }
                .meta { font-size: 12px; color: #6b7280; margin-bottom: 10px; }
                .tree { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
                ul { list-style: none; padding-left: 16px; margin: 0; }
                li { margin: 2px 0; }
                .node { display: flex; align-items: center; gap: 6px; padding: 2px 4px; border-radius: 4px; }
                .node:hover { background: #f3f4f6; }
                .node.selected { background: #eef2ff; }
                .twisty { width: 14px; text-align: center; cursor: pointer; color: #6b7280; }
                .name { cursor: pointer; }
                .file { color: #111827; }
                .dir { font-weight: 500; color: #1f2937; }
                .muted { color: #9ca3af; }
                .hidden { display: none; }
            </style>
        </head>
        <body>
            <h1>Project Structure</h1>
            <div class="toolbar">
                <input id="filterInput" type="text" placeholder="筛选（按名称或路径）" />
                <label><input id="includeFiles" type="checkbox" /> 文件</label>
                <label><input id="showHidden" type="checkbox" /> 隐藏项</label>
                <label><input id="useGitignore" type="checkbox" /> .gitignore</label>
                <label>深度 <input id="maxDepth" type="number" min="1" max="12" /></label>
                <button id="refresh">刷新</button>
                <button id="copyPath" class="secondary">复制路径</button>
                <button id="exportText" class="secondary">导出文本树</button>
            </div>
            <div class="meta" id="meta"></div>
            <div class="tree" id="tree"></div>
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                const initialData = ${dataJson};
                const initialState = ${stateJson};

                const filterInput = document.getElementById('filterInput');
                const includeFiles = document.getElementById('includeFiles');
                const showHidden = document.getElementById('showHidden');
                const useGitignore = document.getElementById('useGitignore');
                const maxDepth = document.getElementById('maxDepth');
                const tree = document.getElementById('tree');
                const meta = document.getElementById('meta');
                let selectedPath = '';

                function renderTree(data) {
                    tree.innerHTML = '';
                    const rootList = document.createElement('ul');
                    data.nodes.forEach(node => {
                        rootList.appendChild(renderNode(node));
                    });
                    tree.appendChild(rootList);

                    const truncated = data.counts.truncated ? ' · 已截断' : '';
                    meta.textContent = \`目录: \${data.counts.directories} · 文件: \${data.counts.files}\${truncated}\`;
                }

                function renderNode(node) {
                    const li = document.createElement('li');
                    const row = document.createElement('div');
                    row.className = 'node';

                    const twisty = document.createElement('span');
                    twisty.className = 'twisty';
                    twisty.textContent = node.type === 'dir' ? '▾' : '';
                    row.appendChild(twisty);

                    const name = document.createElement('span');
                    name.className = node.type === 'dir' ? 'name dir' : 'name file';
                    name.textContent = node.name;
                    row.appendChild(name);

                    li.appendChild(row);

                    row.addEventListener('click', () => {
                        selectedPath = node.path || '';
                        document.querySelectorAll('.node.selected').forEach(el => el.classList.remove('selected'));
                        row.classList.add('selected');
                    });

                    if (node.type === 'dir') {
                        const childList = document.createElement('ul');
                        (node.children || []).forEach(child => childList.appendChild(renderNode(child)));
                        li.appendChild(childList);

                        twisty.addEventListener('click', (event) => {
                            event.stopPropagation();
                            const collapsed = childList.classList.toggle('hidden');
                            twisty.textContent = collapsed ? '▸' : '▾';
                        });

                        name.addEventListener('click', () => {
                            const collapsed = childList.classList.toggle('hidden');
                            twisty.textContent = collapsed ? '▸' : '▾';
                        });
                    } else {
                        name.addEventListener('click', () => {
                            vscode.postMessage({ type: 'openPath', path: node.path });
                        });
                    }

                    return li;
                }

                function updateState() {
                    vscode.postMessage({
                        type: 'updateState',
                        state: {
                            filter: filterInput.value || '',
                            includeFiles: includeFiles.checked,
                            showHidden: showHidden.checked,
                            useGitignore: useGitignore.checked,
                            maxDepth: parseInt(maxDepth.value || '4', 10)
                        }
                    });
                }

                document.getElementById('refresh').addEventListener('click', () => {
                    updateState();
                });

                document.getElementById('copyPath').addEventListener('click', () => {
                    vscode.postMessage({ type: 'copyPath', path: selectedPath || '' });
                });

                document.getElementById('exportText').addEventListener('click', () => {
                    vscode.postMessage({ type: 'exportTextTree' });
                });

                filterInput.addEventListener('change', updateState);
                includeFiles.addEventListener('change', updateState);
                showHidden.addEventListener('change', updateState);
                useGitignore.addEventListener('change', updateState);
                maxDepth.addEventListener('change', updateState);

                filterInput.value = initialState.filter || '';
                includeFiles.checked = !!initialState.includeFiles;
                showHidden.checked = !!initialState.showHidden;
                useGitignore.checked = initialState.useGitignore !== false;
                maxDepth.value = String(initialState.maxDepth || 4);

                renderTree(initialData);
            </script>
        </body>
        </html>`;
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

    private async refreshProjectStructure(): Promise<void> {
        if (!this.structurePanel || !this.structureState) {
            return;
        }

        const data = this.buildProjectStructureData(this.structureState);
        this.structurePanel.webview.html = this.getProjectStructureHtml(
            this.structurePanel.webview,
            data,
            this.structureState
        );
    }

    private buildProjectStructureData(state: ProjectStructureState): StructureData {
        const maxEntries = 5000;
        let entryCount = 0;
        let files = 0;
        let directories = 0;
        const ignore = state.useGitignore ? this.getGitignoreMatcher(state.rootPath) : undefined;

        const shouldSkip = (name: string): boolean => {
            if (!state.showHidden && name.startsWith('.')) {
                return true;
            }
            return this.shouldSkipEntry(name);
        };

        const matchesFilter = (value: string): boolean => {
            if (!state.filter) {
                return true;
            }
            return value.toLowerCase().includes(state.filter.toLowerCase());
        };

        const walk = (currentPath: string, depth: number, relativePath: string): StructureNode[] => {
            if (depth > state.maxDepth) {
                return [];
            }

            const entries = fs.readdirSync(currentPath, { withFileTypes: true })
                .filter(entry => !shouldSkip(entry.name))
                .sort((a, b) => {
                    if (a.isDirectory() && !b.isDirectory()) {
                        return -1;
                    }
                    if (!a.isDirectory() && b.isDirectory()) {
                        return 1;
                    }
                    return a.name.localeCompare(b.name);
                });

            const nodes: StructureNode[] = [];

            for (const entry of entries) {
                if (entryCount >= maxEntries) {
                    return nodes;
                }
                entryCount++;

                const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
                const normalizedPath = entryPath.replace(/\\/g, '/');
                if (ignore?.isIgnored(normalizedPath, entry.isDirectory())) {
                    continue;
                }
                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    directories++;
                    const children = walk(fullPath, depth + 1, entryPath);
                    const childMatches = children.length > 0;
                    if (matchesFilter(entryPath) || childMatches) {
                        nodes.push({
                            name: entry.name,
                            path: normalizedPath,
                            type: 'dir',
                            children
                        });
                    }
                } else if (state.includeFiles) {
                    files++;
                    if (matchesFilter(entryPath)) {
                        nodes.push({
                            name: entry.name,
                            path: normalizedPath,
                            type: 'file'
                        });
                    }
                }
            }

            return nodes;
        };

        const nodes = walk(state.rootPath, 1, '');
        const truncated = entryCount >= maxEntries;

        return {
            rootName: state.rootName,
            rootPath: state.rootPath,
            nodes,
            counts: {
                files,
                directories,
                truncated
            }
        };
    }

    private async openStructurePath(relativePath: string): Promise<void> {
        if (!this.structureState) {
            return;
        }

        const fullPath = path.join(this.structureState.rootPath, relativePath);
        if (!fs.existsSync(fullPath)) {
            vscode.window.showWarningMessage(`路径不存在：${relativePath}`);
            return;
        }

        const uri = vscode.Uri.file(fullPath);
        await vscode.commands.executeCommand('vscode.open', uri);
    }

    private async copyStructurePath(relativePath: string): Promise<void> {
        if (!this.structureState) {
            return;
        }

        const text = relativePath?.trim()
            ? relativePath.replace(/\\/g, '/')
            : this.structureState.rootPath;

        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(`已复制：${text}`);
    }

    private async exportStructureAsText(): Promise<void> {
        if (!this.structureState) {
            return;
        }

        const data = this.buildProjectStructureData(this.structureState);
        const text = this.renderStructureTextTree(data);
        const doc = await vscode.workspace.openTextDocument({ content: text, language: 'text' });
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    }

    private renderStructureTextTree(data: StructureData): string {
        const lines: string[] = [];
        lines.push(data.rootName || path.basename(data.rootPath));

        const walk = (nodes: StructureNode[], prefix: string) => {
            nodes.forEach((node, index) => {
                const isLast = index === nodes.length - 1;
                const connector = isLast ? '└── ' : '├── ';
                const label = node.type === 'dir' ? `${node.name}/` : node.name;
                lines.push(`${prefix}${connector}${label}`);

                if (node.type === 'dir' && node.children?.length) {
                    const nextPrefix = isLast ? `${prefix}    ` : `${prefix}│   `;
                    walk(node.children, nextPrefix);
                }
            });
        };

        walk(data.nodes, '');
        return lines.join('\n');
    }

    private getGitignoreMatcher(rootPath: string): GitignoreMatcher {
        const cached = this.gitignoreCache.get(rootPath);
        if (cached) {
            return cached;
        }

        const gitignorePath = path.join(rootPath, '.gitignore');
        const content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
        const matcher = new GitignoreMatcher(content);
        this.gitignoreCache.set(rootPath, matcher);
        return matcher;
    }

    private shouldSkipEntry(name: string): boolean {
        const defaults = new Set(['node_modules', '.git', '.DS_Store', 'dist', 'build', 'out', 'coverage']);
        return defaults.has(name);
    }
}

type ProjectStructureState = {
    rootPath: string;
    rootName: string;
    includeFiles: boolean;
    showHidden: boolean;
    useGitignore: boolean;
    maxDepth: number;
    filter: string;
};

type StructureNode = {
    name: string;
    path: string;
    type: 'file' | 'dir';
    children?: StructureNode[];
};

type StructureData = {
    rootName: string;
    rootPath: string;
    nodes: StructureNode[];
    counts: {
        files: number;
        directories: number;
        truncated: boolean;
    };
};

class GitignoreMatcher {
    private rules: Array<{ negated: boolean; dirOnly: boolean; regex: RegExp }> = [];

    constructor(content: string) {
        this.rules = this.parse(content);
    }

    public isIgnored(pathPosix: string, isDir: boolean): boolean {
        const pathValue = (pathPosix || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
        if (!pathValue) {
            return false;
        }

        let ignored = false;
        for (const rule of this.rules) {
            if (rule.dirOnly) {
                if (!rule.regex.test(pathValue) && !rule.regex.test(`${pathValue}/`)) {
                    continue;
                }
            } else if (!rule.regex.test(pathValue)) {
                continue;
            }

            // Dir-only rules should also apply to files under that directory; handled via regex.
            ignored = !rule.negated;
        }

        if (!ignored) {
            return false;
        }

        // If ignored but explicitly a directory-only ignore and we're checking directory itself, still ignore.
        return ignored && (isDir ? true : true);
    }

    private parse(content: string): Array<{ negated: boolean; dirOnly: boolean; regex: RegExp }> {
        const lines = (content || '').split(/\r?\n/);
        const rules: Array<{ negated: boolean; dirOnly: boolean; regex: RegExp }> = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) {
                continue;
            }

            const negated = line.startsWith('!');
            const patternRaw = (negated ? line.slice(1) : line).trim();
            if (!patternRaw) {
                continue;
            }

            const dirOnly = patternRaw.endsWith('/');
            const pattern = dirOnly ? patternRaw.slice(0, -1) : patternRaw;
            const regex = this.compile(pattern, dirOnly);
            rules.push({ negated, dirOnly, regex });
        }

        return rules;
    }

    private compile(pattern: string, dirOnly: boolean): RegExp {
        const anchored = pattern.startsWith('/');
        const raw = anchored ? pattern.slice(1) : pattern;
        const hasSlash = raw.includes('/');
        const escaped = this.escapeRegex(raw);
        const globbed = escaped
            .replace(/\\\*\\\*/g, '.*')
            .replace(/\\\*/g, '[^/]*')
            .replace(/\\\?/g, '[^/]');

        const prefix = anchored ? '^' : hasSlash ? '^(?:.*/)?' : '^(?:.*/)?';
        const suffix = dirOnly ? '(?:/.*)?$' : '$';
        return new RegExp(`${prefix}${globbed}${suffix}`);
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
}

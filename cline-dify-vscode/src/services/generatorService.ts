import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { DifyService } from './difyService';
import { GenerationRun, ProjectPlan, ConflictStrategy } from './types';
import { LoggerService } from './loggerService';
import { ConfigService } from './configService';
import { pickWorkspaceFolder } from './workspaceService';
import { DependencyService } from './dependencyService';
import * as os from 'os';

const execAsync = util.promisify(exec);

export class GeneratorService {
    private context: vscode.ExtensionContext;
    private difyService: DifyService;
    private configService: ConfigService;
    private logger: LoggerService;
    private outputChannel: vscode.OutputChannel;
    private dependencyService: DependencyService;

    constructor(context: vscode.ExtensionContext, difyService: DifyService) {
        this.context = context;
        this.difyService = difyService;
        this.configService = new ConfigService();
        this.logger = new LoggerService();
        this.outputChannel = vscode.window.createOutputChannel('Cline Dify Generator');
        this.dependencyService = new DependencyService();
    }

    private logPlanDebug(message: string, metadata?: Record<string, unknown>): void {
        this.outputChannel.appendLine(`[plan] ${message}${metadata ? ` ${JSON.stringify(metadata)}` : ''}`);
    }

    private getExtensionVersion(): string {
        const version = (this.context.extension?.packageJSON as any)?.version;
        return typeof version === 'string' && version.trim() ? version.trim() : 'unknown';
    }

    private getConfiguredModel(): string {
        const provider = this.configService.get<string>('provider');
        return provider === 'ollama'
            ? this.configService.get<string>('ollamaModel')
            : this.configService.get<string>('model');
    }

    private getGenerationOptions(): { model: string; temperature: number; maxTokens: number } {
        return {
            model: this.getConfiguredModel(),
            temperature: this.configService.get<number>('generator.temperature'),
            maxTokens: this.configService.get<number>('generator.maxTokens')
        };
    }

    private async writeGenerationRun(projectRoot: string, run: GenerationRun): Promise<void> {
        const outputPath = path.join(projectRoot, 'GENERATION_RUN.json');
        fs.writeFileSync(outputPath, JSON.stringify(run, null, 2));
    }

    /**
     * Start the dual-role generator workflow
     */
    public async startDualRoleGenerator() {
        const workspaceFolder = await pickWorkspaceFolder('选择用于生成代码的工作区文件夹');
        if (!workspaceFolder) {
            this.logger.showWarning('No workspace folder open.');
            return;
        }

        // Get project description from user
        const projectDescription = await this.logger.showInputBox({
            prompt: 'Describe your project or feature:',
            placeHolder: 'e.g., A React component library with Button, Input, and Card components'
        });

        if (!projectDescription) {
            return;
        }

        await this.logger.showProgress('Starting Dual-Role Generator...', async (progress) => {
            // Step 1: Planner Role - Generate Development Documentation
            progress.report({ message: 'Generating structured plan (JSON)...' });
            const plan = await this.generateStructuredPlan(projectDescription, workspaceFolder.uri.fsPath);
            if (!plan) {
                this.logger.showWarning('Failed to generate a valid structured plan. 请查看 “Cline Dify Generator” 输出与 DEVELOPMENT_PLAN.raw.txt。');
                this.outputChannel.show(true);
                return;
            }

            // Save and show the structured plan
            const docPath = path.join(workspaceFolder.uri.fsPath, 'DEVELOPMENT_PLAN.json');
            try {
                fs.writeFileSync(docPath, JSON.stringify(plan, null, 2));
                await vscode.window.showTextDocument(vscode.Uri.file(docPath));
                this.logger.showInfo('Structured plan generated successfully!');
            } catch (error) {
                this.logger.error('Failed to write development documentation:', error instanceof Error ? error : new Error(String(error)));
                this.logger.showWarning('Failed to save DEVELOPMENT_PLAN.json. Please check file permissions.');
                return;
            }

            // Step 2: Ask user if they want to proceed with code generation
            const proceed = await this.logger.showQuickPick([
                { label: 'Yes' },
                { label: 'No' }
            ], {
                placeHolder: 'Do you want to proceed with code generation based on the plan?'
            });

            if (!proceed || proceed.label !== 'Yes') {
                return;
            }

            await this.maybeApplyDependencies(plan, workspaceFolder.uri.fsPath);

            // Step 3: Executor Role - Generate Code Based on Documentation
            progress.report({ message: 'Previewing planned changes...' });
            const selected = await this.previewPlanAndSelectFiles(plan, workspaceFolder.uri.fsPath);
            if (!selected) {
                return;
            }

            const modePick = await this.logger.showQuickPick(
                [
                    { label: 'Apply (write files)', description: '实际创建目录并写入文件' },
                    { label: 'Dry Run (no writes)', description: '仅预览，不写入任何文件' }
                ],
                { placeHolder: '选择执行模式', ignoreFocusOut: true }
            );
            if (!modePick) {
                return;
            }

            const mode: GenerationRun['mode'] = modePick.label.startsWith('Dry') ? 'dry-run' : 'apply';
            const runId = `run-${Date.now()}`;
            const { model, temperature, maxTokens } = this.getGenerationOptions();
            const provider = this.configService.get<string>('provider');
            const conflictStrategy = this.configService.get<ConflictStrategy>('generator.conflictStrategy');

            const run: GenerationRun = {
                runId,
                startedAt: new Date().toISOString(),
                mode,
                projectRoot: workspaceFolder.uri.fsPath,
                planPath: 'DEVELOPMENT_PLAN.json',
                projectDescription,
                provider,
                model,
                temperature,
                maxTokens,
                selectedFiles: selected,
                conflictStrategy
            };

            try {
                await this.writeGenerationRun(workspaceFolder.uri.fsPath, run);
            } catch (error) {
                this.logger.warn('Failed to write GENERATION_RUN.json', { error: String(error) });
            }

            if (mode === 'dry-run') {
                run.result = this.simulateGeneration(plan, selected, workspaceFolder.uri.fsPath);
                run.endedAt = new Date().toISOString();
                await this.writeGenerationRun(workspaceFolder.uri.fsPath, run);
                this.logger.showInfo('Dry run 完成：未写入任何文件。已生成 GENERATION_RUN.json。');
                return;
            }

            progress.report({ message: 'Generating code from structured plan...' });
            run.result = await this.generateCodeFromPlan(plan, selected, workspaceFolder.uri.fsPath);
            run.endedAt = new Date().toISOString();
            await this.writeGenerationRun(workspaceFolder.uri.fsPath, run);
        });
    }

    /**
     * Planner Role: Generate structured plan JSON
     */
    private async generateStructuredPlan(projectDescription: string, projectRoot: string): Promise<ProjectPlan | null> {
        const generatorVersion = this.getExtensionVersion();
        const { model, temperature, maxTokens } = this.getGenerationOptions();
        const provider = this.configService.get<string>('provider');
        this.logPlanDebug('start', { provider, model, temperature, maxTokens });
        const prompt = `You are an expert AI development planner.

Create a STRICT JSON plan for the following project:
${projectDescription}

Rules:
- Output ONLY valid JSON. No markdown, no backticks, no comments.
- Use UTF-8 plain text.
- All paths MUST be relative to the project root, use forward slashes, and must NOT contain '..' or start with '/'.
- The plan must include every directory and file that will be created.
- The plan version MUST be exactly "1.0.0".
- metadata.generatorVersion MUST be exactly "${generatorVersion}".
- metadata.model MUST be exactly "${model}".
- "dependencies" MUST list all required third-party packages (both runtime and dev). Prefer pinned versions using npm spec format:
  - unscoped: "react@^18.2.0"
  - scoped: "@types/node@^20.11.0" (use the LAST '@' as version delimiter)
- Do NOT include Node.js built-in modules in "dependencies" (fs, path, http, etc).

JSON Schema (strict):
{
  "version": "1.0.0",
  "projectName": string,
  "description": string,
  "directories": string[],
  "files": [{
    "path": string,
    "purpose": string,
    "language": string,
    "dependencies": string[],
    "overwrite": boolean
  }],
  "steps": [{
    "id": string,
    "name": string,
    "description": string,
    "dependencies": string[],
    "action": "create" | "modify" | "delete" | "run" | "test",
    "target": string
  }],
  "dependencies": string[],
  "metadata": {
    "generatedAt": string,
    "generatorVersion": "${generatorVersion}",
    "model": "${model}"
  }
}

Example:
{
  "version": "1.0.0",
  "projectName": "My React App",
  "description": "A simple React application with modern tooling",
  "directories": ["src", "src/components", "src/utils"],
  "files": [
    {
      "path": "src/index.jsx",
      "purpose": "Application entry point",
      "language": "javascriptreact",
      "dependencies": [],
      "overwrite": false
    },
    {
      "path": "src/App.jsx",
      "purpose": "Main application component",
      "language": "javascriptreact",
      "dependencies": ["src/index.jsx"],
      "overwrite": false
    }
  ],
  "steps": [
    {
      "id": "1",
      "name": "Create project structure",
      "description": "Create the basic directory structure",
      "dependencies": [],
      "action": "create",
      "target": "."
    }
  ],
  "dependencies": ["react", "react-dom", "vite"],
  "metadata": {
    "generatedAt": "2025-01-01T00:00:00.000Z",
    "generatorVersion": "${generatorVersion}",
    "model": "${model}"
  }
	}
	`;

        try {
            fs.writeFileSync(path.join(projectRoot, 'DEVELOPMENT_PLAN.prompt.txt'), prompt);
        } catch (error) {
            this.logger.warn('Failed to write DEVELOPMENT_PLAN.prompt.txt', { error: String(error) });
        }

        const raw = await this.difyService.getModelResponse(prompt, '规划 JSON', { model, temperature, maxTokens });
        if (!raw?.trim()) {
            this.reportPlanFailure('Empty response from model', raw ?? '', projectRoot);
            return null;
        }

        const plan = this.parseJsonFromModel(raw);
        if (!plan) {
            const repaired = await this.tryRepairPlanJson(raw, 'JSON parse failed', projectRoot);
            if (!repaired) {
                this.reportPlanFailure('JSON parse failed', raw, projectRoot);
                return null;
            }
            return repaired;
        }

        const validated = this.validatePlan(plan);
        if (validated.ok) {
            return validated.plan;
        }

        const repaired = await this.tryRepairPlanJson(raw, validated.error, projectRoot);
        if (repaired) {
            return repaired;
        }

        this.reportPlanFailure(validated.error, raw, projectRoot);
        return null;
    }

    /**
     * Executor Role: Generate code based on structured plan
     */
    private async generateCodeFromPlan(
        plan: ProjectPlan,
        selectedFiles: string[],
        projectRoot: string
    ): Promise<{ generated: number; skipped: number; blocked: number; failed: number }> {
        const directoriesToCreate = new Set<string>();
        plan.directories.forEach(dir => {
            const normalized = this.normalizeRelativePath(dir, true);
            if (normalized && normalized !== '.') {
                directoriesToCreate.add(normalized);
            }
        });

        for (const file of selectedFiles) {
            const dirName = path.posix.dirname(file);
            if (dirName && dirName !== '.') {
                directoriesToCreate.add(dirName);
            }
        }

        // Create directories
        for (const dir of directoriesToCreate) {
            const dirPath = path.join(projectRoot, dir);
            if (fs.existsSync(dirPath)) {
                continue;
            }
            try {
                fs.mkdirSync(dirPath, { recursive: true });
                this.logger.info(`Created directory: ${dir}`);
            } catch (error) {
                this.logger.error(`Failed to create directory ${dir}:`, error instanceof Error ? error : new Error(String(error)));
                this.logger.showWarning(`Failed to create directory: ${dir}`);
                return { generated: 0, skipped: 0, blocked: 0, failed: 1 };
            }
        }

        let generatedCount = 0;
        let skippedCount = 0;
        let blockedCount = 0;
        let failedCount = 0;
        
        // Get conflict strategy from configuration
        const conflictStrategy = this.configService.get<ConflictStrategy>('generator.conflictStrategy');
        let conflictMode: 'ask' | 'overwriteAll' | 'skipAll' = conflictStrategy === 'ask' ? 'ask' : 
                                                         conflictStrategy === 'overwrite' ? 'overwriteAll' : 'skipAll';

        for (const relativeFilePath of selectedFiles) {
            const absolute = path.join(projectRoot, relativeFilePath);
            if (!this.isPathInsideProject(projectRoot, absolute)) {
                this.logger.showWarning(`Blocked unsafe path: ${relativeFilePath}`);
                blockedCount++;
                continue;
            }

            if (fs.existsSync(absolute)) {
                if (conflictMode === 'skipAll') {
                    skippedCount++;
                    this.logger.info(`Skipped existing file: ${relativeFilePath}`);
                    continue;
                }

                if (conflictMode !== 'overwriteAll') {
                    const decision = await this.promptFileConflict(relativeFilePath);
                    if (decision === 'cancel') {
                        this.logger.showInfo('Code generation cancelled.');
                        return { generated: generatedCount, skipped: skippedCount, blocked: blockedCount, failed: failedCount };
                    } else if (decision === 'skip') {
                        skippedCount++;
                        this.logger.info(`Skipped existing file: ${relativeFilePath}`);
                        continue;
                    } else if (decision === 'skipAll') {
                        conflictMode = 'skipAll';
                        skippedCount++;
                        this.logger.info(`Skipped existing file: ${relativeFilePath}`);
                        continue;
                    } else if (decision === 'overwriteAll') {
                        conflictMode = 'overwriteAll';
                    }
                }
            }

            const fileSpec = plan.files.find(f => this.normalizeRelativePath(f.path) === relativeFilePath);
            const fileContent = await this.generateFileContent(plan, fileSpec ?? { 
                path: relativeFilePath, 
                purpose: 'Generated file',
                language: 'unknown',
                dependencies: [],
                overwrite: false
            });
            if (!fileContent) {
                this.logger.showWarning(`No content generated for ${relativeFilePath}`);
                continue;
            }

            try {
                fs.writeFileSync(absolute, fileContent);
                generatedCount++;
                this.logger.showInfo(`Generated file: ${relativeFilePath}`);
            } catch (error) {
                this.logger.error(`Failed to write file ${relativeFilePath}:`, error instanceof Error ? error : new Error(String(error)));
                this.logger.showWarning(`Failed to write file: ${relativeFilePath}`);
                failedCount++;
            }
        }

        if (generatedCount === 0) {
            this.logger.showWarning('No files were generated. Please review the structured plan and try again.');
        } else {
            const summary = `Code generation completed. Generated ${generatedCount} file(s).${skippedCount ? ` Skipped ${skippedCount} existing file(s).` : ''}`;
            this.logger.showInfo(summary);
        }
        return { generated: generatedCount, skipped: skippedCount, blocked: blockedCount, failed: failedCount };
    }

    private simulateGeneration(
        _plan: ProjectPlan,
        selectedFiles: string[],
        projectRoot: string
    ): { generated: number; skipped: number; blocked: number; failed: number } {
        let skipped = 0;
        let blocked = 0;

        for (const relativeFilePath of selectedFiles) {
            const absolute = path.join(projectRoot, relativeFilePath);
            if (!this.isPathInsideProject(projectRoot, absolute)) {
                blocked++;
                continue;
            }
            if (fs.existsSync(absolute)) {
                skipped++;
            }
        }

        return { generated: 0, skipped, blocked, failed: 0 };
    }

    /**
     * Generate content for a specific file based on documentation
     */
    private async generateFileContent(plan: ProjectPlan, file: ProjectPlan['files'][0]): Promise<string> {
        const dependencyList = Array.isArray(plan.dependencies) ? plan.dependencies.join(', ') : '';
        const prompt = `You are an expert AI code generator.\n\nYou MUST generate the complete code for exactly ONE file.\n\nTarget file (relative to project root): ${file.path}\nDescription: ${file.purpose}\nLanguage: ${file.language}\n\nProject plan (JSON):\n${JSON.stringify(plan)}\n\nStrict requirements:\n- Output ONLY the code content for the target file. No markdown fences. No explanations.\n- Do NOT change the target file path or create other files.\n- Assume all other files/directories from the plan exist at their specified relative paths.\n- Use correct relative imports consistent with the plan.\n- Third-party imports MUST come ONLY from this dependency list (or be local relative imports): ${dependencyList}\n`;

        const { model, temperature, maxTokens } = this.getGenerationOptions();
        return this.difyService.getModelResponse(prompt, `生成文件 ${file.path}`, { model, temperature, maxTokens });
    }

    private async maybeApplyDependencies(plan: ProjectPlan, projectRoot: string): Promise<void> {
        const deps = Array.isArray(plan.dependencies) ? plan.dependencies.filter(d => typeof d === 'string' && d.trim()) : [];
        if (!deps.length) {
            return;
        }

        const choice = await this.logger.showQuickPick(
            [
                { label: '写入 package.json（推荐）', description: '把依赖合并到 package.json，并生成 DEPENDENCIES.md' },
                { label: '仅生成 DEPENDENCIES.md', description: '不修改 package.json，仅导出依赖清单与安装命令' },
                { label: '跳过', description: '暂不处理依赖' }
            ],
            { placeHolder: '检测到计划包含 dependencies，是否应用依赖？', ignoreFocusOut: true }
        );

        if (!choice || choice.label === '跳过') {
            return;
        }

        if (choice.label.startsWith('仅生成')) {
            const parsed = this.dependencyService.parseDependencies(deps);
            const pm = this.dependencyService.detectPackageManager(projectRoot);
            const cmd = this.dependencyService.buildInstallCommand(pm, parsed.entries);
            const markdownPath = path.join(projectRoot, 'DEPENDENCIES.md');
            fs.writeFileSync(
                markdownPath,
                ['# Dependencies', '', 'This file is generated by Cline Dify Assistant.', '', `- Package manager: \`${pm}\``, '', '## Install', '', '```sh', cmd || '# (no dependencies)', '```', ''].join('\n')
            );

            if (parsed.warnings.length) {
                this.outputChannel.appendLine('[deps] warnings ' + JSON.stringify(parsed.warnings));
                this.outputChannel.show(true);
            }

            const action = await this.logger.showInfo('已生成 DEPENDENCIES.md。', ['打开文件', '复制安装命令']);
            if (action === '打开文件') {
                await vscode.window.showTextDocument(vscode.Uri.file(markdownPath), { preview: false });
            } else if (action === '复制安装命令') {
                await vscode.env.clipboard.writeText(cmd);
                this.logger.showInfo('已复制安装命令到剪贴板。');
            }
            return;
        }

        const result = this.dependencyService.applyDependencies(projectRoot, deps);
        if (result.warnings.length) {
            this.outputChannel.appendLine('[deps] warnings ' + JSON.stringify(result.warnings));
        }
        this.outputChannel.appendLine('[deps] added ' + JSON.stringify(result.added));
        this.outputChannel.appendLine('[deps] addedDev ' + JSON.stringify(result.addedDev));
        if (result.skipped.length) {
            this.outputChannel.appendLine('[deps] skipped ' + JSON.stringify(result.skipped));
        }
        this.outputChannel.show(true);

        const picked = await this.logger.showInfo(
            `已更新依赖：dependencies +${Object.keys(result.added).length}，devDependencies +${Object.keys(result.addedDev).length}。`,
            ['打开 DEPENDENCIES.md', '复制安装命令']
        );

        if (picked === '打开 DEPENDENCIES.md') {
            await vscode.window.showTextDocument(vscode.Uri.file(result.markdownPath), { preview: false });
        } else if (picked === '复制安装命令') {
            await vscode.env.clipboard.writeText(result.installCommand || '');
            this.logger.showInfo('已复制安装命令到剪贴板。');
            if (result.installCommand) {
                this.outputChannel.appendLine('[deps] install');
                this.outputChannel.appendLine(result.installCommand + os.EOL);
            }
        }
    }

    /**
     * Debug generated code
     */
    public async debugGeneratedCode() {
        const workspaceFolder = await pickWorkspaceFolder('选择要运行调试命令的工作区文件夹');
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        const testCommand = await vscode.window.showInputBox({
            prompt: 'Enter test command to run (e.g., npm test, yarn build):',
            placeHolder: 'npm test'
        });

        if (!testCommand) {
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running: ${testCommand}`,
                cancellable: false
            }, async () => {
                try {
                    const { stdout, stderr } = await execAsync(testCommand, { cwd: workspaceFolder.uri.fsPath });
                    this.logDebugOutput(testCommand, stdout, stderr);
                } catch (error: any) {
                    this.logDebugOutput(testCommand, error.stdout ?? '', error.stderr ?? error.message ?? '');
                    throw error;
                }
            });

            vscode.window.showInformationMessage('Debug command completed. Check the "Cline Dify Generator" output for details.');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Debug command failed: ${error.message ?? error}`);
        }
    }

    private async previewPlanAndSelectFiles(plan: ProjectPlan, projectRoot: string): Promise<string[] | null> {

        const fileItems = plan.files
            .map(file => {
                const normalized = this.normalizeRelativePath(file.path);
                if (!normalized) {
                    return null;
                }
                const absolute = path.join(projectRoot, normalized);
                const exists = fs.existsSync(absolute);
                return {
                    label: normalized,
                    description: `${exists ? 'exists' : 'new'} · ${file.purpose}`,
                    picked: true
                };
            })
            .filter(Boolean) as Array<{ label: string; description: string; picked: boolean }>;

        if (fileItems.length === 0) {
            this.logger.showWarning('Structured plan contains no valid files to generate.');
            return null;
        }

        const picked = await vscode.window.showQuickPick(fileItems, {
            canPickMany: true,
            ignoreFocusOut: true,
            placeHolder: '选择要生成的文件（可多选）'
        });

        if (!picked) {
            return null;
        }

        const selected = picked.map(item => item.label);
        if (selected.length === 0) {
            this.logger.showWarning('No files selected.');
            return null;
        }

        const directoriesToCreate = new Set<string>();
        plan.directories.forEach(dir => {
            const normalized = this.normalizeRelativePath(dir, true);
            if (normalized && normalized !== '.') {
                directoriesToCreate.add(normalized);
            }
        });
        selected.forEach(file => {
            const dirName = path.posix.dirname(file);
            if (dirName && dirName !== '.') {
                directoriesToCreate.add(dirName);
            }
        });
        const newDirectories = Array.from(directoriesToCreate).filter(dir => !fs.existsSync(path.join(projectRoot, dir)));
        const existingFiles = selected.filter(file => fs.existsSync(path.join(projectRoot, file)));

        const confirmation = await this.logger.showInfo(
            `预览：将生成 ${selected.length} 个文件（其中 ${existingFiles.length} 个已存在），并创建 ${newDirectories.length} 个目录（若不存在）。继续吗？`,
            ['继续', '取消']
        );
        if (confirmation !== '继续') {
            return null;
        }

        return selected;
    }

    private parseJsonFromModel(raw: string): ProjectPlan | null {
        const trimmed = raw.trim();
        const candidate = this.extractJsonBlock(trimmed);
        if (!candidate) {
            return null;
        }

        try {
            return JSON.parse(candidate) as ProjectPlan;
        } catch {
            return null;
        }
    }

    private async tryRepairPlanJson(raw: string, reason: string, projectRoot: string): Promise<ProjectPlan | null> {
        const { model, temperature, maxTokens } = this.getGenerationOptions();
        const prompt = `You will be given an invalid JSON draft.\nFix it into valid JSON that conforms to this plan schema exactly.\nOutput ONLY valid JSON.\n\nFailure reason:\n${reason}\n\nInvalid draft:\n${raw}`;
        try {
            fs.writeFileSync(path.join(projectRoot, 'DEVELOPMENT_PLAN.repair_prompt.txt'), prompt);
        } catch (error) {
            this.logger.warn('Failed to write DEVELOPMENT_PLAN.repair_prompt.txt', { error: String(error) });
        }
        const repairedRaw = await this.difyService.getModelResponse(prompt, '修复规划 JSON', { model, temperature, maxTokens });
        if (!repairedRaw) {
            return null;
        }
        const plan = this.parseJsonFromModel(repairedRaw);
        if (!plan) {
            return null;
        }
        const validated = this.validatePlan(plan);
        return validated.ok ? validated.plan : null;
    }

    private extractJsonBlock(raw: string): string | null {
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenceMatch && fenceMatch[1]) {
            return fenceMatch[1].trim();
        }

        const first = raw.indexOf('{');
        const last = raw.lastIndexOf('}');
        if (first >= 0 && last > first) {
            return raw.slice(first, last + 1).trim();
        }

        return null;
    }

    private reportPlanFailure(reason: string, raw: string, projectRoot: string): void {
        const provider = this.configService.get<string>('provider');
        const baseUrl = provider === 'ollama'
            ? this.configService.get<string>('ollamaBaseUrl')
            : this.configService.get<string>('baseUrl');
        const model = this.getConfiguredModel();
        const outputPath = path.join(projectRoot, 'DEVELOPMENT_PLAN.raw.txt');
        try {
            fs.writeFileSync(outputPath, raw);
        } catch (error) {
            this.logger.warn('Failed to write raw plan output', { error: String(error) });
        }

        this.outputChannel.appendLine('[Plan Validation Failed]');
        this.outputChannel.appendLine(`Reason: ${reason}`);
        this.outputChannel.appendLine(`Provider: ${provider}`);
        this.outputChannel.appendLine(`Base URL: ${baseUrl}`);
        this.outputChannel.appendLine(`Model: ${model}`);
        this.outputChannel.appendLine('Raw response saved to DEVELOPMENT_PLAN.raw.txt');
        this.outputChannel.appendLine('Prompt saved to DEVELOPMENT_PLAN.prompt.txt');
        this.outputChannel.appendLine('----- RAW START -----');
        this.outputChannel.appendLine(raw);
        this.outputChannel.appendLine('----- RAW END -----');
        this.outputChannel.show(true);

        const hint = provider === 'ollama'
            ? '（提示：请确认 Ollama 服务已启动且 baseUrl 可访问，例如 http://localhost:11434）'
            : '';
        this.logger.showWarning(`Structured plan invalid: ${reason}. 已保存 DEVELOPMENT_PLAN.raw.txt / DEVELOPMENT_PLAN.prompt.txt。${hint}`);
    }

    private coercePlanShape(plan: any): { plan: ProjectPlan; warnings: string[] } {
        const warnings: string[] = [];
        const safeObject = (value: any): Record<string, any> => (value && typeof value === 'object') ? value : {};
        const safeArray = <T>(value: any): T[] => Array.isArray(value) ? value : [];

        const metadata = safeObject(plan?.metadata);

        const coerced: ProjectPlan = {
            version: typeof plan?.version === 'string' ? plan.version : '1.0.0',
            projectName: typeof plan?.projectName === 'string' ? plan.projectName : '',
            description: typeof plan?.description === 'string' ? plan.description : '',
            directories: safeArray<string>(plan?.directories).filter(v => typeof v === 'string'),
            files: safeArray<any>(plan?.files),
            steps: safeArray<any>(plan?.steps),
            dependencies: safeArray<string>(plan?.dependencies).filter(v => typeof v === 'string'),
            metadata: {
                generatedAt: typeof metadata.generatedAt === 'string' ? metadata.generatedAt : new Date().toISOString(),
                generatorVersion: typeof metadata.generatorVersion === 'string' ? metadata.generatorVersion : this.getExtensionVersion(),
                model: typeof metadata.model === 'string' ? metadata.model : this.getConfiguredModel()
            }
        };

        if (!Array.isArray(plan?.directories)) {
            warnings.push('directories missing; defaulted to []');
        }
        if (!Array.isArray(plan?.files)) {
            warnings.push('files missing; defaulted to []');
        }
        if (!Array.isArray(plan?.steps)) {
            warnings.push('steps missing; defaulted to []');
        }
        if (!Array.isArray(plan?.dependencies)) {
            warnings.push('dependencies missing; defaulted to []');
        }

        return { plan: coerced, warnings };
    }

    private normalizePlanForValidation(plan: ProjectPlan): { plan: ProjectPlan; warnings: string[] } {
        const warnings: string[] = [];

        const normalizedDirs = new Set<string>();
        for (const dir of plan.directories ?? []) {
            const normalized = this.normalizeRelativePath(dir, true);
            if (!normalized) {
                warnings.push(`Dropped invalid directory path: ${dir}`);
                continue;
            }
            if (normalized !== '.') {
                normalizedDirs.add(normalized);
            }
        }

        const normalizedFiles: ProjectPlan['files'] = [];
        const filePathSet = new Set<string>();

        for (const file of plan.files ?? []) {
            if (!file || typeof file !== 'object') {
                warnings.push('Dropped invalid file entry');
                continue;
            }

            const normalizedPath = this.normalizeRelativePath((file as any).path, false);
            if (!normalizedPath) {
                warnings.push(`Dropped invalid file path: ${(file as any).path}`);
                continue;
            }

            if (filePathSet.has(normalizedPath)) {
                warnings.push(`Dropped duplicate file path: ${normalizedPath}`);
                continue;
            }

            const purpose = typeof (file as any).purpose === 'string' ? (file as any).purpose : '';
            const language = typeof (file as any).language === 'string' ? (file as any).language : '';
            if (!purpose.trim()) {
                warnings.push(`Missing purpose for file: ${normalizedPath}`);
            }
            if (!language.trim()) {
                warnings.push(`Missing language for file: ${normalizedPath}`);
            }

            const depsRaw = Array.isArray((file as any).dependencies) ? (file as any).dependencies : [];
            if (!Array.isArray((file as any).dependencies)) {
                warnings.push(`dependencies missing for file: ${normalizedPath} (defaulted to [])`);
            }

            const normalizedDeps: string[] = [];
            for (const dep of depsRaw) {
                if (typeof dep !== 'string' || !dep.trim()) {
                    continue;
                }
                const normalizedDep = this.normalizeRelativePath(dep, false);
                if (!normalizedDep) {
                    warnings.push(`Dropped invalid dependency '${dep}' for file: ${normalizedPath}`);
                    continue;
                }
                normalizedDeps.push(normalizedDep);
            }

            filePathSet.add(normalizedPath);
            normalizedFiles.push({
                path: normalizedPath,
                purpose,
                language,
                dependencies: normalizedDeps,
                overwrite: (file as any).overwrite === true
            });
        }

        // Drop unknown file dependency references instead of failing the whole plan.
        for (const file of normalizedFiles) {
            const before = file.dependencies.length;
            file.dependencies = file.dependencies.filter(dep => filePathSet.has(dep));
            if (file.dependencies.length !== before) {
                warnings.push(`Dropped unknown file dependencies for ${file.path}`);
            }
        }

        const steps = Array.isArray(plan.steps) ? plan.steps : [];
        const normalizedSteps: ProjectPlan['steps'] = [];
        const stepIds = new Set<string>();

        for (const step of steps) {
            if (!step || typeof step !== 'object') {
                warnings.push('Dropped invalid step entry');
                continue;
            }
            const id = typeof (step as any).id === 'string' ? (step as any).id : '';
            const name = typeof (step as any).name === 'string' ? (step as any).name : '';
            const description = typeof (step as any).description === 'string' ? (step as any).description : '';
            const action = (step as any).action;

            if (!id.trim()) {
                warnings.push('Dropped step with missing id');
                continue;
            }
            if (stepIds.has(id)) {
                warnings.push(`Dropped duplicate step id: ${id}`);
                continue;
            }
            stepIds.add(id);

            const depsRaw = Array.isArray((step as any).dependencies) ? (step as any).dependencies : [];
            const deps = depsRaw.filter((d: any) => typeof d === 'string' && d.trim());

            normalizedSteps.push({
                id,
                name,
                description,
                dependencies: deps,
                action: (['create', 'modify', 'delete', 'run', 'test'] as const).includes(action) ? action : 'create',
                target: typeof (step as any).target === 'string' ? (step as any).target : undefined
            });
        }

        // Drop unknown step dependencies instead of failing the whole plan.
        for (const step of normalizedSteps) {
            const before = step.dependencies.length;
            step.dependencies = step.dependencies.filter(dep => stepIds.has(dep));
            if (step.dependencies.length !== before) {
                warnings.push(`Dropped unknown step dependencies for step: ${step.id}`);
            }
        }

        const generatorVersion = this.getExtensionVersion();
        const model = this.getConfiguredModel();
        const updated: ProjectPlan = {
            ...plan,
            directories: Array.from(normalizedDirs),
            files: normalizedFiles,
            steps: normalizedSteps,
            dependencies: Array.isArray(plan.dependencies) ? plan.dependencies.filter(d => typeof d === 'string') : [],
            metadata: {
                ...plan.metadata,
                generatedAt: typeof plan.metadata?.generatedAt === 'string' && plan.metadata.generatedAt.trim()
                    ? plan.metadata.generatedAt
                    : new Date().toISOString(),
                generatorVersion,
                model
            }
        };

        if (!updated.files.length) {
            warnings.push('Plan contains no files');
        }

        return { plan: updated, warnings };
    }

    /* eslint-disable no-mixed-spaces-and-tabs */
	    private validatePlan(plan: ProjectPlan): { ok: true; plan: ProjectPlan } | { ok: false; error: string } {
	        if (!plan) {
	            return { ok: false, error: 'Plan is empty' };
	        }

            const { plan: coerced, warnings: shapeWarnings } = this.coercePlanShape(plan as any);
            const { plan: normalized, warnings: normalizeWarnings } = this.normalizePlanForValidation(coerced);
            const warnings = [...shapeWarnings, ...normalizeWarnings];
            if (warnings.length) {
                this.logPlanDebug('validate warnings', { warnings });
            }

	        if (normalized.version !== '1.0.0') {
	            return { ok: false, error: 'Plan version must be 1.0.0' };
	        }

	        if (!normalized.projectName || typeof normalized.projectName !== 'string' || !normalized.projectName.trim()) {
	            return { ok: false, error: 'Missing projectName' };
	        }

	        if (!normalized.description || typeof normalized.description !== 'string' || !normalized.description.trim()) {
	            return { ok: false, error: 'Missing description' };
	        }

	        if (!Array.isArray(normalized.files) || normalized.files.length === 0) {
	            return { ok: false, error: 'Plan contains no files' };
	        }

	        // Security-critical checks: file paths must be safe and unique (handled by normalization).
	        for (const file of normalized.files) {
	            if (!file.path || typeof file.path !== 'string') {
	                return { ok: false, error: 'Invalid file path' };
	            }
	        }

	        return { ok: true, plan: normalized };
	    }

    /* eslint-enable no-mixed-spaces-and-tabs */
    private normalizeRelativePath(value: string, treatAsDirectory: boolean = false): string | null {
        if (!value || typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim().replace(/\\/g, '/').replace(/^\.\/+/, '');
        if (!trimmed || trimmed.startsWith('/') || trimmed.includes('\0')) {
            return null;
        }
        if (trimmed.split('/').some(segment => segment === '..')) {
            return null;
        }
        const normalized = trimmed.replace(/\/\/+/g, '/').replace(/\/+$/, treatAsDirectory ? '' : '');
        if (!normalized) {
            return null;
        }
        return normalized;
    }

    private isPathInsideProject(projectRoot: string, candidatePath: string): boolean {
        const resolvedRoot = path.resolve(projectRoot);
        const resolvedCandidate = path.resolve(candidatePath);
        return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
    }

    private async promptFileConflict(file: string): Promise<'overwrite' | 'overwriteAll' | 'skip' | 'skipAll' | 'cancel'> {
        const choice = await vscode.window.showWarningMessage(
            `File ${file} already exists. How should I handle it?`,
            { modal: true },
            'Overwrite',
            'Overwrite All',
            'Skip',
            'Skip All',
            'Cancel'
        );

        switch (choice) {
            case 'Overwrite':
                return 'overwrite';
            case 'Overwrite All':
                return 'overwriteAll';
            case 'Skip':
                return 'skip';
            case 'Skip All':
                return 'skipAll';
            case 'Cancel':
            case undefined:
                return 'cancel';
            default:
                return 'cancel';
        }
    }

    private logDebugOutput(command: string, stdout: string, stderr: string) {
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
}

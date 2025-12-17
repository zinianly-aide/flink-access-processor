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

const execAsync = util.promisify(exec);

export class GeneratorService {
    private context: vscode.ExtensionContext;
    private difyService: DifyService;
    private configService: ConfigService;
    private logger: LoggerService;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext, difyService: DifyService) {
        this.context = context;
        this.difyService = difyService;
        this.configService = new ConfigService();
        this.logger = new LoggerService();
        this.outputChannel = vscode.window.createOutputChannel('Cline Dify Generator');
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
            const plan = await this.generateStructuredPlan(projectDescription);
            if (!plan) {
                this.logger.showWarning('Failed to generate a valid structured plan.');
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
    private async generateStructuredPlan(projectDescription: string): Promise<ProjectPlan | null> {
        const generatorVersion = this.getExtensionVersion();
        const { model, temperature, maxTokens } = this.getGenerationOptions();
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

        const raw = await this.difyService.getModelResponse(prompt, '规划 JSON', { model, temperature, maxTokens });
        if (!raw) {
            return null;
        }

        const plan = this.parseJsonFromModel(raw);
        if (!plan) {
            const repaired = await this.tryRepairPlanJson(raw);
            if (!repaired) {
                return null;
            }
            return repaired;
        }

        const validated = this.validatePlan(plan);
        return validated.ok ? validated.plan : null;
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
        const prompt = `You are an expert AI code generator.\n\nYou MUST generate the complete code for exactly ONE file.\n\nTarget file (relative to project root): ${file.path}\nDescription: ${file.purpose}\nLanguage: ${file.language}\n\nProject plan (JSON):\n${JSON.stringify(plan)}\n\nStrict requirements:\n- Output ONLY the code content for the target file. No markdown fences. No explanations.\n- Do NOT change the target file path or create other files.\n- Assume all other files/directories from the plan exist at their specified relative paths.\n- Use correct relative imports consistent with the plan.\n`;

        const { model, temperature, maxTokens } = this.getGenerationOptions();
        return this.difyService.getModelResponse(prompt, `生成文件 ${file.path}`, { model, temperature, maxTokens });
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
        try {
            return JSON.parse(trimmed) as ProjectPlan;
        } catch {
            const first = trimmed.indexOf('{');
            const last = trimmed.lastIndexOf('}');
            if (first >= 0 && last > first) {
                const slice = trimmed.slice(first, last + 1);
                try {
                    return JSON.parse(slice) as ProjectPlan;
                } catch {
                    return null;
                }
            }
            return null;
        }
    }

    private async tryRepairPlanJson(raw: string): Promise<ProjectPlan | null> {
        const { model, temperature, maxTokens } = this.getGenerationOptions();
        const prompt = `You will be given an invalid JSON draft.\nFix it into valid JSON that conforms to this plan schema exactly.\nOutput ONLY valid JSON.\n\nInvalid draft:\n${raw}`;
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

    /* eslint-disable no-mixed-spaces-and-tabs */
	    private validatePlan(plan: ProjectPlan): { ok: true; plan: ProjectPlan } | { ok: false; error: string } {
	        if (!plan || plan.version !== '1.0.0') {
	            return { ok: false, error: 'Plan version must be 1.0.0' };
	        }

	        if (!plan.projectName || typeof plan.projectName !== 'string' || !plan.projectName.trim()) {
	            return { ok: false, error: 'Missing projectName' };
	        }

	        if (!plan.description || typeof plan.description !== 'string' || !plan.description.trim()) {
	            return { ok: false, error: 'Missing description' };
	        }

	        if (!Array.isArray(plan.directories) || !Array.isArray(plan.files)) {
	            return { ok: false, error: 'Missing directories/files' };
	        }

	        if (!Array.isArray(plan.steps)) {
	            return { ok: false, error: 'Missing steps section' };
	        }

	        if (!Array.isArray(plan.dependencies)) {
	            return { ok: false, error: 'Missing dependencies section' };
	        }

	        if (!plan.metadata || typeof plan.metadata !== 'object') {
	            return { ok: false, error: 'Missing metadata section' };
	        }

	        const normalizedDirs = new Set<string>();
	        for (const dir of plan.directories) {
	            const normalized = this.normalizeRelativePath(dir, true);
	            if (!normalized) {
	                return { ok: false, error: `Invalid directory path: ${dir}` };
	            }
	            if (normalized !== '.') {
	                normalizedDirs.add(normalized);
	            }
	        }

	        const normalizedFiles: ProjectPlan['files'] = [];
	        const filePathSet = new Set<string>();
	        for (const file of plan.files) {
	            if (!file || typeof file !== 'object') {
	                return { ok: false, error: 'Invalid file entry' };
	            }

	            const normalizedPath = this.normalizeRelativePath(file.path, false);
	            if (!normalizedPath) {
	                return { ok: false, error: `Invalid file path: ${file.path}` };
	            }

	            if (filePathSet.has(normalizedPath)) {
	                return { ok: false, error: `Duplicate file path in plan: ${normalizedPath}` };
	            }
	            filePathSet.add(normalizedPath);

	            if (typeof file.purpose !== 'string' || !file.purpose.trim()) {
	                return { ok: false, error: `Missing purpose for file: ${normalizedPath}` };
	            }
	            if (typeof file.language !== 'string' || !file.language.trim()) {
	                return { ok: false, error: `Missing language for file: ${normalizedPath}` };
	            }
	            if (!Array.isArray(file.dependencies)) {
	                return { ok: false, error: `Invalid dependencies for file: ${normalizedPath}` };
	            }

	            const normalizedDeps: string[] = [];
	            for (const dep of file.dependencies) {
	                if (typeof dep !== 'string' || !dep.trim()) {
	                    return { ok: false, error: `Invalid dependency value for file: ${normalizedPath}` };
	                }
	                const normalizedDep = this.normalizeRelativePath(dep, false);
	                if (!normalizedDep) {
	                    return { ok: false, error: `Invalid dependency path '${dep}' for file: ${normalizedPath}` };
	                }
	                normalizedDeps.push(normalizedDep);
	            }

	            normalizedFiles.push({
	                ...file,
	                path: normalizedPath,
	                dependencies: normalizedDeps,
	                overwrite: file.overwrite === true
	            });
	        }

	        for (const file of normalizedFiles) {
	            for (const dep of file.dependencies) {
	                if (!filePathSet.has(dep)) {
	                    return { ok: false, error: `File dependency '${dep}' not found in plan (referenced by ${file.path})` };
	                }
	            }
	        }

	        for (const filePath of filePathSet) {
	            if (normalizedDirs.has(filePath)) {
	                return { ok: false, error: `Path is both a directory and a file: ${filePath}` };
	            }
	        }

	        const stepIds = new Set<string>();
	        for (const step of plan.steps) {
	            if (!step || typeof step !== 'object') {
	                return { ok: false, error: 'Invalid step entry' };
	            }
	            if (typeof step.id !== 'string' || !step.id.trim()) {
	                return { ok: false, error: 'Step id is required' };
	            }
	            if (stepIds.has(step.id)) {
	                return { ok: false, error: `Duplicate step id: ${step.id}` };
	            }
	            stepIds.add(step.id);

	            if (typeof step.name !== 'string' || !step.name.trim()) {
	                return { ok: false, error: `Missing step name: ${step.id}` };
	            }
	            if (typeof step.description !== 'string') {
	                return { ok: false, error: `Missing step description: ${step.id}` };
	            }
	            if (!Array.isArray(step.dependencies)) {
	                return { ok: false, error: `Invalid step dependencies: ${step.id}` };
	            }
	            if (!['create', 'modify', 'delete', 'run', 'test'].includes(step.action)) {
	                return { ok: false, error: `Invalid step action: ${step.id}` };
	            }
	        }

	        for (const step of plan.steps) {
	            for (const dep of step.dependencies) {
	                if (typeof dep !== 'string' || !dep.trim() || !stepIds.has(dep)) {
	                    return { ok: false, error: `Step dependency '${dep}' not found (referenced by ${step.id})` };
	                }
	            }
	        }

	        const generatorVersion = this.getExtensionVersion();
	        const model = this.getConfiguredModel();
	        const updated: ProjectPlan = {
	            ...plan,
	            directories: Array.from(normalizedDirs),
	            files: normalizedFiles,
	            metadata: {
	                ...plan.metadata,
	                generatedAt: typeof plan.metadata.generatedAt === 'string' && plan.metadata.generatedAt.trim()
	                    ? plan.metadata.generatedAt
	                    : new Date().toISOString(),
	                generatorVersion,
	                model
	            }
	        };

	        return { ok: true, plan: updated };
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
        if (treatAsDirectory) {
            const last = normalized.split('/').pop() ?? normalized;
            if (last.includes('.') && !last.startsWith('.')) {
                return null;
            }
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

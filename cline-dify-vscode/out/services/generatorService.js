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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratorService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const loggerService_1 = require("./loggerService");
const configService_1 = require("./configService");
const execAsync = util_1.default.promisify(child_process_1.exec);
class GeneratorService {
    constructor(context, difyService) {
        this.context = context;
        this.difyService = difyService;
        this.configService = new configService_1.ConfigService();
        this.logger = new loggerService_1.LoggerService();
        this.outputChannel = vscode.window.createOutputChannel('Cline Dify Generator');
    }
    /**
     * Start the dual-role generator workflow
     */
    async startDualRoleGenerator() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
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
            }
            catch (error) {
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
            const selected = await this.previewPlanAndSelectFiles(plan);
            if (!selected) {
                return;
            }
            progress.report({ message: 'Generating code from structured plan...' });
            await this.generateCodeFromPlan(plan, selected, workspaceFolder.uri.fsPath);
        });
    }
    /**
     * Planner Role: Generate structured plan JSON
     */
    async generateStructuredPlan(projectDescription) {
        const prompt = `You are an expert AI development planner.\n\nCreate a STRICT JSON plan for the following project:\n${projectDescription}\n\nRules:\n- Output ONLY valid JSON. No markdown, no backticks, no comments.\n- Use UTF-8 plain text.\n- All paths MUST be relative to the project root, use forward slashes, and must NOT contain '..' or start with '/'.\n- The plan must include every directory and file that will be created.\n- The plan version MUST be exactly \"1.0.0\".\n\nJSON Schema (strict):\n{\n  \"version\": \"1.0.0\",\n  \"projectName\": string,\n  \"description\": string,\n  \"directories\": string[],\n  \"files\": [{
    \"path\": string,
    \"purpose\": string,
    \"language\": string,
    \"dependencies\": string[],
    \"overwrite\": boolean
  }],\n  \"steps\": [{ 
    \"id\": string, 
    \"name\": string, 
    \"description\": string, 
    \"dependencies\": string[],
    \"action\": \"create\" | \"modify\" | \"delete\" | \"run\" | \"test\",
    \"target\": string
  }],\n  \"dependencies\": string[],\n  \"metadata\": {\n    \"generatedAt\": string,
    \"generatorVersion\": string,
    \"model\": string
  }\n}\n\nExample:\n{\n  \"version\": \"1.0.0\",\n  \"projectName\": \"My React App\",\n  \"description\": \"A simple React application with modern tooling\",\n  \"directories\": [\"src\", \"src/components\", \"src/utils\"],\n  \"files\": [\n    {\n      \"path\": \"src/index.jsx\",\n      \"purpose\": \"Application entry point\",\n      \"language\": \"javascriptreact\",\n      \"dependencies\": [],\n      \"overwrite\": false\n    },\n    {\n      \"path\": \"src/App.jsx\",\n      \"purpose\": \"Main application component\",\n      \"language\": \"javascriptreact\",\n      \"dependencies\": [\"src/index.jsx\"],\n      \"overwrite\": false\n    }\n  ],\n  \"steps\": [\n    {\n      \"id\": \"1\",\n      \"name\": \"Create project structure\",\n      \"description\": \"Create the basic directory structure\",\n      \"dependencies\": [],\n      \"action\": \"create\",\n      \"target\": \\".\"\n    }\n  ],\n  \"dependencies\": [\"react\", \"react-dom\", \"vite\"],\n  \"metadata\": {\n    \"generatedAt\": \"2025-01-01T00:00:00.000Z\",\n    \"generatorVersion\": \"0.0.1\",\n    \"model\": \"gpt-4\"\n  }\n}\n`;
        const raw = await this.difyService.getModelResponse(prompt, '规划 JSON');
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
    async generateCodeFromPlan(plan, selectedFiles, projectRoot) {
        const directoriesToCreate = new Set();
        plan.directories.forEach(dir => {
            const normalized = this.normalizeRelativePath(dir);
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
            }
            catch (error) {
                this.logger.error(`Failed to create directory ${dir}:`, error instanceof Error ? error : new Error(String(error)));
                this.logger.showWarning(`Failed to create directory: ${dir}`);
                return;
            }
        }
        let generatedCount = 0;
        let skippedCount = 0;
        // Get conflict strategy from configuration
        const conflictStrategy = this.configService.get('generator.conflictStrategy');
        let conflictMode = conflictStrategy === 'ask' ? 'ask' :
            conflictStrategy === 'overwrite' ? 'overwriteAll' : 'skipAll';
        for (const relativeFilePath of selectedFiles) {
            const absolute = path.join(projectRoot, relativeFilePath);
            if (!this.isPathInsideProject(projectRoot, absolute)) {
                this.logger.showWarning(`Blocked unsafe path: ${relativeFilePath}`);
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
                        return;
                    }
                    else if (decision === 'skip') {
                        skippedCount++;
                        this.logger.info(`Skipped existing file: ${relativeFilePath}`);
                        continue;
                    }
                    else if (decision === 'skipAll') {
                        conflictMode = 'skipAll';
                        skippedCount++;
                        this.logger.info(`Skipped existing file: ${relativeFilePath}`);
                        continue;
                    }
                    else if (decision === 'overwriteAll') {
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
            }
            catch (error) {
                this.logger.error(`Failed to write file ${relativeFilePath}:`, error instanceof Error ? error : new Error(String(error)));
                this.logger.showWarning(`Failed to write file: ${relativeFilePath}`);
            }
        }
        if (generatedCount === 0) {
            this.logger.showWarning('No files were generated. Please review the structured plan and try again.');
        }
        else {
            const summary = `Code generation completed. Generated ${generatedCount} file(s).${skippedCount ? ` Skipped ${skippedCount} existing file(s).` : ''}`;
            this.logger.showInfo(summary);
        }
    }
    /**
     * Generate content for a specific file based on documentation
     */
    async generateFileContent(plan, file) {
        const prompt = `You are an expert AI code generator.\n\nYou MUST generate the complete code for exactly ONE file.\n\nTarget file (relative to project root): ${file.path}\nDescription: ${file.purpose}\nLanguage: ${file.language}\n\nProject plan (JSON):\n${JSON.stringify(plan)}\n\nStrict requirements:\n- Output ONLY the code content for the target file. No markdown fences. No explanations.\n- Do NOT change the target file path or create other files.\n- Assume all other files/directories from the plan exist at their specified relative paths.\n- Use correct relative imports consistent with the plan.\n`;
        return this.difyService.getModelResponse(prompt, `生成文件 ${file.path}`);
    }
    /**
     * Debug generated code
     */
    async debugGeneratedCode() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
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
                }
                catch (error) {
                    this.logDebugOutput(testCommand, error.stdout ?? '', error.stderr ?? error.message ?? '');
                    throw error;
                }
            });
            vscode.window.showInformationMessage('Debug command completed. Check the "Cline Dify Generator" output for details.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Debug command failed: ${error.message ?? error}`);
        }
    }
    async previewPlanAndSelectFiles(plan) {
        const fileItems = plan.files
            .map(file => {
            const normalized = this.normalizeRelativePath(file.path);
            if (!normalized) {
                return null;
            }
            return {
                label: normalized,
                description: file.purpose,
                picked: true
            };
        })
            .filter(Boolean);
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
        const confirmation = await this.logger.showInfo(`将生成 ${selected.length} 个文件，并创建 ${plan.directories.length} 个目录（若不存在）。继续吗？`, ['继续', '取消']);
        if (confirmation !== '继续') {
            return null;
        }
        return selected;
    }
    parseJsonFromModel(raw) {
        const trimmed = raw.trim();
        try {
            return JSON.parse(trimmed);
        }
        catch {
            const first = trimmed.indexOf('{');
            const last = trimmed.lastIndexOf('}');
            if (first >= 0 && last > first) {
                const slice = trimmed.slice(first, last + 1);
                try {
                    return JSON.parse(slice);
                }
                catch {
                    return null;
                }
            }
            return null;
        }
    }
    async tryRepairPlanJson(raw) {
        const prompt = `You will be given an invalid JSON draft.\nFix it into valid JSON that conforms to this plan schema exactly.\nOutput ONLY valid JSON.\n\nInvalid draft:\n${raw}`;
        const repairedRaw = await this.difyService.getModelResponse(prompt, '修复规划 JSON');
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
    validatePlan(plan) {
        if (!plan || plan.version !== '1.0.0') {
            return { ok: false, error: 'Plan version must be 1.0.0' };
        }
        if (!plan.projectName || typeof plan.projectName !== 'string') {
            return { ok: false, error: 'Missing projectName' };
        }
        if (!plan.description || typeof plan.description !== 'string') {
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
        const normalizedDirs = new Set();
        for (const dir of plan.directories) {
            const normalized = this.normalizeRelativePath(dir, true);
            if (!normalized) {
                return { ok: false, error: `Invalid directory path: ${dir}` };
            }
            normalizedDirs.add(normalized);
        }
        const normalizedFiles = [];
        const seenFiles = new Set();
        for (const file of plan.files) {
            const normalized = this.normalizeRelativePath(file.path, false);
            if (!normalized) {
                return { ok: false, error: `Invalid file path: ${file.path}` };
            }
            if (seenFiles.has(normalized)) {
                continue;
            }
            seenFiles.add(normalized);
            normalizedFiles.push({ ...file, path: normalized });
        }
        const updated = {
            ...plan,
            directories: Array.from(normalizedDirs),
            files: normalizedFiles
        };
        return { ok: true, plan: updated };
    }
    normalizeRelativePath(value, treatAsDirectory = false) {
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
    isPathInsideProject(projectRoot, candidatePath) {
        const resolvedRoot = path.resolve(projectRoot);
        const resolvedCandidate = path.resolve(candidatePath);
        return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
    }
    async promptFileConflict(file) {
        const choice = await vscode.window.showWarningMessage(`File ${file} already exists. How should I handle it?`, { modal: true }, 'Overwrite', 'Overwrite All', 'Skip', 'Skip All', 'Cancel');
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
    logDebugOutput(command, stdout, stderr) {
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
exports.GeneratorService = GeneratorService;
//# sourceMappingURL=generatorService.js.map
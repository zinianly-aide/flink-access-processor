import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { execFile } from 'child_process';
import { DependencyService } from './dependencyService';
import { GenerationRun, ProjectPlan } from './types';

const execFileAsync = util.promisify(execFile);

export type ProjectContextOptions = {
    includeProjectStructure: boolean;
    includeDependencies: boolean;
    includeLastGenerationRun: boolean;
    includeGitStatus: boolean;
    maxChars: number;
};

export class ProjectContextService {
    private readonly dependencyService = new DependencyService();

    public async build(projectRoot: string, options: ProjectContextOptions): Promise<string> {
        const blocks: string[] = [];

        if (options.includeLastGenerationRun) {
            const run = this.tryReadJson<GenerationRun>(path.join(projectRoot, 'GENERATION_RUN.json'));
            if (run) {
                blocks.push(this.formatGenerationRun(run));
            }
        }

        if (options.includeDependencies) {
            blocks.push(this.formatDependencies(projectRoot));
        }

        if (options.includeProjectStructure) {
            blocks.push(this.formatProjectStructure(projectRoot));
        }

        if (options.includeGitStatus) {
            const git = await this.tryGetGitSummary(projectRoot);
            if (git) {
                blocks.push(git);
            }
        }

        const text = blocks.filter(Boolean).join('\n\n---\n\n');
        if (!text) {
            return '';
        }

        if (text.length <= options.maxChars) {
            return text;
        }

        return text.slice(0, Math.max(0, options.maxChars - 20)) + '\n\n[context truncated]';
    }

    private formatGenerationRun(run: GenerationRun): string {
        const result = run.result
            ? `generated=${run.result.generated}, skipped=${run.result.skipped}, blocked=${run.result.blocked}, failed=${run.result.failed}`
            : 'n/a';

        const header = [
            'Generation Run',
            `- mode: ${run.mode}`,
            `- startedAt: ${run.startedAt}`,
            `- endedAt: ${run.endedAt ?? 'n/a'}`,
            `- provider: ${run.provider}`,
            `- model: ${run.model}`,
            `- temperature: ${run.temperature ?? 'n/a'}`,
            `- maxTokens: ${run.maxTokens ?? 'n/a'}`,
            `- selectedFiles: ${run.selectedFiles?.length ?? 0}`,
            `- result: ${result}`
        ].join('\n');

        return header;
    }

    private formatDependencies(projectRoot: string): string {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        const planPath = path.join(projectRoot, 'DEVELOPMENT_PLAN.json');
        const depMdPath = path.join(projectRoot, 'DEPENDENCIES.md');

        const lines: string[] = ['Dependencies'];

        const pkg = this.tryReadJson<any>(packageJsonPath);
        if (pkg && typeof pkg === 'object') {
            const deps = pkg.dependencies && typeof pkg.dependencies === 'object' ? Object.keys(pkg.dependencies).sort() : [];
            const devDeps = pkg.devDependencies && typeof pkg.devDependencies === 'object' ? Object.keys(pkg.devDependencies).sort() : [];
            lines.push(`- package.json deps: ${deps.slice(0, 40).join(', ')}${deps.length > 40 ? ' ...' : ''}`);
            lines.push(`- package.json devDeps: ${devDeps.slice(0, 40).join(', ')}${devDeps.length > 40 ? ' ...' : ''}`);
        } else {
            lines.push('- package.json: (missing)');
        }

        const plan = this.tryReadJson<ProjectPlan>(planPath);
        if (plan && Array.isArray(plan.dependencies)) {
            const parsed = this.dependencyService.parseDependencies(plan.dependencies);
            const pm = this.dependencyService.detectPackageManager(projectRoot);
            const install = this.dependencyService.buildInstallCommand(pm, parsed.entries);
            lines.push(`- plan dependencies: ${plan.dependencies.slice(0, 60).join(', ')}${plan.dependencies.length > 60 ? ' ...' : ''}`);
            lines.push(`- install command: ${install || '(none)'}`);
            if (fs.existsSync(depMdPath)) {
                lines.push('- DEPENDENCIES.md: present');
            }
        }

        return lines.join('\n');
    }

    private formatProjectStructure(projectRoot: string): string {
        const maxDepth = 2;
        const maxEntries = 200;
        let count = 0;
        const lines: string[] = ['Project Structure (partial)'];

        const skip = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.DS_Store']);

        const walk = (current: string, depth: number, prefix: string) => {
            if (depth > maxDepth || count >= maxEntries) {
                return;
            }

            let entries: fs.Dirent[] = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            } catch {
                return;
            }

            entries = entries
                .filter(e => !skip.has(e.name))
                .filter(e => !e.name.startsWith('.'))
                .sort((a, b) => {
                    if (a.isDirectory() && !b.isDirectory()) {
                        return -1;
                    }
                    if (!a.isDirectory() && b.isDirectory()) {
                        return 1;
                    }
                    return a.name.localeCompare(b.name);
                });

            for (const entry of entries) {
                if (count >= maxEntries) {
                    return;
                }
                count++;
                const rel = path.relative(projectRoot, path.join(current, entry.name)).replace(/\\/g, '/');
                lines.push(`${prefix}- ${entry.isDirectory() ? rel + '/' : rel}`);
                if (entry.isDirectory()) {
                    walk(path.join(current, entry.name), depth + 1, prefix + '  ');
                }
            }
        };

        walk(projectRoot, 1, '');
        if (count >= maxEntries) {
            lines.push('- ... (truncated)');
        }

        return lines.join('\n');
    }

    private async tryGetGitSummary(projectRoot: string): Promise<string | null> {
        try {
            const status = await execFileAsync('git', ['status', '--short'], { cwd: projectRoot, timeout: 3000 });
            const diffStat = await execFileAsync('git', ['diff', '--stat'], { cwd: projectRoot, timeout: 3000 });
            const statusText = (status.stdout || '').trim() || '(clean)';
            const diffText = (diffStat.stdout || '').trim() || '(no diff)';
            return ['Git', '```', statusText, '```', '```', diffText, '```'].join('\n');
        } catch {
            return null;
        }
    }

    private tryReadJson<T>(filePath: string): T | null {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw) as T;
        } catch (error) {
            vscode.window.showWarningMessage(`无法解析 JSON：${path.basename(filePath)}`);
            return null;
        }
    }
}


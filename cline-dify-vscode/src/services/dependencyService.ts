import * as fs from 'fs';
import * as path from 'path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export type DependencyEntry = {
    name: string;
    version: string;
    dev: boolean;
    raw: string;
};

export type DependencyApplyResult = {
    manifestPath: string;
    createdManifest: boolean;
    packageManager: PackageManager;
    installCommand: string;
    added: Record<string, string>;
    addedDev: Record<string, string>;
    skipped: string[];
    warnings: string[];
    markdownPath: string;
};

export class DependencyService {
    public detectPackageManager(projectRoot: string): PackageManager {
        if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
            return 'pnpm';
        }
        if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
            return 'yarn';
        }
        return 'npm';
    }

    public buildInstallCommand(pm: PackageManager, entries: DependencyEntry[]): string {
        const deps = entries.filter(e => !e.dev).map(e => e.name);
        const devDeps = entries.filter(e => e.dev).map(e => e.name);

        const parts: string[] = [];
        if (deps.length) {
            parts.push(pm === 'npm' ? `npm i ${deps.join(' ')}` : pm === 'yarn' ? `yarn add ${deps.join(' ')}` : `pnpm add ${deps.join(' ')}`);
        }
        if (devDeps.length) {
            parts.push(pm === 'npm' ? `npm i -D ${devDeps.join(' ')}` : pm === 'yarn' ? `yarn add -D ${devDeps.join(' ')}` : `pnpm add -D ${devDeps.join(' ')}`);
        }
        return parts.join(' && ');
    }

    public parseDependencies(specs: string[]): { entries: DependencyEntry[]; warnings: string[] } {
        const warnings: string[] = [];
        const entries: DependencyEntry[] = [];
        const seen = new Set<string>();

        for (const rawSpec of specs ?? []) {
            if (typeof rawSpec !== 'string') {
                continue;
            }
            const spec = rawSpec.trim();
            if (!spec) {
                continue;
            }

            const parsed = this.parseSpec(spec);
            if (!parsed) {
                warnings.push(`Unsupported dependency spec: ${spec}`);
                continue;
            }

            if (seen.has(parsed.name)) {
                continue;
            }
            seen.add(parsed.name);
            entries.push(parsed);
        }

        return { entries, warnings };
    }

    public applyDependencies(projectRoot: string, specs: string[]): DependencyApplyResult {
        const packageManager = this.detectPackageManager(projectRoot);
        const manifestPath = path.join(projectRoot, 'package.json');
        const markdownPath = path.join(projectRoot, 'DEPENDENCIES.md');

        const { entries, warnings } = this.parseDependencies(specs);
        const installCommand = this.buildInstallCommand(packageManager, entries);

        const { json, createdManifest } = this.readOrCreatePackageJson(projectRoot, manifestPath);
        json.dependencies = json.dependencies && typeof json.dependencies === 'object' ? json.dependencies : {};
        json.devDependencies = json.devDependencies && typeof json.devDependencies === 'object' ? json.devDependencies : {};

        const added: Record<string, string> = {};
        const addedDev: Record<string, string> = {};
        const skipped: string[] = [];

        for (const entry of entries) {
            const target = entry.dev ? json.devDependencies : json.dependencies;
            if (typeof target[entry.name] === 'string' && target[entry.name]) {
                skipped.push(entry.name);
                continue;
            }

            // If the other section already has it, keep as-is.
            const other = entry.dev ? json.dependencies : json.devDependencies;
            if (typeof other[entry.name] === 'string' && other[entry.name]) {
                skipped.push(entry.name);
                continue;
            }

            target[entry.name] = entry.version;
            if (entry.dev) {
                addedDev[entry.name] = entry.version;
            } else {
                added[entry.name] = entry.version;
            }
        }

        this.writeJson(manifestPath, json);
        this.writeDependenciesMarkdown(markdownPath, entries, packageManager, installCommand);

        return {
            manifestPath,
            createdManifest,
            packageManager,
            installCommand,
            added,
            addedDev,
            skipped,
            warnings,
            markdownPath
        };
    }

    private readOrCreatePackageJson(projectRoot: string, manifestPath: string): { json: any; createdManifest: boolean } {
        if (fs.existsSync(manifestPath)) {
            try {
                const raw = fs.readFileSync(manifestPath, 'utf8');
                const parsed = JSON.parse(raw);
                return { json: parsed && typeof parsed === 'object' ? parsed : {}, createdManifest: false };
            } catch {
                // fall through to create
            }
        }

        const name = path.basename(projectRoot)
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '') || 'generated-project';

        return {
            createdManifest: true,
            json: {
                name,
                version: '0.1.0',
                private: true,
                scripts: {}
            }
        };
    }

    private writeJson(filePath: string, json: any): void {
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
    }

    private writeDependenciesMarkdown(
        markdownPath: string,
        entries: DependencyEntry[],
        packageManager: PackageManager,
        installCommand: string
    ): void {
        const deps = entries.filter(e => !e.dev);
        const devDeps = entries.filter(e => e.dev);

        const lines: string[] = [];
        lines.push('# Dependencies');
        lines.push('');
        lines.push('This file is generated by Cline Dify Assistant.');
        lines.push('');
        lines.push(`- Package manager: \`${packageManager}\``);
        lines.push('');
        if (deps.length) {
            lines.push('## dependencies');
            for (const d of deps) {
                lines.push(`- \`${d.name}\` \`${d.version}\``);
            }
            lines.push('');
        }
        if (devDeps.length) {
            lines.push('## devDependencies');
            for (const d of devDeps) {
                lines.push(`- \`${d.name}\` \`${d.version}\``);
            }
            lines.push('');
        }
        lines.push('## Install');
        lines.push('');
        lines.push('```sh');
        lines.push(installCommand || '# (no dependencies)');
        lines.push('```');
        lines.push('');

        fs.writeFileSync(markdownPath, lines.join('\n'));
    }

    private parseSpec(spec: string): DependencyEntry | null {
        const trimmed = spec.trim();
        if (!trimmed) {
            return null;
        }

        // Drop unsupported URL-style specs for now.
        if (/[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith('file:') || trimmed.startsWith('git+') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
            return null;
        }

        const at = this.findVersionDelimiter(trimmed);
        const name = at >= 0 ? trimmed.slice(0, at) : trimmed;
        const versionRaw = at >= 0 ? trimmed.slice(at + 1) : '';
        const version = versionRaw.trim() || '*';
        const dev = this.isLikelyDevDependency(name);
        return { name, version, dev, raw: spec };
    }

    private findVersionDelimiter(spec: string): number {
        // For scoped packages, version delimiter is the last '@' if any.
        const idx = spec.lastIndexOf('@');
        if (idx <= 0) {
            return -1;
        }
        // '@scope/pkg' (no version) => last '@' is 0 => handled above.
        return idx;
    }

    private isLikelyDevDependency(name: string): boolean {
        const lower = name.toLowerCase();
        if (lower.startsWith('@types/')) {
            return true;
        }
        const devHints = [
            'eslint',
            'prettier',
            'typescript',
            'ts-node',
            'vitest',
            'jest',
            'mocha',
            'chai',
            '@vitejs/',
            'vite',
            'webpack',
            'rollup',
            'babel',
            'swc',
            'nodemon',
            'tsup'
        ];
        return devHints.some(hint => lower === hint || lower.startsWith(hint));
    }
}


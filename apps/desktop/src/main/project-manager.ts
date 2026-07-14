import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from 'fs';
import { join, relative, basename } from 'path';
import type { CreateSkillOptions, FileEntry } from '../shared/types';
import { getBundledNodeModulesDir } from './paths';
import { buildLaunchRule } from '@jibo-studio/skill-model';

export function listDirectoryTree(rootPath: string, currentPath = rootPath): FileEntry[] {
  if (!existsSync(currentPath)) return [];
  const entries = readdirSync(currentPath)
    .filter(
      (name) =>
        !name.startsWith('.') &&
        name !== 'node_modules' &&
        name !== 'build' &&
        name !== 'vendor',
    )
    .sort((a, b) => a.localeCompare(b));

  const result: FileEntry[] = [];
  for (const name of entries) {
    const fullPath = join(currentPath, name);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        result.push({
          name,
          path: fullPath,
          type: 'directory',
          children: listDirectoryTree(rootPath, fullPath),
        });
      } else {
        result.push({ name, path: fullPath, type: 'file' });
      }
    } catch {
      // Skip entries we cannot read (permissions, broken symlinks, etc.)
    }
  }
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function readProjectFile(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

export function writeProjectFile(filePath: string, content: string): void {
  writeFileSync(filePath, content, 'utf8');
}

export function copyTemplate(templateDir: string, targetDir: string): void {
  if (!existsSync(templateDir)) {
    throw new Error(`Template not found: ${templateDir}. Run npm run vendor first.`);
  }
  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true, filter: (src) => !src.includes('node_modules') });
}

export function customizeSkillProject(projectDir: string, options: CreateSkillOptions): void {
  const pkgPath = join(projectDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.name = options.name;
  pkg.jibo['display-name'] = options.displayName;
  pkg.jibo.prompt = options.launchPhrase;
  const template = options.template ?? 'dsl';
  if (template === 'dsl') {
    pkg.jibo.sourceFormat = 'dsl-v1';
    pkg.jibo.skillEntry = 'skill.jibo';
  } else {
    pkg.jibo.sourceFormat = 'legacy-artifacts';
    delete pkg.jibo.skillEntry;
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  if (template === 'dsl') {
    const entryPath = join(projectDir, 'skill.jibo');
    if (existsSync(entryPath)) {
      let source = readFileSync(entryPath, 'utf8');
      source = source
        .replace(/name = "[^"]*"/, `name = "${options.name}"`)
        .replace(/display = "[^"]*"/, `display = "${options.displayName}"`)
        .replace(/launch = "[^"]*"/, `launch = "${options.launchPhrase}"`)
        .replace(/prompt = "[^"]*"/, `prompt = "${options.launchPhrase}"`);
      writeFileSync(entryPath, source, 'utf8');
    }
  } else {
    writeFileSync(
      join(projectDir, 'launch.rule'),
      buildLaunchRule(options.launchPhrase, options.name),
      'utf8',
    );
  }
}

export function getRelativePath(root: string, filePath: string): string {
  return relative(root, filePath) || basename(filePath);
}

/** Copy pre-vendored Jibo SDK packages — no network or npm registry required. */
export function installBundledDeps(projectDir: string): { success: boolean; message: string } {
  const source = getBundledNodeModulesDir();
  if (!existsSync(source)) {
    return {
      success: false,
      message:
        'Bundled Jibo packages are missing from this install. Reinstall Jibo Studio from a release that includes vendor/, or run `npm run vendor` when building from source.',
    };
  }
  if (!existsSync(join(source, 'jibo')) || !existsSync(join(source, 'jibo-dev'))) {
    return {
      success: false,
      message: 'Bundled packages incomplete (need jibo and jibo-dev in vendor/skill-deps/node_modules).',
    };
  }

  const target = join(projectDir, 'node_modules');
  cpSync(source, target, {
    recursive: true,
    filter: (src) => !src.includes('node_modules/.cache'),
  });

  writeFileSync(
    join(projectDir, '.npmrc'),
    '# Dependencies installed from Jibo Studio bundled SDK (offline)\n',
    'utf8',
  );

  return { success: true, message: 'Installed bundled Jibo SDK packages (offline).' };
}

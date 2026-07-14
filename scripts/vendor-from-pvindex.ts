/**
 * Maintainer script: populate vendor/ from pvindex archive and npm mirror.
 * End users normally do not run this — releases and git track pre-vendored assets.
 *
 * Usage: npm run vendor
 */

import {
  mkdirSync,
  writeFileSync,
  existsSync,
  cpSync,
  readdirSync,
  rmSync,
  unlinkSync,
  lstatSync,
  readlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VENDOR = join(ROOT, 'vendor');
const TEMPLATE = join(VENDOR, 'templates', 'starter-skill');
const TEMPLATE_DSL = join(VENDOR, 'templates', 'starter-skill-dsl');
const TOOLCHAIN = join(VENDOR, 'sdk-toolchain');
const SKILL_DEPS = join(VENDOR, 'skill-deps');
const NPM_CACHE = join(VENDOR, 'npm-cache');
const NPM_PACKAGES = join(VENDOR, 'npm-packages');
const GIT_DEPS = join(VENDOR, 'git-deps');
const NODE6 = join(VENDOR, 'node6');

const PVINDEX_NPM = 'https://pvindex.org/npm';
const PVINDEX_GITEA = 'https://pvindex.org/gitea';
const PVINDEX_REPO = 'https://pvindex.org/repository';

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

function writePortableNpmrc(dir: string, registry: string) {
  writeFileSync(dir, `registry=${registry}\ncache=../npm-cache\n`, 'utf8');
}

function cloneGitDep(name: string, repo: string) {
  const dest = join(GIT_DEPS, name);
  if (existsSync(join(dest, 'package.json'))) {
    // Prefer plain tree for offline git tracking (no submodule required).
    if (existsSync(join(dest, '.git'))) {
      rmSync(join(dest, '.git'), { recursive: true, force: true });
      console.log(`  demoted gitlink to plain tree: ${name}`);
    } else {
      console.log(`  git dep OK: ${name}`);
    }
    return;
  }
  ensureDir(GIT_DEPS);
  console.log(`  cloning ${repo}...`);
  execSync(`git clone --depth 1 ${PVINDEX_GITEA}/${repo} ${dest}`, { stdio: 'inherit' });
  if (existsSync(join(dest, '.git'))) {
    rmSync(join(dest, '.git'), { recursive: true, force: true });
  }
}

function fetchTarballs() {
  ensureDir(NPM_PACKAGES);
  const pkgs = [
    { name: 'jibo', version: '5.8.1' },
    { name: 'jibo-dev', version: '2.0.0' },
    { name: 'jibo-cli', version: '3.7.0' },
    { name: 'nedb', version: '1.8.0' },
  ];
  for (const { name, version } of pkgs) {
    const file = join(NPM_PACKAGES, `${name}-${version}.tgz`);
    if (existsSync(file)) {
      console.log(`  tarball OK: ${name}-${version}.tgz`);
      continue;
    }
    console.log(`  packing ${name}@${version} from pvindex...`);
    execSync(`npm pack ${name}@${version} --registry ${PVINDEX_NPM}`, {
      cwd: NPM_PACKAGES,
      stdio: 'inherit',
    });
  }
}

function installSkillDeps() {
  console.log('Installing bundled skill dependencies into vendor/skill-deps...');
  cloneGitDep('gulp-uglify-harmony', 'jiborobot/gulp-uglify-harmony');
  execSync('npm install --no-audit --no-fund --ignore-scripts', {
    cwd: join(GIT_DEPS, 'gulp-uglify-harmony'),
    stdio: 'inherit',
  });
  fetchTarballs();

  ensureDir(SKILL_DEPS);
  writeFileSync(
    join(SKILL_DEPS, 'package.json'),
    JSON.stringify(
      {
        name: 'jibo-studio-skill-deps',
        private: true,
        version: '0.1.0',
        dependencies: {
          jibo: 'file:../npm-packages/jibo-5.8.1.tgz',
          nedb: 'file:../npm-packages/nedb-1.8.0.tgz',
        },
        devDependencies: {
          'jibo-dev': 'file:../npm-packages/jibo-dev-2.0.0.tgz',
        },
        overrides: {
          'gulp-uglify-harmony': 'file:../git-deps/gulp-uglify-harmony',
        },
      },
      null,
      2,
    ) + '\n',
  );
  writePortableNpmrc(join(SKILL_DEPS, '.npmrc'), 'https://registry.npmjs.org');

  execSync('npm install --no-audit --no-fund --ignore-scripts', {
    cwd: SKILL_DEPS,
    stdio: 'inherit',
  });

  // npm file: overrides become symlinks — materialize for offline copy into skills.
  const harmonyDest = join(SKILL_DEPS, 'node_modules', 'gulp-uglify-harmony');
  const harmonySrc = join(GIT_DEPS, 'gulp-uglify-harmony');
  if (existsSync(harmonySrc)) {
    rmSync(harmonyDest, { recursive: true, force: true });
    cpSync(harmonySrc, harmonyDest, { recursive: true });
    console.log('  materialized gulp-uglify-harmony');
  }

  installParserBinary();
  console.log('  skill-deps installed:', readdirSync(join(SKILL_DEPS, 'node_modules')).length, 'packages');
}

/** Bundle jibo-dev NLU parser native module (offline; GitHub release is dead). */
function installParserBinary() {
  const parserDir = join(SKILL_DEPS, 'node_modules', 'jibo-dev', 'parser-node');
  const marker = join(parserDir, 'build', 'Release', 'jsjibonlu.node');
  if (existsSync(marker)) {
    console.log('  parser-node OK');
    return;
  }

  const zipName = 'jibo-nlu-js-v2.4.0-linux-x64-51.zip';
  const zipUrl = `${PVINDEX_REPO}/nlu/jibo-nlu-js/${zipName}`;
  const tmp = join(VENDOR, '.tmp-parser');
  rmSync(tmp, { recursive: true, force: true });
  ensureDir(tmp);

  console.log(`  downloading parser from pvindex (${zipName})...`);
  execSync(`curl -fsSL "${zipUrl}" -o "${join(tmp, 'parser.zip')}"`, { stdio: 'inherit' });
  execSync(`unzip -qo "${join(tmp, 'parser.zip')}" -d "${tmp}"`, { stdio: 'inherit' });

  rmSync(parserDir, { recursive: true, force: true });
  cpSync(join(tmp, 'jibo-nlu-js'), parserDir, { recursive: true });
  rmSync(tmp, { recursive: true, force: true });
  console.log('  installed parser-node');
}

/** Bundle jibo-cli + jibo-sync for robot sync/run/stop (offline). */
function installCliToolchain() {
  console.log('Installing bundled robot CLI into vendor/sdk-toolchain...');
  fetchTarballs();

  ensureDir(TOOLCHAIN);
  writeFileSync(
    join(TOOLCHAIN, 'package.json'),
    JSON.stringify(
      {
        name: 'jibo-studio-toolchain',
        private: true,
        version: '0.1.0',
        description: 'Bundled jibo-cli + jibo-sync for robot sync/run/stop',
        dependencies: {
          'jibo-cli': 'file:../npm-packages/jibo-cli-3.7.0.tgz',
        },
        overrides: {
          'jibo-kb': '5.0.0',
          'jibo-sync': '2.0.0',
          'skills-service-manager': '6.0.0',
        },
      },
      null,
      2,
    ) + '\n',
  );
  writePortableNpmrc(join(TOOLCHAIN, '.npmrc'), PVINDEX_NPM);

  execSync('npm install --no-audit --no-fund --ignore-scripts', {
    cwd: TOOLCHAIN,
    stdio: 'inherit',
  });

  // jibo-cli depends on electron-prebuilt but sync only needs path.txt, not a full Electron download.
  const electronPrebuilt = join(TOOLCHAIN, 'node_modules', 'electron-prebuilt');
  const pathTxt = join(electronPrebuilt, 'path.txt');
  if (existsSync(electronPrebuilt) && !existsSync(pathTxt)) {
    writeFileSync(pathTxt, 'dist/electron\n', 'utf8');
    console.log('  stubbed electron-prebuilt/path.txt');
  }

  const syncBin = join(TOOLCHAIN, 'node_modules', 'jibo-sync');
  if (!existsSync(syncBin)) {
    throw new Error('jibo-sync missing after sdk-toolchain install');
  }
  console.log('  sdk-toolchain installed');
}

/** Legacy jibo-dev (gulp 3 / graceful-fs) requires Node 7.x; parser-node is built for ABI 51. */
function installBundledNode() {
  const NODE_VERSION = '7.10.1';
  const nodeBin = join(NODE6, 'bin', 'node');
  const npmLink = join(NODE6, 'bin', 'npm');

  if (existsSync(nodeBin)) {
    // Remove broken npm symlink left by older vendor runs (points at deleted .tmp-node).
    try {
      if (existsSync(npmLink) || lstatSync(npmLink).isSymbolicLink()) {
        const target = readlinkSync(npmLink);
        if (target.includes('.tmp-node') || !existsSync(npmLink)) {
          unlinkSync(npmLink);
          console.log('  removed broken node6/bin/npm symlink');
        }
      }
    } catch {
      try {
        unlinkSync(npmLink);
      } catch {
        // ignore
      }
    }
    console.log(`  bundled Node OK: v${NODE_VERSION}`);
    return;
  }

  const tmp = join(VENDOR, '.tmp-node');
  rmSync(tmp, { recursive: true, force: true });
  ensureDir(tmp);

  const tarball = `node-v${NODE_VERSION}-linux-x64.tar.xz`;
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${tarball}`;
  console.log(`  downloading Node ${NODE_VERSION} for legacy jibo-dev...`);
  execSync(`curl -fsSL "${url}" -o "${join(tmp, tarball)}"`, { stdio: 'inherit' });
  execSync(`tar -xJf "${join(tmp, tarball)}" -C "${tmp}"`, { stdio: 'inherit' });

  const extracted = join(tmp, `node-v${NODE_VERSION}-linux-x64`);
  ensureDir(join(NODE6, 'bin'));
  cpSync(join(extracted, 'bin', 'node'), nodeBin);
  // Do not copy npm — it is unused (runtime only needs node) and historically became a broken symlink.
  rmSync(tmp, { recursive: true, force: true });

  writeFileSync(
    join(NODE6, 'README.md'),
    `# Bundled Node ${NODE_VERSION}

Shipped with Jibo Studio for legacy jibo-dev skill builds (gulp 3 / graceful-fs).
The NLU parser native module is built for Node ABI 51 (Node 7.x).
Only \`bin/node\` is required at runtime.
`,
    'utf8',
  );
  console.log(`  bundled Node ${NODE_VERSION} at vendor/node6/bin/node`);
}

function main() {
  console.log('Jibo Studio vendor script');
  ensureDir(VENDOR);
  ensureDir(join(VENDOR, '.tmp-node')); // ensure pattern known; cleaned below
  rmSync(join(VENDOR, '.tmp-node'), { recursive: true, force: true });
  rmSync(join(VENDOR, '.tmp-parser'), { recursive: true, force: true });

  if (!existsSync(join(TEMPLATE, 'package.json'))) {
    console.warn('starter-skill (legacy) template missing');
  } else {
    console.log('starter-skill (legacy) template OK');
  }
  if (!existsSync(join(TEMPLATE_DSL, 'package.json'))) {
    console.warn('starter-skill-dsl template missing');
  } else {
    console.log('starter-skill-dsl template OK');
  }

  try {
    installSkillDeps();
  } catch (e) {
    console.error('skill-deps install failed:', e);
    process.exitCode = 1;
  }

  try {
    installCliToolchain();
  } catch (e) {
    console.error('sdk-toolchain install failed:', e);
    process.exitCode = 1;
  }

  installBundledNode();
  console.log('Vendor complete. Skill deps: vendor/skill-deps/node_modules');
  console.log('Robot sync: vendor/sdk-toolchain/node_modules/jibo-sync');
}

main();

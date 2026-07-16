import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'url';
import { claimLegacyProject, migrateLegacyProjectToDsl, parseSkillSource } from '../src/index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const starterLegacy = join(__dirname, '../../../vendor/templates/starter-skill');

describe('legacy → JiboScript migration', () => {
  it('migrates the legacy starter skill into a compilable skill.jibo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jibo-migrate-'));
    try {
      cpSync(starterLegacy, dir, { recursive: true });
      // Simulate an untouched classic skill (no Studio sourceFormat yet).
      const pkgPath = join(dir, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        jibo: Record<string, unknown>;
      };
      delete pkg.jibo.sourceFormat;
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

      const result = migrateLegacyProjectToDsl(dir);
      assert.ok(existsSync(join(dir, 'skill.jibo')));
      assert.equal(result.success, true, result.compile
        ? JSON.stringify(result.compile.diagnostics, null, 2)
        : result.warnings.join('\n'));

      const source = readFileSync(join(dir, 'skill.jibo'), 'utf8');
      const parsed = parseSkillSource(source);
      assert.equal(parsed.diagnostics.filter((d) => d.severity === 'error').length, 0);
      assert.equal(parsed.module.skill?.name, 'starter-skill');
      assert.ok(parsed.module.flows.some((f) => f.name === 'main'));
      assert.ok(parsed.module.flows.some((f) => f.name === 'sayHello'));
      assert.ok(parsed.module.mims.some((m) => m.name === 'announce_hello'));
      assert.ok(parsed.module.behaviors.some((b) => b.name === 'playSound'));
      assert.ok(parsed.module.rules.length >= 1);

      const updated = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        jibo: { sourceFormat?: string; skillEntry?: string };
      };
      assert.equal(updated.jibo.sourceFormat, 'dsl-v1');
      assert.equal(updated.jibo.skillEntry, 'skill.jibo');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('claims a project as legacy without writing skill.jibo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jibo-claim-'));
    try {
      cpSync(starterLegacy, dir, { recursive: true });
      const pkgPath = join(dir, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        jibo: Record<string, unknown>;
      };
      delete pkg.jibo.sourceFormat;
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

      claimLegacyProject(dir);
      assert.ok(!existsSync(join(dir, 'skill.jibo')));
      const updated = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        jibo: { sourceFormat?: string };
      };
      assert.equal(updated.jibo.sourceFormat, 'legacy-artifacts');
      assert.ok(existsSync(join(dir, '.jibo-studio', 'source-choice.json')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

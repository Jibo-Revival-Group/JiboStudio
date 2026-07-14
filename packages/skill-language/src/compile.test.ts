import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compileSkillSource, parseSkillSource } from '../src/index.ts';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFlow, parseMim, parseRule } from '@jibo-studio/skill-model';

const __dirname = dirname(fileURLToPath(import.meta.url));
const starterJibo = readFileSync(
  join(__dirname, '../../../vendor/templates/starter-skill-dsl/skill.jibo'),
  'utf8',
);

describe('JiboScript parser', () => {
  it('parses the DSL starter skill', () => {
    const result = parseSkillSource(starterJibo, 'skill.jibo');
    assert.equal(result.diagnostics.filter((d) => d.severity === 'error').length, 0);
    assert.equal(result.module.skill?.name, 'starter-skill');
    assert.equal(result.module.flows.length, 2);
    assert.equal(result.module.mims.length, 1);
    assert.equal(result.module.behaviors.length, 1);
    assert.equal(result.module.rules.length, 2);
  });

  it('reports unknown flow references', () => {
    const source = `
skill:
  name = "x"
  launch = "hi"
flow main:
  call missing
  end
`;
    const result = compileSkillSource(source);
    assert.equal(result.success, false);
    assert.ok(result.diagnostics.some((d) => d.message.includes("Unknown flow 'missing'")));
  });
});

describe('JiboScript compile', () => {
  it('emits launch.rule, flows, mim, behavior, and rules', () => {
    const result = compileSkillSource(starterJibo, 'skill.jibo');
    assert.equal(result.success, true, JSON.stringify(result.diagnostics, null, 2));
    const paths = result.artifacts.map((a) => a.path).sort();
    assert.deepEqual(paths, [
      'launch.rule',
      'mims/announce_hello.mim',
      'src/behaviors/playSound.bt',
      'src/flows/main.flow',
      'src/flows/sayHello.flow',
      'src/rules/trigger_skill.rule',
      'src/rules/yesno.rule',
    ]);
  });

  it('produces semantically compatible main.flow', () => {
    const result = compileSkillSource(starterJibo, 'skill.jibo');
    const main = result.artifacts.find((a) => a.path === 'src/flows/main.flow');
    assert.ok(main);
    const doc = parseFlow(main!.content);
    const classes = doc.nodeDataArray.map((n) => n.class);
    assert.ok(classes.includes('Flow.Begin'));
    assert.ok(classes.includes('Flow.Subflow'));
    assert.ok(classes.includes('Flow.End'));
    const sub = doc.nodeDataArray.find((n) => n.class === 'Flow.Subflow');
    assert.equal((sub?.options as { subflowId?: string })?.subflowId, './sayHello');
  });

  it('produces announce_hello.mim matching starter prompts', () => {
    const result = compileSkillSource(starterJibo, 'skill.jibo');
    const mimArt = result.artifacts.find((a) => a.path === 'mims/announce_hello.mim');
    assert.ok(mimArt);
    const mim = parseMim(mimArt!.content);
    assert.equal(mim.mim_type, 'announcement');
    assert.equal(mim.prompts[0]?.prompt, 'Hello ${currentSpeaker}!');
  });

  it('passes through raw NLU rules', () => {
    const result = compileSkillSource(starterJibo, 'skill.jibo');
    const rule = result.artifacts.find((a) => a.path === 'src/rules/trigger_skill.rule');
    assert.ok(rule);
    const doc = parseRule(rule!.content);
    assert.ok(doc.content.includes('TopRule'));
    assert.ok(doc.content.includes("action='sayHello'"));
  });

  it('uses deterministic node ids', () => {
    const a = compileSkillSource(starterJibo, 'skill.jibo');
    const b = compileSkillSource(starterJibo, 'skill.jibo');
    const flowA = parseFlow(a.artifacts.find((x) => x.path === 'src/flows/sayHello.flow')!.content);
    const flowB = parseFlow(b.artifacts.find((x) => x.path === 'src/flows/sayHello.flow')!.content);
    assert.deepEqual(
      flowA.nodeDataArray.map((n) => n.id),
      flowB.nodeDataArray.map((n) => n.id),
    );
  });
});

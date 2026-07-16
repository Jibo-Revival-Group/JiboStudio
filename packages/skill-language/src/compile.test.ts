import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compileSkillProject, compileSkillSource, parseSkillSource } from '../src/index.ts';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { parseBehavior, parseFlow, parseMim, parseRule } from '@jibo-studio/skill-model';

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

  it('lowers "run" flow steps to a bare "Subtree" node with a behaviorPath require', () => {
    const result = compileSkillSource(starterJibo, 'skill.jibo');
    const sayHello = result.artifacts.find((a) => a.path === 'src/flows/sayHello.flow');
    assert.ok(sayHello);
    const doc = parseFlow(sayHello!.content);
    // Runtime class must be the bare "Subtree" (not "Flow.Subtree") — jibo-dev's
    // Flowify transform only matches node.class === 'Subtree' when wrapping
    // behaviorPath in a require() call.
    const subtree = doc.nodeDataArray.find((n) => n.class === 'Subtree');
    assert.ok(subtree, 'expected a Subtree node for "run playSound"');
    assert.equal(
      (subtree?.options as { behaviorPath?: string })?.behaviorPath,
      '../behaviors/playSound',
    );
  });

  it('flags an unknown behavior referenced by "run"', () => {
    const source = `
skill:
  name = "x"
  launch = "hi"
flow main:
  run missingBehavior
  end
`;
    const result = compileSkillSource(source);
    assert.equal(result.success, false);
    assert.ok(result.diagnostics.some((d) => d.message.includes("Unknown behavior 'missingBehavior'")));
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

  it('lowers "selector" behavior nodes to the real "Switch" BT class', () => {
    const source = `
skill:
  name = "x"
  launch = "hi"
behavior pick:
  selector:
    play_audio "a.mp3"
    play_audio "b.mp3"
`;
    const result = compileSkillSource(source);
    assert.equal(result.success, true, JSON.stringify(result.diagnostics, null, 2));
    const art = result.artifacts.find((a) => a.path === 'src/behaviors/pick.bt');
    assert.ok(art);
    const doc = parseBehavior(art!.content);
    const classes = Object.entries(doc)
      .filter(([key]) => key !== 'meta')
      .map(([, node]) => (node as { class: string }).class);
    // "Selector" is not a valid Jibo BT node class — the runtime only understands "Switch".
    assert.ok(classes.includes('Switch'));
    assert.ok(!classes.includes('Selector'));
  });

  it('flags an unknown rule referenced by a mim', () => {
    const source = `
skill:
  name = "x"
  launch = "hi"
mim ask:
  type = query
  rule = missingRule
  say "Ready?"
`;
    const result = compileSkillSource(source);
    assert.equal(result.success, false);
    assert.ok(result.diagnostics.some((d) => d.message.includes("Unknown rule 'missingRule'")));
  });

  it('removes stale generated artifacts on recompile after a rename', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jibo-dsl-'));
    try {
      const v1 = `
skill:
  name = "x"
  launch = "hi"
flow oldFlow:
  end
`;
      writeFileSync(join(dir, 'skill.jibo'), v1, 'utf8');
      const first = compileSkillProject(dir, 'skill.jibo');
      assert.equal(first.success, true, JSON.stringify(first.diagnostics, null, 2));
      const oldFlowPath = join(dir, 'src/flows/oldFlow.flow');
      assert.ok(existsSync(oldFlowPath));

      const v2 = `
skill:
  name = "x"
  launch = "hi"
flow newFlow:
  end
`;
      writeFileSync(join(dir, 'skill.jibo'), v2, 'utf8');
      const second = compileSkillProject(dir, 'skill.jibo');
      assert.equal(second.success, true, JSON.stringify(second.diagnostics, null, 2));
      assert.ok(!existsSync(oldFlowPath), 'stale oldFlow.flow should be removed after rename');
      assert.ok(existsSync(join(dir, 'src/flows/newFlow.flow')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseFlow,
  serializeFlow,
  createEmptyFlow,
  parseBehavior,
  serializeBehavior,
  createEmptyBehavior,
  parseRule,
  serializeRule,
  parseMim,
  serializeMim,
  createEmptyMim,
} from './index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(__dirname, '../../../vendor/templates/starter-skill');

describe('skill-model round-trip', () => {
  it('flow empty round-trip', () => {
    const doc = createEmptyFlow();
    const out = parseFlow(serializeFlow(doc));
    assert.equal(out.dataFormat, 'flow-1');
    assert.ok(out.nodeDataArray.length >= 2);
  });

  it('starter-skill sayHello.flow round-trip', () => {
    const raw = readFileSync(join(templateRoot, 'src/flows/sayHello.flow'), 'utf8');
    const out = serializeFlow(parseFlow(raw));
    assert.deepEqual(JSON.parse(out), JSON.parse(raw));
  });

  it('behavior empty round-trip', () => {
    const doc = createEmptyBehavior();
    const out = parseBehavior(serializeBehavior(doc));
    assert.equal(out.meta.version, 1);
  });

  it('starter-skill playSound.bt round-trip', () => {
    const raw = readFileSync(join(templateRoot, 'src/behaviors/playSound.bt'), 'utf8');
    const out = serializeBehavior(parseBehavior(raw));
    assert.deepEqual(JSON.parse(out), JSON.parse(raw));
  });

  it('rule round-trip', () => {
    const doc = parseRule('TopRule = ($* hello $*);');
    assert.equal(serializeRule(doc), 'TopRule = ($* hello $*);');
  });

  it('mim round-trip', () => {
    const raw = readFileSync(join(templateRoot, 'mims/announce_hello.mim'), 'utf8');
    const out = serializeMim(parseMim(raw));
    assert.deepEqual(JSON.parse(out), JSON.parse(raw));
  });

  it('mim empty validates', () => {
    const doc = createEmptyMim();
    assert.ok(doc.prompts.length >= 1);
  });
});

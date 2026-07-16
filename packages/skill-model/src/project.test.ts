import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectSkillSourceModeFromHints,
  getEditorForFile,
  isGeneratedArtifactPath,
  needsSourceChoiceFromHints,
} from '../src/project.ts';

describe('project mode helpers', () => {
  it('detects dsl from sourceFormat', () => {
    assert.equal(
      detectSkillSourceModeFromHints({ sourceFormat: 'dsl-v1', hasSkillEntry: false }),
      'dsl-v1',
    );
  });

  it('detects dsl from skill entry presence', () => {
    assert.equal(detectSkillSourceModeFromHints({ hasSkillEntry: true }), 'dsl-v1');
  });

  it('defaults to legacy', () => {
    assert.equal(detectSkillSourceModeFromHints({ hasSkillEntry: false }), 'legacy-artifacts');
  });

  it('flags untouched skills for a source-format choice', () => {
    assert.equal(
      needsSourceChoiceFromHints({
        hasSkillEntry: false,
        looksLikeSkill: true,
      }),
      true,
    );
    assert.equal(
      needsSourceChoiceFromHints({
        sourceFormat: 'legacy-artifacts',
        hasSkillEntry: false,
        looksLikeSkill: true,
      }),
      false,
    );
    assert.equal(
      needsSourceChoiceFromHints({
        hasSkillEntry: true,
        looksLikeSkill: true,
      }),
      false,
    );
    assert.equal(
      needsSourceChoiceFromHints({
        hasSkillEntry: false,
        looksLikeSkill: false,
      }),
      false,
    );
  });

  it('routes .jibo to jibo editor', () => {
    assert.equal(getEditorForFile('skill.jibo'), 'jibo');
  });

  it('identifies generated artifact paths', () => {
    assert.equal(isGeneratedArtifactPath('src/flows/main.flow'), true);
    assert.equal(isGeneratedArtifactPath('skill.jibo'), false);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectSkillSourceModeFromHints,
  getEditorForFile,
  isGeneratedArtifactPath,
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

  it('routes .jibo to jibo editor', () => {
    assert.equal(getEditorForFile('skill.jibo'), 'jibo');
  });

  it('identifies generated artifact paths', () => {
    assert.equal(isGeneratedArtifactPath('src/flows/main.flow'), true);
    assert.equal(isGeneratedArtifactPath('skill.jibo'), false);
  });
});

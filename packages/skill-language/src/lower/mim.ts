import type { MimDecl } from '../ast';
import { type MimDocument, createEmptyMim } from '@jibo-studio/skill-model';

export function lowerMim(mim: MimDecl): MimDocument {
  const doc = createEmptyMim();
  doc.mim_type = mim.mimType;
  doc.rule_name = mim.ruleName ?? '';
  if (mim.prompts.length) {
    doc.prompts = mim.prompts.map((p, index) => ({
      prompt_category: p.category,
      prompt_sub_category: p.sub,
      index: index + 1,
      condition: '',
      prompt: p.text,
      media: 'TTS',
      prompt_id: '',
    }));
  }
  return doc;
}

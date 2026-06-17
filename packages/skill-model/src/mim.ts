export interface MimPrompt {
  prompt_category: string;
  prompt_sub_category: string;
  index: number;
  condition: string;
  prompt: string;
  media: string;
  prompt_id: string;
}

export interface MimDocument {
  mim_type: string;
  rule_name: string;
  sample_utterances: string;
  timeout: number;
  num_tries_for_gui: number;
  barge_in: boolean;
  es_auto_tagging: boolean;
  notes: string;
  prompts: MimPrompt[];
}

export function createEmptyMim(): MimDocument {
  return {
    mim_type: 'announcement',
    rule_name: '',
    sample_utterances: '',
    timeout: 6,
    num_tries_for_gui: 2,
    barge_in: true,
    es_auto_tagging: true,
    notes: '',
    prompts: [
      {
        prompt_category: 'Entry-Core',
        prompt_sub_category: 'AN',
        index: 1,
        condition: '',
        prompt: 'Hello!',
        media: 'TTS',
        prompt_id: '',
      },
    ],
  };
}

export function parseMim(content: string): MimDocument {
  return JSON.parse(content) as MimDocument;
}

export function serializeMim(doc: MimDocument): string {
  return JSON.stringify(doc, null, '\t');
}

export function validateMim(doc: MimDocument): string[] {
  const errors: string[] = [];
  if (!doc.mim_type) errors.push('mim_type is required.');
  if (!doc.prompts.length) errors.push('At least one prompt is required.');
  for (const p of doc.prompts) {
    if (!p.prompt.trim()) errors.push('Each prompt must have text.');
  }
  return errors;
}

export const MIM_TYPES = ['announcement', 'query', 'confirm'] as const;

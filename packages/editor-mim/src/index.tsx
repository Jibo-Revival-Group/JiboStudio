import { useMemo } from 'react';
import {
  parseMim,
  serializeMim,
  validateMim,
  MIM_TYPES,
  type MimDocument,
  type MimPrompt,
} from '@jibo-studio/skill-model';
import './mim-editor.css';

export interface MimEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function MimEditor({ content, onChange, readOnly }: MimEditorProps) {
  const doc = useMemo(() => parseMim(content), [content]);
  const errors = useMemo(() => validateMim(doc), [doc]);

  const update = (patch: Partial<MimDocument>) => {
    onChange(serializeMim({ ...doc, ...patch }));
  };

  const updatePrompt = (index: number, patch: Partial<MimPrompt>) => {
    const prompts = doc.prompts.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange(serializeMim({ ...doc, prompts }));
  };

  const addPrompt = () => {
    onChange(
      serializeMim({
        ...doc,
        prompts: [
          ...doc.prompts,
          {
            prompt_category: 'Entry-Core',
            prompt_sub_category: 'AN',
            index: doc.prompts.length + 1,
            condition: '',
            prompt: '',
            media: 'TTS',
            prompt_id: '',
          },
        ],
      }),
    );
  };

  const removePrompt = (index: number) => {
    onChange(
      serializeMim({
        ...doc,
        prompts: doc.prompts.filter((_, i) => i !== index),
      }),
    );
  };

  return (
    <div className="mim-editor">
      <div className="mim-editor__header">
        <h3>MIM Editor</h3>
        {errors.length > 0 && (
          <ul className="mim-editor__errors">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mim-editor__form">
        <label>
          MIM Type
          <select
            value={doc.mim_type}
            disabled={readOnly}
            onChange={(e) => update({ mim_type: e.target.value })}
          >
            {MIM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rule Name
          <input
            value={doc.rule_name}
            disabled={readOnly}
            onChange={(e) => update({ rule_name: e.target.value })}
          />
        </label>
        <label>
          Timeout (seconds)
          <input
            type="number"
            value={doc.timeout}
            disabled={readOnly}
            onChange={(e) => update({ timeout: Number(e.target.value) })}
          />
        </label>
        <label className="mim-editor__checkbox">
          <input
            type="checkbox"
            checked={doc.barge_in}
            disabled={readOnly}
            onChange={(e) => update({ barge_in: e.target.checked })}
          />
          Barge in
        </label>
        <label>
          Notes
          <textarea
            rows={2}
            value={doc.notes}
            disabled={readOnly}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </label>
      </div>
      <div className="mim-editor__prompts">
        <div className="mim-editor__prompts-header">
          <h4>Prompts</h4>
          {!readOnly && (
            <button type="button" onClick={addPrompt}>
              + Add Prompt
            </button>
          )}
        </div>
        {doc.prompts.map((prompt, index) => (
          <div key={index} className="mim-editor__prompt-card">
            <label>
              Prompt text
              <textarea
                rows={2}
                value={prompt.prompt}
                disabled={readOnly}
                onChange={(e) => updatePrompt(index, { prompt: e.target.value })}
              />
            </label>
            <div className="mim-editor__prompt-row">
              <label>
                Category
                <input
                  value={prompt.prompt_category}
                  disabled={readOnly}
                  onChange={(e) => updatePrompt(index, { prompt_category: e.target.value })}
                />
              </label>
              <label>
                Media
                <select
                  value={prompt.media}
                  disabled={readOnly}
                  onChange={(e) => updatePrompt(index, { media: e.target.value })}
                >
                  <option value="TTS">TTS</option>
                  <option value="AUDIO">AUDIO</option>
                </select>
              </label>
            </div>
            {!readOnly && doc.prompts.length > 1 && (
              <button type="button" className="mim-editor__remove" onClick={() => removePrompt(index)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { parseMim, serializeMim };

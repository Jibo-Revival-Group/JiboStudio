import Editor from '@monaco-editor/react';
import { FlowEditor } from '@jibo-studio/editor-flow';
import { BehaviorEditor } from '@jibo-studio/editor-behavior';
import { MimEditor } from '@jibo-studio/editor-mim';
import { RulesEditor } from '@jibo-studio/editor-rules';
import type { OpenTab } from '../App';
import { MONACO_THEME, setupMonacoTheme } from '../monaco-theme';

interface TabEditorContentProps {
  tab: OpenTab;
  onChange: (content: string) => void;
}

export function TabEditorContent({ tab, onChange }: TabEditorContentProps) {
  switch (tab.editorType) {
    case 'flow':
      return <FlowEditor content={tab.content} onChange={onChange} />;
    case 'behavior':
      return <BehaviorEditor content={tab.content} onChange={onChange} />;
    case 'mim':
      return <MimEditor content={tab.content} onChange={onChange} />;
    case 'rule':
      return <RulesEditor content={tab.content} onChange={onChange} />;
    default:
      return (
        <Editor
          height="100%"
          theme={MONACO_THEME}
          language={getMonacoLanguage(tab.name)}
          defaultValue={tab.content}
          onChange={(value) => onChange(value ?? '')}
          beforeMount={setupMonacoTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      );
  }
}

function getMonacoLanguage(name: string): string {
  if (name.endsWith('.ts')) return 'typescript';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.html')) return 'html';
  if (name.endsWith('.rule')) return 'plaintext';
  return 'plaintext';
}

import type { SourceSpan } from './diagnostics';

export interface SkillMeta {
  name: string;
  display: string;
  launch: string;
  prompt: string;
  span: SourceSpan;
}

export type FlowStep =
  | { kind: 'subflow'; name: string; inputs: Record<string, string>; span: SourceSpan }
  | { kind: 'announce'; mim: string; data: Record<string, string>; span: SourceSpan }
  | { kind: 'query'; mim: string; data: Record<string, string>; span: SourceSpan }
  | { kind: 'eval'; source: string; span: SourceSpan }
  | { kind: 'animation'; name: string; span: SourceSpan }
  | { kind: 'end'; span: SourceSpan };

export interface FlowDecl {
  name: string;
  steps: FlowStep[];
  span: SourceSpan;
}

export interface MimPromptDecl {
  text: string;
  category: string;
  sub: string;
  span: SourceSpan;
}

export interface MimDecl {
  name: string;
  mimType: 'announcement' | 'query' | 'confirm';
  ruleName?: string;
  prompts: MimPromptDecl[];
  span: SourceSpan;
}

export interface RuleDecl {
  name: string;
  mode: 'raw' | 'phrases';
  raw?: string;
  phrases?: Array<{ phrase: string; action?: string }>;
  span: SourceSpan;
}

export type BehaviorNode =
  | { kind: 'sequence'; children: BehaviorNode[]; span: SourceSpan }
  | { kind: 'selector'; children: BehaviorNode[]; span: SourceSpan }
  | { kind: 'play_audio'; path: string; span: SourceSpan }
  | { kind: 'script'; source: string; span: SourceSpan };

export interface BehaviorDecl {
  name: string;
  root: BehaviorNode;
  span: SourceSpan;
}

export interface SkillModule {
  file: string;
  skill?: SkillMeta;
  flows: FlowDecl[];
  mims: MimDecl[];
  rules: RuleDecl[];
  behaviors: BehaviorDecl[];
}

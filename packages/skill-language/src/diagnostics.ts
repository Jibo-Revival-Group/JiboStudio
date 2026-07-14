export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface SourceSpan {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface Diagnostic {
  message: string;
  severity: DiagnosticSeverity;
  span: SourceSpan;
  code?: string;
}

export function spanAt(line: number, column: number, length = 1): SourceSpan {
  return {
    startLine: line,
    startColumn: column,
    endLine: line,
    endColumn: column + Math.max(length, 1),
  };
}

export function emptySpan(): SourceSpan {
  return spanAt(1, 1, 0);
}

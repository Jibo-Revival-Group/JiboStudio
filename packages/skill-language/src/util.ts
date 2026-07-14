import { createHash } from 'crypto';

/** Deterministic ID for generated flow/behavior nodes. */
export function stableId(parts: string[]): string {
  const hash = createHash('sha1').update(parts.join('\0')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export function formatScript(source: string): string[] {
  const trimmed = source.trim();
  if (!trimmed.includes('\n')) return [trimmed];
  return trimmed.split('\n');
}

export function objectLiteralFromBindings(bindings: Record<string, string>): string {
  const entries = Object.entries(bindings).map(([key, value]) => `${key}: ${value}`);
  return `{ ${entries.join(', ')} }`;
}

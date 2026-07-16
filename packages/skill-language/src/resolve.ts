import type { SkillModule } from './ast';
import type { Diagnostic } from './diagnostics';

export function resolveModule(module: SkillModule): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const flowNames = new Set(module.flows.map((f) => f.name));
  const mimNames = new Set(module.mims.map((m) => m.name));
  const behaviorNames = new Set(module.behaviors.map((b) => b.name));
  const ruleNames = new Set(module.rules.map((r) => r.name));

  const seen = new Map<string, string>();
  const checkDup = (kind: string, name: string, span: Diagnostic['span']) => {
    const key = `${kind}:${name}`;
    if (seen.has(key)) {
      diagnostics.push({
        severity: 'error',
        message: `Duplicate ${kind} '${name}'`,
        span,
        code: 'duplicate',
      });
    } else {
      seen.set(key, name);
    }
  };

  for (const flow of module.flows) {
    checkDup('flow', flow.name, flow.span);
    for (const step of flow.steps) {
      if (step.kind === 'subflow' && !flowNames.has(step.name)) {
        diagnostics.push({
          severity: 'error',
          message: `Unknown flow '${step.name}'`,
          span: step.span,
          code: 'resolve',
        });
      }
      if ((step.kind === 'announce' || step.kind === 'query') && !mimNames.has(step.mim)) {
        diagnostics.push({
          severity: 'error',
          message: `Unknown mim '${step.mim}'`,
          span: step.span,
          code: 'resolve',
        });
      }
      if (step.kind === 'behavior' && !behaviorNames.has(step.name)) {
        diagnostics.push({
          severity: 'error',
          message: `Unknown behavior '${step.name}'`,
          span: step.span,
          code: 'resolve',
        });
      }
    }
  }
  for (const mim of module.mims) {
    checkDup('mim', mim.name, mim.span);
    if (mim.prompts.length === 0) {
      diagnostics.push({
        severity: 'warning',
        message: `Mim '${mim.name}' has no 'say' prompts — a placeholder prompt will be used`,
        span: mim.span,
        code: 'resolve',
      });
    }
    if (mim.ruleName && !ruleNames.has(mim.ruleName)) {
      diagnostics.push({
        severity: 'error',
        message: `Unknown rule '${mim.ruleName}' referenced by mim '${mim.name}'`,
        span: mim.span,
        code: 'resolve',
      });
    }
  }
  for (const behavior of module.behaviors) checkDup('behavior', behavior.name, behavior.span);
  for (const rule of module.rules) checkDup('rule', rule.name, rule.span);

  if (!module.skill) {
    diagnostics.push({
      severity: 'error',
      message: 'Missing skill metadata block',
      span: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
      code: 'resolve',
    });
  }

  if (!flowNames.has('main') && module.flows.length > 0) {
    diagnostics.push({
      severity: 'warning',
      message: "No flow named 'main' — starter index.ts expects require('./flows/main')",
      span: module.flows[0]?.span ?? { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
      code: 'resolve',
    });
  }

  return diagnostics;
}

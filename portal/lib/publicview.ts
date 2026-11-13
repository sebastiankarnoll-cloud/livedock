import type { CheckResult } from "../../engine/src/types.ts";

/**
 * Customer view of a result (hard rule 4): no evidence (file, line, rule) and no review hint.
 * Kept here instead of importing the engine into the web build; test/staff.test.ts checks that it
 * strips exactly what the engine's own publicView strips.
 */
export function customerView(r: CheckResult): Omit<CheckResult, "reviewHint"> {
  const { reviewHint: _hint, findings, ...rest } = r;
  return { ...rest, findings: findings.map(({ intern: _intern, ...f }) => f) };
}

import type { Check, Finding, ProjectContext } from "../types.js";

export async function runChecks(
  ctx: ProjectContext,
  checks: Check[],
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const check of checks) {
    findings.push(...(await check.run(ctx)));
  }
  return findings;
}

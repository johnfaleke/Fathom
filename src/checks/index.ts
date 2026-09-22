import type { Check } from "../types.js";
import { envVarCheck } from "./env-vars.js";
import { dependencyCheck } from "./dependencies.js";
import { deepArchitectureCheck, docDriftCheck, testCoverageCheck } from "./deep.js";

/** Built-in deterministic checks for v0.5. */
export const builtinChecks: Check[] = [
  envVarCheck,
  dependencyCheck,
  deepArchitectureCheck,
  docDriftCheck,
  testCoverageCheck,
];

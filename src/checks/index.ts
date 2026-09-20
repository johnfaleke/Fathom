import type { Check } from "../types.js";
import { envVarCheck } from "./env-vars.js";
import { dependencyCheck } from "./dependencies.js";

/** Built-in deterministic checks for v0.1. */
export const builtinChecks: Check[] = [envVarCheck, dependencyCheck];

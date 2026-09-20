import type { ProjectContext } from "../types.js";

const DEFAULT_MAX_FILE_BYTES = 50_000;
const SENSITIVE_NAME = /(^|\/)(\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|crt|cer|der)|id_rsa(?:\..*)?|credentials(?:\..*)?|secrets?(?:\..*)?)$/i;
const BINARY_EXTENSION = /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|tar|gz|7z|woff2?|ttf|mp[34]|mov|avi|db|sqlite)$/i;

export interface AIContextPolicy {
  includePaths?: string[];
  maxFileBytes?: number;
}

export interface SafeAIContext {
  files: Record<string, string>;
  excluded: Array<{ path: string; reason: "sensitive" | "not-allowed" | "too-large" | "binary" }>;
}

export async function collectSafeAIContext(
  ctx: ProjectContext,
  policy: AIContextPolicy = {},
): Promise<SafeAIContext> {
  const maxFileBytes = policy.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const allowed = policy.includePaths ? new Set(policy.includePaths) : null;
  const files: Record<string, string> = {};
  const excluded: SafeAIContext["excluded"] = [];

  for (const relPath of ctx.files) {
    if (SENSITIVE_NAME.test(relPath)) {
      excluded.push({ path: relPath, reason: "sensitive" });
      continue;
    }
    if (allowed && !allowed.has(relPath)) {
      excluded.push({ path: relPath, reason: "not-allowed" });
      continue;
    }
    if (BINARY_EXTENSION.test(relPath)) {
      excluded.push({ path: relPath, reason: "binary" });
      continue;
    }

    const text = await ctx.readText(relPath);
    if (text === null) continue;
    if (Buffer.byteLength(text, "utf8") > maxFileBytes) {
      excluded.push({ path: relPath, reason: "too-large" });
      continue;
    }
    files[relPath] = text;
  }

  return { files, excluded };
}

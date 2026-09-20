import type { ProjectContext } from "../types.js";

const DEFAULT_MAX_FILE_BYTES = 50_000;
const SENSITIVE_NAME = /(^|\/)(\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|crt|cer|der)|id_rsa(?:\..*)?|credentials(?:\..*)?|secrets?(?:\..*)?)$/i;
const BINARY_EXTENSION = /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|tar|gz|7z|woff2?|ttf|mp[34]|mov|avi|db|sqlite)$/i;
const SECRET_ASSIGNMENT = /((?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|private[_-]?key|secret)\s*["']?\s*[:=]\s*["']?)([^\s"',}\]]+)/gi;
const BEARER_TOKEN = /(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const PEM_BLOCK = /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g;

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
    files[relPath] = redactSensitiveText(text);
  }

  return { files, excluded };
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(PEM_BLOCK, "[REDACTED_PRIVATE_KEY]")
    .replace(BEARER_TOKEN, "$1[REDACTED_TOKEN]")
    .replace(SECRET_ASSIGNMENT, "$1[REDACTED]");
}

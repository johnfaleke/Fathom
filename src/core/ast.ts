import { SourceSymbolSummary, SourceImport, SourceExport, SourceRoute } from "../types.js";

/**
 * Extracts static symbols (imports, exports, routes, environment variables)
 * from a source file using lightweight, deterministic lexical analysis.
 */
export function extractSourceSymbols(filePath: string, content: string): SourceSymbolSummary {
  const imports: SourceImport[] = [];
  const exports: SourceExport[] = [];
  const routes: SourceRoute[] = [];
  const envVars = new Set<string>();

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines or full line single comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    // 1. ENVIRONMENT VARIABLES
    const envMatches = line.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g);
    for (const match of envMatches) {
      if (match[1]) {
        envVars.add(match[1]);
      }
    }
    const envBracketMatches = line.matchAll(/(?:process\.env|import\.meta\.env)\[['"]([A-Z0-9_]+)['"]\]/g);
    for (const match of envBracketMatches) {
      if (match[1]) {
        envVars.add(match[1]);
      }
    }

    // 2. IMPORTS
    // ESM single-line import: import { a, b } from "specifier" or import type { Foo } from "specifier"
    const esmImportMatch = line.match(/^import\s+(?:type\s+)?(?:(?:\*\s+as\s+(\w+))|(?:\{([^}]+)\})|([a-zA-Z0-9_$]+))?(?:\s*,\s*\{([^}]+)\})?\s*from\s*['"]([^'"]+)['"]/);
    if (esmImportMatch) {
      const namespace = esmImportMatch[1];
      const named1 = esmImportMatch[2];
      const defaultName = esmImportMatch[3];
      const named2 = esmImportMatch[4];
      const specifier = esmImportMatch[5];

      const symbols: string[] = [];
      if (defaultName) symbols.push(defaultName);
      if (namespace) symbols.push(namespace);
      if (named1) {
        named1.split(",").forEach(s => {
          const clean = s.trim().split(/\s+as\s+/)[0].trim();
          if (clean) symbols.push(clean);
        });
      }
      if (named2) {
        named2.split(",").forEach(s => {
          const clean = s.trim().split(/\s+as\s+/)[0].trim();
          if (clean) symbols.push(clean);
        });
      }

      imports.push({
        specifier,
        symbols,
        isDefault: Boolean(defaultName),
        isNamespace: Boolean(namespace),
        isDynamic: false,
        line: lineNum,
      });
      continue;
    }

    // Bare import: import "specifier";
    const bareImportMatch = line.match(/^import\s+['"]([^'"]+)['"]/);
    if (bareImportMatch) {
      imports.push({
        specifier: bareImportMatch[1],
        symbols: [],
        isDefault: false,
        isNamespace: false,
        isDynamic: false,
        line: lineNum,
      });
      continue;
    }

    // Dynamic import: import('specifier')
    const dynamicMatches = line.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const match of dynamicMatches) {
      if (match[1]) {
        imports.push({
          specifier: match[1],
          symbols: [],
          isDefault: false,
          isNamespace: false,
          isDynamic: true,
          line: lineNum,
        });
      }
    }

    // CommonJS require: require('specifier')
    const cjsMatch = line.match(/(?:const|let|var)\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (cjsMatch) {
      const named = cjsMatch[1];
      const defaultName = cjsMatch[2];
      const specifier = cjsMatch[3];

      const symbols: string[] = [];
      if (defaultName) symbols.push(defaultName);
      if (named) {
        named.split(",").forEach(s => {
          const clean = s.trim().split(/\s*:\s*/)[0].trim();
          if (clean) symbols.push(clean);
        });
      }

      imports.push({
        specifier,
        symbols,
        isDefault: Boolean(defaultName),
        isNamespace: false,
        isDynamic: false,
        line: lineNum,
      });
      continue;
    }

    // 3. EXPORTS
    // export default function/class/expr
    if (line.match(/^export\s+default\b/)) {
      const defaultNameMatch = line.match(/^export\s+default\s+(?:function|class)?\s*([a-zA-Z0-9_$]+)?/);
      exports.push({
        name: defaultNameMatch && defaultNameMatch[1] ? defaultNameMatch[1] : "default",
        kind: "default",
        line: lineNum,
      });
      continue;
    }

    // export function / async function
    const fnMatch = line.match(/^export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/);
    if (fnMatch) {
      const name = fnMatch[1];
      exports.push({ name, kind: "function", line: lineNum });

      // Check for Next.js App Router style HTTP route exports: export async function GET/POST...
      if (["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(name)) {
        routes.push({
          method: name as any,
          path: filePath,
          line: lineNum,
        });
      }
      continue;
    }

    // export class
    const classMatch = line.match(/^export\s+class\s+([a-zA-Z0-9_$]+)/);
    if (classMatch) {
      exports.push({ name: classMatch[1], kind: "class", line: lineNum });
      continue;
    }

    // export interface / type
    const interfaceMatch = line.match(/^export\s+interface\s+([a-zA-Z0-9_$]+)/);
    if (interfaceMatch) {
      exports.push({ name: interfaceMatch[1], kind: "interface", line: lineNum });
      continue;
    }

    const typeMatch = line.match(/^export\s+type\s+([a-zA-Z0-9_$]+)/);
    if (typeMatch) {
      exports.push({ name: typeMatch[1], kind: "type", line: lineNum });
      continue;
    }

    // export const / let / var
    const constMatch = line.match(/^export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/);
    if (constMatch) {
      exports.push({ name: constMatch[1], kind: "const", line: lineNum });
      continue;
    }

    // export { a, b, c }
    const namedExportMatch = line.match(/^export\s*\{([^}]+)\}/);
    if (namedExportMatch) {
      namedExportMatch[1].split(",").forEach(s => {
        const clean = s.trim().split(/\s+as\s+/)[0].trim();
        if (clean) {
          exports.push({ name: clean, kind: "const", line: lineNum });
        }
      });
      continue;
    }

    // 4. ROUTE DEFINITIONS (Express, Fastify, Hono, Router)
    const routeMatch = line.match(/(?:app|router|server)\.(get|post|put|patch|delete|all|use)\s*\(\s*['"]([^'"]+)['"]/i);
    if (routeMatch) {
      routes.push({
        method: routeMatch[1].toUpperCase() as any,
        path: routeMatch[2],
        line: lineNum,
      });
    }
  }

  return {
    filePath,
    imports,
    exports,
    routes,
    envVars: Array.from(envVars).sort(),
  };
}

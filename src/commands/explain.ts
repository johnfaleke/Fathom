import path from "node:path";
import { isInitialized } from "../core/storage.js";
import { takeProjectSounding } from "../core/sounding.js";
import { buildExplanation } from "../core/completion.js";
import { renderExplanation } from "../render/terminal.js";

export async function cmdExplain(
  cwd: string,
  targetId?: string,
  opts: { json?: boolean } = {},
): Promise<number> {
  const root = path.resolve(cwd);

  if (!(await isInitialized(root))) {
    const msg = "Fathom is not initialized. Run `fathom init` first.";
    if (opts.json) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(msg);
    }
    return 1;
  }

  const sounding = await takeProjectSounding(root);

  if (!targetId || targetId.trim().length === 0) {
    if (sounding.needsAttention.length === 0) {
      if (opts.json) {
        console.log(JSON.stringify({ message: "No active findings to explain." }, null, 2));
      } else {
        console.log("No active findings to explain. Workspace is clean.");
      }
      return 0;
    }

    const availableCodes = sounding.needsAttention.map((f) => `  • ${f.code}: ${f.message}`).join("\n");
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            error: "Please specify a finding ID to explain.",
            available: sounding.needsAttention.map((f) => ({ code: f.code, id: f.id, message: f.message })),
          },
          null,
          2,
        ),
      );
    } else {
      console.log("Please specify a finding ID to explain:\n");
      console.log(availableCodes);
      console.log("\nUsage: fathom explain <finding-id> (e.g. fathom explain FND-01)\n");
    }
    return 1;
  }

  const explanation = buildExplanation(targetId, sounding);

  if (!explanation) {
    const msg = `Finding '${targetId}' not found in current project sounding.`;
    if (opts.json) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(msg);
      if (sounding.needsAttention.length > 0) {
        console.error("Available findings:\n" + sounding.needsAttention.map((f) => `  • ${f.code}: ${f.message}`).join("\n"));
      }
    }
    return 1;
  }

  if (opts.json) {
    console.log(JSON.stringify(explanation, null, 2));
  } else {
    process.stdout.write(renderExplanation(explanation));
  }

  return 0;
}

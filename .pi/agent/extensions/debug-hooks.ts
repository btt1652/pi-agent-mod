/**
 * Debug Hooks Extension — logs the agent's internal behavior
 *
 * Place in: .pi/agent/extensions/debug-hooks.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LOG = "[DEBUG]";

let turnCount = 0;
let lastTokenCount: number | null = null;

export default function (pi: ExtensionAPI) {
  // ── tool_call: fires BEFORE every tool execution ────────────────
  pi.on("tool_call", async (event, ctx) => {
    turnCount++;
    const usage = ctx.getContextUsage();

    ctx.ui.notify(
      `${LOG} tool_call #${turnCount}: ${event.toolName}`,
      "warning",
    );
    ctx.ui.notify(
      `  → input: ${JSON.stringify(event.input, null, 2).slice(0, 500)}`,
      "warning",
    );
    ctx.ui.notify(
      `  → tokens: ${usage?.tokens ?? "?"}`,
      "warning",
    );
  });

  // ── turn_end: fires AFTER each turn finishes ────────────────────
  pi.on("turn_end", async (_event, ctx) => {
    const usage = ctx.getContextUsage();
    const currentTokens = usage?.tokens ?? null;

    let delta = "";
    if (currentTokens != null) {
      if (lastTokenCount == null) {
        delta = `+${currentTokens.toLocaleString()} total`;
      } else {
        const d = currentTokens - lastTokenCount;
        const s = d >= 0 ? "+" : "";
        delta = `${s}${d.toLocaleString()} (total: ${currentTokens.toLocaleString()})`;
      }
      lastTokenCount = currentTokens;
    }

    ctx.ui.notify(
      `${LOG} turn_end #${turnCount}: context ${delta}`,
      "warning",
    );
  });

  // ── Uncomment below to test for more hooks ──────────────────────
  // If the hook doesn't exist on your version, it will be ignored or throw.


  pi.on("turn_start", async (event, ctx) => {
    ctx.ui.notify(`${LOG} turn_start`, "warning");
    ctx.ui.notify(
      `  → event: ${JSON.stringify(event, null, 2).slice(0, 500)}`,
      "warning",
    );
  });

  pi.on("llm_response", async (event, ctx) => {
    ctx.ui.notify(`${LOG} llm_response`, "warning");
    ctx.ui.notify(
      `  → text (first 300): ${(event.text ?? "").slice(0, 300)}`,
      "warning",
    );
  });

  pi.on("session_start", async (event, ctx) => {
    ctx.ui.notify(`${LOG} session_start`, "warning");
    ctx.ui.notify(
      `  → event: ${JSON.stringify(event, null, 2).slice(0, 500)}`,
      "warning",
    );
  });

  pi.on("session_end", async (event, ctx) => {
    ctx.ui.notify(`${LOG} session_end`, "warning");
    ctx.ui.notify(
      `  → event: ${JSON.stringify(event, null, 2).slice(0, 500)}`,
      "warning",
    );
  });

  pi.on("error", async (event, ctx) => {
    ctx.ui.notify(`${LOG} error`, "warning");
    ctx.ui.notify(
      `  → message: ${event.message ?? event.error ?? "unknown"}`,
      "warning",
    );
  });

  pi.on("user_message", async (event, ctx) => {
    ctx.ui.notify(`${LOG} user_message`, "warning");
    ctx.ui.notify(
      `  → text (first 300): ${(event.text ?? "").slice(0, 300)}`,
      "warning",
    );
  });

}

/**
 * Context Usage Extension
 *
 * At the end of each turn, shows the token difference from the previous turn.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let lastTokenCount: number | null = null;

  pi.on("turn_end", async (_event, ctx) => {
    const usage = ctx.getContextUsage();
    const currentTokens = usage?.tokens ?? null;

    if (currentTokens == null) {
      ctx.ui.notify("[Context] Token count unavailable", "warning");
      return;
    }

    if (lastTokenCount == null) {
      ctx.ui.notify(`Context +${currentTokens.toLocaleString()} tokens`, "info");
    } else {
      const delta = currentTokens - lastTokenCount;
      const sign = delta >= 0 ? "+" : "";
      ctx.ui.notify(`Context ${sign}${delta.toLocaleString()} tokens`, "info");
    }
    lastTokenCount = currentTokens;
  });
}

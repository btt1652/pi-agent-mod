/**
 * File Edit Confirmation Extension
 *
 * Asks for user confirmation before every file edit or write operation.
 * Once confirmed per session, the tool stays active for that session.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const CONFIRMED_TOOLS_KEY = "confirmed_edit_tools";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    const fileTools = ["edit", "write"];
    if (!fileTools.includes(event.toolName)) {
      return;
    }

    // Track confirmed tools per session
    let confirmed: string[] = [];
    try {
      const entries = await ctx.sessionManager.getEntries();
      const customEntry = entries.find(
        (e) => e.type === "custom" && (e as any).customType === CONFIRMED_TOOLS_KEY,
      );
      if (customEntry && Array.isArray((customEntry as any).data)) {
        confirmed = (customEntry as any).data;
      }
    } catch {
      // No stored state yet — start fresh
    }

    // If already confirmed this session, skip
    if (confirmed.includes(event.toolName)) {
      return;
    }

    // Get the target file from tool arguments
    let filePath = "";
    if (event.toolName === "edit") {
      const input = event.input as { path?: string };
      filePath = input.path ?? "unknown file";
    } else if (event.toolName === "write") {
      const input = event.input as { path?: string };
      filePath = input.path ?? "unknown file";
    }

    // Ask for confirmation
    const allowed = await ctx.ui.confirm(
      "Allow file edit?",
      `${event.toolName.toUpperCase()} → ${filePath}`,
    );

    if (!allowed) {
      return { block: true, reason: `${event.toolName} was not approved by user` };
    }

    // Store confirmation so we don't ask again this session
    confirmed.push(event.toolName);
    try {
      await ctx.sessionManager.appendEntry({
        type: "custom",
        id: `confirm-${event.toolName}-${Date.now()}`,
        parentId: null,
        timestamp: new Date().toISOString(),
        customType: CONFIRMED_TOOLS_KEY,
        data: confirmed,
      });
    } catch {
      // Append may fail in some contexts — non-fatal
    }
  });
}

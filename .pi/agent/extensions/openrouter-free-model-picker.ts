/**
 * OpenRouter Free Model Picker — ranks free models by capability
 *
 * Place in: .pi/agent/extensions/openrouter-free-model-picker.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("openrouter-free", {
    description:
      "Query OpenRouter for free models, rank them by capability, and display the best picks",
    handler: async (_args: string, ctx) => {
      // Build query params — filter free models server-side, sort by popularity
      const params = new URLSearchParams({
          max_price: "0",
          max_output_price: "0",
          sort: "most-popular",
          input_modalities: "text",
          limit: "40",
      });

      let models: Array<{
        id: string;
        name?: string;
        context_length?: number;
        pricing?: { prompt?: string; completion?: string };
        architecture?: { input_modalities?: string[]; output_modalities?: string[] };
        supported_parameters?: string[];
        benchmarks?: {
          artificial_analysis?: {
            coding_index?: number;
            intelligence_index?: number;
            agentic_index?: number;
          };
        };
        created?: number;
        expiration_date?: string;
        description?: string;
      }>;

      try {
        const res = await fetch(OPENROUTER_API_URL + "?" + params.toString(), {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const errText = await res.text();
          ctx.ui.notify(
            `❌ OpenRouter API error (${res.status}): ${errText.slice(0, 300)}`,
            "error",
          );
          return;
        }

        const json = (await res.json()) as {
          data: Array<Record<string, unknown>>;
        };
        models = json.data as typeof models;
      } catch (err) {
        ctx.ui.notify(
          `❌ Failed to fetch models: ${(err as Error).message}`,
          "error",
        );
        return;
      }

      // Filter free models (both prompt and completion must be free)
      const freeModels = models.filter((m) => {
        const p = m.pricing?.prompt;
        const c = m.pricing?.completion;
        return p === "0" && c === "0";
      });

      if (freeModels.length === 0) {
        ctx.ui.notify("📭 No free models found on OpenRouter.", "info");
        return;
      }

      // Extract indices from benchmarks.artificial_analysis
      function getIdx(m: (typeof freeModels)[0], key: string): number {
        const ba = m.benchmarks?.artificial_analysis;
        if (!ba) return -1;
        const raw = (ba as Record<string, unknown>)[key];
        return typeof raw === "number" ? raw : -1;
      }

      // ── Scoring ──────────────────────────────────────────────────────
      // Only scores models that have benchmark data. Models without
      // benchmarks get no score and fall to the bottom.
      function score(m: (typeof freeModels)[0]): number {
        const codingIdx = getIdx(m, "coding_index");
        const intIdx = getIdx(m, "intelligence_index");
        const agenticIdx = getIdx(m, "agentic_index");

        // No benchmarks → skip scoring (will sort last)
        if (codingIdx < 0 || intIdx < 0 || agenticIdx < 0) return -1;

        let s = 0;
        s += Math.min(codingIdx / 100, 1) * 35;
        s += Math.min(intIdx / 100, 1) * 30;
        s += Math.min(agenticIdx / 100, 1) * 35;
        return s;
      }

      freeModels.forEach((m) => {
        (m as Record<string, unknown>).qualityScore = score(m);
      });

      freeModels.sort(
        (a, b) =>
          ((b as Record<string, unknown>).qualityScore as number) -
          ((a as Record<string, unknown>).qualityScore as number),
      );

      const top = freeModels.slice(0, 15);

      // ── Format output ────────────────────────────────────────────────
      const padId = Math.max(...top.map((m) => String(m.id ?? "").length));
      const lines = [
        // `OpenRouter free models`,
        `${"#".padEnd(4)} ${"Model".padEnd(padId + 2)} Ctx  Cod Int Agt Created  Expires  In:Out`,
        `${"-".repeat(padId + 70)}`
      ];

      function fmtCtx(ctx?: number): string {
        if (!ctx) return "—";
        if (ctx >= 1_000_000) return `${Math.round(ctx / 1_000_000)}M`;
        if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}K`;
        return String(ctx);
      }

      function fmtDate(val: string | number | undefined): string {
        if (!val) return "—";
        let d: Date;
        if (typeof val === "number") {
          d = new Date(val * 1000);
        } else {
          // ISO date string like "2026-12-31"
          d = new Date(val + "T00:00:00Z");
        }
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
      }

      function idx(val: number): string {
        return val >= 0 ? String(Math.round(val)) : "—";
      }

      top.forEach((m, i) => {
        const arch = m.architecture as { input_modalities?: string[]; output_modalities?: string[] } | undefined;
        const inMod = (arch?.input_modalities ?? []).join("/") || "—";
        const outMod = (arch?.output_modalities ?? []).join("/") || "—";
        const ioMod = `${inMod}:${outMod}`;
        const codingIdx = getIdx(m, "coding_index");
        const intIdx = getIdx(m, "intelligence_index");
        const agenticIdx = getIdx(m, "agentic_index");
        const ctxStr = fmtCtx(m.context_length);
        lines.push(
          `${String(i + 1).padEnd(4)} ${String(m.id).padEnd(padId + 2)} ${ctxStr.padEnd(4)} ${idx(codingIdx).padEnd(3)} ${idx(intIdx).padEnd(3)} ${idx(agenticIdx).padEnd(3)} ${fmtDate(m.created) ?? "—".padEnd(8)} ${(m.expiration_date?.replace(/-/g, "") ?? "—").padEnd(8)} ${ioMod}`,
        );
      });

      const fullMessage = lines.join("\n");

      // Split into chunks if too long for a single notify
      const CHUNK = 2000;
      if (fullMessage.length <= CHUNK) {
        ctx.ui.notify(fullMessage, "info");
      } else {
        ctx.ui.notify(fullMessage.slice(0, CHUNK), "info");
        ctx.ui.notify(fullMessage.slice(CHUNK), "info");
      }
    },
  });
}

import type Anthropic from "@anthropic-ai/sdk";
import { SAMPLE_SHORT_SCRIPT, ScriptDraftSchema } from "@metaficta/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { loadChannel } from "../src/config";
import { LlmClient, RefusalError } from "../src/llm";
import { fillTemplate } from "../src/prompts";
import { formatRules, normalizeDraft, systemPrompt } from "../src/script-gen";

const { id, topic, format, language, series, theme, createdAt, parentId, ...draft } = SAMPLE_SHORT_SCRIPT;

/** Sırayla verilen metinleri döndüren sahte Anthropic istemcisi. */
const fakeClient = (responses: { text: string; stop_reason?: string }[]) => {
  const calls: { messages: unknown[] }[] = [];
  const message = (r: { text: string; stop_reason?: string }) => ({
    content: [{ type: "text", text: r.text }],
    stop_reason: r.stop_reason ?? "end_turn",
    stop_details: r.stop_reason === "refusal" ? { type: "refusal", category: null, explanation: "test" } : null,
    usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  });
  const client = {
    beta: {
      messages: {
        stream: (params: { messages: unknown[] }) => {
          calls.push({ messages: [...params.messages] });
          const next = responses.shift();
          if (!next) throw new Error("no more responses");
          return { finalMessage: async () => message(next) };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, calls };
};

describe("fillTemplate", () => {
  it("fills nested variables", () => {
    expect(fillTemplate("Kanal: {{channel.name}} ({{count}})", { channel: { name: "Metaficta" }, count: 3 })).toBe("Kanal: Metaficta (3)");
  });
  it("throws on missing variables", () => {
    expect(() => fillTemplate("{{missing}}", {})).toThrow(/missing/);
  });
});

describe("prompts", () => {
  it("renders the system prompt with channel info and scene catalog", () => {
    const prompt = systemPrompt();
    expect(prompt).toContain("Metaficta");
    expect(prompt).toContain("CharacterCard");
    expect(prompt).not.toMatch(/\{\{/);
  });
  it("gives format-specific rules", () => {
    const channel = loadChannel();
    expect(formatRules("short", channel)).toContain("loopLine zorunlu");
    expect(formatRules("long", channel)).toContain("ChapterTitle");
  });
});

describe("normalizeDraft", () => {
  it("renumbers scene ids and drops the first transition", () => {
    const messy = { ...draft, scenes: draft.scenes.map((s, i) => ({ ...s, id: `x${i * 7}`, transition: "flash" as const })) };
    const fixed = normalizeDraft(messy);
    expect(fixed.scenes.map((s) => s.id)).toEqual(["s01", "s02", "s03", "s04"]);
    expect(fixed.scenes[0].transition).toBeUndefined();
    expect(fixed.scenes[1].transition).toBe("flash");
  });
});

describe("LlmClient.structured", () => {
  it("returns parsed output on the first valid response", async () => {
    const { client } = fakeClient([{ text: JSON.stringify(draft) }]);
    const result = await new LlmClient(client, "claude-opus-5-5").structured(ScriptDraftSchema, "sys", "prompt");
    expect(result.workingTitle).toBe(draft.workingTitle);
  });

  it("asks the model to repair schema violations", async () => {
    const broken = { ...draft, scenes: [{ ...draft.scenes[0], type: "Unknown" }] };
    const { client, calls } = fakeClient([{ text: JSON.stringify(broken) }, { text: JSON.stringify(draft) }]);
    const llm = new LlmClient(client, "claude-opus-5-5");
    const result = await llm.structured(ScriptDraftSchema, "sys", "prompt");
    expect(result.scenes).toHaveLength(draft.scenes.length);
    expect(calls).toHaveLength(2);
    // İkinci çağrı: orijinal istek + modelin hatalı cevabı + düzeltme talebi
    expect(calls[1].messages).toHaveLength(3);
    expect(llm.usage.output).toBe(100);
  });

  it("repairs invalid JSON too", async () => {
    const { client } = fakeClient([{ text: "{ bozuk" }, { text: JSON.stringify({ ok: true }) }]);
    await expect(new LlmClient(client).structured(z.object({ ok: z.boolean() }), "sys", "p")).resolves.toEqual({ ok: true });
  });

  it("surfaces refusals instead of retrying", async () => {
    const { client } = fakeClient([{ text: "", stop_reason: "refusal" }]);
    await expect(new LlmClient(client).structured(z.object({ ok: z.boolean() }), "sys", "p")).rejects.toBeInstanceOf(RefusalError);
  });

  it("gives up after three invalid attempts", async () => {
    const { client } = fakeClient([{ text: "x" }, { text: "y" }, { text: "z" }]);
    await expect(new LlmClient(client).structured(z.object({ ok: z.boolean() }), "sys", "p")).rejects.toThrow(/3 denemede/);
  });

  it("estimates cost from token usage", async () => {
    const { client } = fakeClient([{ text: JSON.stringify({ ok: true }) }]);
    const llm = new LlmClient(client, "claude-opus-5-5");
    await llm.structured(z.object({ ok: z.boolean() }), "sys", "p");
    expect(llm.estimatedCostUsd()).toBeCloseTo((100 * 4 + 50 * 20) / 1_000_000);
  });
});

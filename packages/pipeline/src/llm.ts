import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODEL } from "./config";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
type BetaMessage = Anthropic.Beta.BetaMessage;

/*
 * Sunucu tarafı yedek model: güvenlik sınıflandırıcısı bir isteği reddederse API aynı isteği
 * otomatik olarak uygun bir modelle yeniden çalıştırır (ör. mitolojideki savaş/ölüm anlatımları).
 */
const BETAS: Anthropic.Beta.AnthropicBeta[] = ["server-side-fallback-2026-07-01"];

/** Yaklaşık fiyatlar ($ / 1M token) — maliyet tahmini için. */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
};

export class RefusalError extends Error {}

export class LlmClient {
  readonly usage = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, webSearches: 0 };

  constructor(
    private readonly client: Anthropic = new Anthropic(),
    readonly model: string = MODEL,
  ) {}

  /** Web araması yapan araştırma çağrısı; Markdown araştırma özeti döndürür. */
  async research(system: string, prompt: string): Promise<string> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
    // Sunucu araçları uzun sürerse API turu "pause_turn" ile böler; aynı konuşmayla devam edilir.
    for (let turn = 0; turn < 6; turn++) {
      const message = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: BETAS,
        fallbacks: "default",
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
        output_config: { effort: "medium" },
        messages,
      });
      this.track(message);
      this.assertUsable(message);
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      return textOf(message);
    }
    throw new Error("Araştırma tamamlanamadı (çok fazla pause_turn).");
  }

  /**
   * Zod şemasına uyan JSON üretir. Model şemadan saparsa hataları kendisine gösterip
   * düzeltilmiş tam JSON ister (en fazla 2 onarım denemesi).
   */
  async structured<T>(schema: z.ZodType<T>, system: string, prompt: string, effort: Effort = "high"): Promise<T> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
    for (let attempt = 0; attempt < 3; attempt++) {
      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: 64000,
        betas: BETAS,
        fallbacks: "default",
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        output_config: { effort, format: zodOutputFormat(schema) },
        messages,
      });
      const message = await stream.finalMessage();
      this.track(message);
      this.assertUsable(message);
      if (message.stop_reason === "max_tokens") throw new Error("Çıktı max_tokens sınırına takıldı; senaryo çok uzun.");

      const problem = validate(schema, textOf(message));
      if (problem.ok) return problem.data;

      messages.push({ role: "assistant", content: message.content });
      messages.push({
        role: "user",
        content: `Çıktın şemaya uymuyor:\n\n${problem.error}\n\nBu hataları düzelterek TAM JSON çıktısını yeniden ver. İçeriği değiştirme, sadece hataları düzelt.`,
      });
    }
    throw new Error("Model 3 denemede de şemaya uygun çıktı üretemedi.");
  }

  /** Bu oturumda harcanan tahmini tutar (web arama ücreti hariç). */
  estimatedCostUsd(): number {
    const price = PRICES[this.model];
    if (!price) return Number.NaN;
    const { input, output, cacheWrite, cacheRead } = this.usage;
    return (input * price.input + cacheWrite * price.input * 1.25 + cacheRead * price.cacheRead + output * price.output) / 1_000_000;
  }

  private track(message: BetaMessage) {
    const u = message.usage;
    this.usage.input += u.input_tokens;
    this.usage.output += u.output_tokens;
    this.usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
    this.usage.cacheRead += u.cache_read_input_tokens ?? 0;
    this.usage.webSearches += u.server_tool_use?.web_search_requests ?? 0;
  }

  private assertUsable(message: BetaMessage) {
    if (message.stop_reason === "refusal") {
      const details = message.stop_details;
      throw new RefusalError(`Model isteği reddetti${details?.category ? ` (${details.category})` : ""}: ${details?.explanation ?? "açıklama yok"}`);
    }
  }
}

const textOf = (message: BetaMessage): string =>
  message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

const validate = <T>(schema: z.ZodType<T>, text: string): { ok: true; data: T } | { ok: false; error: string } => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: `Geçerli JSON değil: ${(error as Error).message}` };
  }
  const result = schema.safeParse(json);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: z.prettifyError(result.error) };
};

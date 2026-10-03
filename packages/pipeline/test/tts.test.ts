import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SAMPLE_SHORT_SCRIPT, type WordTiming } from "@metaficta/core";
import { describe, expect, it } from "vitest";
import type { Project } from "../src/project";
import { alignWords } from "../src/tts/align";
import type { TtsProvider, TtsResult } from "../src/tts/azure";
import { applyPronunciations, buildSsml } from "../src/tts/ssml";
import { voiceProject } from "../src/tts/voice";

const voice = { provider: "azure" as const, voice: "tr-TR-AhmetNeural", rate: "-6%", pitch: "-3%", sentencePauseMs: 350, musicVolume: 0.2 };

describe("buildSsml", () => {
  it("wraps text with voice, prosody and sentence pause", () => {
    const ssml = buildSsml("Merhaba dünya.", voice);
    expect(ssml).toContain('<voice name="tr-TR-AhmetNeural">');
    expect(ssml).toContain('<prosody rate="-6%" pitch="-3%">Merhaba dünya.</prosody>');
    expect(ssml).toContain('type="Sentenceboundary" value="350ms"');
  });

  it("escapes XML special characters", () => {
    expect(buildSsml(`Zeus & Odin <savaş> "kim" kazanır?`, voice)).toContain("Zeus &amp; Odin &lt;savaş&gt; &quot;kim&quot; kazanır?");
  });
});

describe("applyPronunciations", () => {
  const dict = { Yggdrasil: "İgdrasil", "Codex Regius": "Kodeks Regius", Codex: "Kodeks" };

  it("keeps Turkish suffixes after the replaced word", () => {
    expect(applyPronunciations("Yggdrasil&apos;de asılı kaldı", dict)).toBe('<sub alias="İgdrasil">Yggdrasil</sub>&apos;de asılı kaldı');
  });

  it("is case-insensitive and prefers longer phrases", () => {
    expect(applyPronunciations("codex regius ve Codex", dict)).toBe('<sub alias="Kodeks Regius">codex regius</sub> ve <sub alias="Kodeks">Codex</sub>');
  });

  it("does not replace inside other words", () => {
    expect(applyPronunciations("Yggdrasiller", dict)).toBe("Yggdrasiller");
  });
});

const b = (text: string, start: number, end: number): WordTiming => ({ text, start, end });

describe("alignWords", () => {
  it("maps narration words to TTS timings, keeping punctuation in the caption text", () => {
    const words = alignWords("Dokuz gece. Ne yemek!", [b("Dokuz", 0, 0.4), b("gece", 0.4, 0.8), b("Ne", 1.2, 1.4), b("yemek", 1.4, 1.9)], 2);
    expect(words).toEqual([b("Dokuz", 0, 0.4), b("gece.", 0.4, 0.8), b("Ne", 1.2, 1.4), b("yemek!", 1.4, 1.9)]);
  });

  it("joins words that TTS splits (Turkish suffixes)", () => {
    const words = alignWords("Yggdrasil'de asılı", [b("Yggdrasil", 0, 0.6), b("de", 0.6, 0.8), b("asılı", 0.8, 1.2)], 1.3);
    expect(words).toEqual([b("Yggdrasil'de", 0, 0.8), b("asılı", 0.8, 1.2)]);
  });

  it("interpolates words whose spoken form differs (pronunciation aliases)", () => {
    const words = alignWords("Mjölnir dağları yıktı", [b("Myölnir", 0, 0.5), b("dağları", 0.6, 1.0), b("yıktı", 1.0, 1.4)], 1.5);
    expect(words[0].text).toBe("Mjölnir");
    expect(words[0].start).toBe(0);
    expect(words[0].end).toBeCloseTo(0.6);
    expect(words[1]).toEqual(b("dağları", 0.6, 1.0));
  });

  it("falls back to an even spread when there are no boundaries", () => {
    const words = alignWords("bir iki üç", [], 3);
    expect(words).toHaveLength(3);
    expect(words[0].start).toBe(0);
    expect(words[2].end).toBeCloseTo(3);
  });
});

/** Her metin için sahte ses üreten TTS; çağrıları sayar, istenirse ilk çağrıda 429 döner. */
class FakeTts implements TtsProvider {
  calls: string[] = [];
  constructor(private rateLimitFirst = false) {}
  async synthesize(ssml: string): Promise<TtsResult> {
    this.calls.push(ssml);
    if (this.rateLimitFirst && this.calls.length === 1) throw new Error("Azure TTS hatası: 429 Too Many Requests");
    const text = ssml.replace(/<[^>]+>/g, "");
    const words = text.split(/\s+/).filter(Boolean);
    return { audio: Buffer.from(`mp3:${text}`), durationSec: words.length * 0.4, boundaries: words.map((w, i) => b(w.replace(/[^\p{L}]/gu, ""), i * 0.4, i * 0.4 + 0.35)) };
  }
}

const tempProject = (): Project => ({
  dir: mkdtempSync(path.join(tmpdir(), "metaficta-voice-")),
  script: structuredClone(SAMPLE_SHORT_SCRIPT),
  status: { stage: "approved", updatedAt: "", history: [] },
});

describe("voiceProject", () => {
  const opts = { voice, pronunciations: {}, retryDelaysMs: [1] };

  it("voices every scene and writes a manifest with word timings", async () => {
    const project = tempProject();
    const tts = new FakeTts();
    const summary = await voiceProject(project, tts, opts);
    expect(summary.synthesized).toBe(project.script.scenes.length);
    const manifest = JSON.parse(readFileSync(path.join(project.dir, "audio/manifest.json"), "utf8"));
    expect(manifest.s01.src).toBe("audio/s01.mp3");
    expect(manifest.s01.words[0].text).toBe(project.script.scenes[0].narration.split(" ")[0]);
    expect(existsSync(path.join(project.dir, "audio/s04.mp3"))).toBe(true);
    // Önizleme gerçek sürelerle yenilenir
    expect(existsSync(path.join(project.dir, "script.md"))).toBe(true);
  });

  it("skips unchanged scenes and re-voices only edited ones", async () => {
    const project = tempProject();
    await voiceProject(project, new FakeTts(), opts);
    project.script.scenes[1] = { ...project.script.scenes[1], narration: "Yeni bir cümle." };
    const tts = new FakeTts();
    const summary = await voiceProject(project, tts, opts);
    expect(tts.calls).toHaveLength(1);
    expect(summary).toMatchObject({ synthesized: 1, skipped: project.script.scenes.length - 1 });
  });

  it("re-voices everything when the voice changes", async () => {
    const project = tempProject();
    await voiceProject(project, new FakeTts(), opts);
    const tts = new FakeTts();
    await voiceProject(project, tts, { ...opts, voice: { ...voice, voice: "tr-TR-EmelNeural" } });
    expect(tts.calls).toHaveLength(project.script.scenes.length);
  });

  it("retries after a rate limit error", async () => {
    const project = tempProject();
    const tts = new FakeTts(true);
    const summary = await voiceProject(project, tts, opts);
    expect(summary.synthesized).toBe(project.script.scenes.length);
    expect(tts.calls).toHaveLength(project.script.scenes.length + 1);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  chapterMarkers,
  collectImages,
  formatTimestamp,
  renderScriptMarkdown,
  SAMPLE_LONG_SCRIPT,
  SAMPLE_SHORT_SCRIPT,
  ScriptSchema,
  slugify,
  STING_FRAMES,
  TRANSITION_FRAMES,
} from "../src";

describe("samples", () => {
  it("validate against the script schema", () => {
    expect(() => ScriptSchema.parse(SAMPLE_LONG_SCRIPT)).not.toThrow();
    expect(() => ScriptSchema.parse(SAMPLE_SHORT_SCRIPT)).not.toThrow();
  });
});

describe("buildTimeline", () => {
  it("inserts the logo sting after a long video's cold open", () => {
    const tl = buildTimeline({ script: SAMPLE_LONG_SCRIPT, audio: {} });
    expect(tl.items[0].kind).toBe("scene");
    expect(tl.items[1].kind).toBe("sting");
    expect(tl.items).toHaveLength(SAMPLE_LONG_SCRIPT.scenes.length + 1);
  });

  it("never inserts a sting into shorts", () => {
    const tl = buildTimeline({ script: SAMPLE_SHORT_SCRIPT, audio: {} });
    expect(tl.items.every((i) => i.kind === "scene")).toBe(true);
  });

  it("uses real audio duration when available and overlaps transitions", () => {
    const script = { ...SAMPLE_SHORT_SCRIPT, scenes: SAMPLE_SHORT_SCRIPT.scenes.slice(0, 2) };
    const tl = buildTimeline({ script, audio: { s01: { src: "a.mp3", durationSec: 4 }, s02: { src: "b.mp3", durationSec: 6 } } });
    const [a, b] = tl.items;
    // 4s + 0.5s nefes payı = 135 kare, + sonraki geçiş kadar bindirme
    expect(a.durationInFrames).toBe(135 + TRANSITION_FRAMES);
    expect(b.from).toBe(135);
    expect(tl.durationInFrames).toBe(135 + 195);
  });

  it("produces chapter markers starting at 0:00", () => {
    const markers = chapterMarkers(buildTimeline({ script: SAMPLE_LONG_SCRIPT, audio: {} }));
    expect(markers[0]).toEqual({ time: "0:00", title: "Giriş" });
    expect(markers.map((m) => m.title)).toContain("Karşılaşma");
    expect(STING_FRAMES).toBeGreaterThan(0);
  });
});

describe("helpers", () => {
  it("slugifies Turkish text", () => {
    expect(slugify("Zeus vs Odin — Kim Kazanırdı?")).toBe("zeus-vs-odin-kim-kazanirdi");
    expect(slugify("Göbeklitepe: Tarihi Yeniden Yazan Tapınak")).toBe("gobeklitepe-tarihi-yeniden-yazan-tapinak");
  });

  it("formats timestamps", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65.9)).toBe("1:05");
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });

  it("collects unique images", () => {
    const ids = collectImages(SAMPLE_LONG_SCRIPT).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("zeus-portrait");
    expect(ids).toContain("odin-portrait");
  });

  it("renders a markdown preview", () => {
    const md = renderScriptMarkdown(SAMPLE_LONG_SCRIPT);
    expect(md).toContain("# Zeus vs Odin — Kim Kazanırdı?");
    expect(md).toContain("METAFICTA logo animasyonu");
    expect(md).toContain("## Bölümler (YouTube)");
  });
});

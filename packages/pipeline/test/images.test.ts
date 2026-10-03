import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SAMPLE_LONG_SCRIPT, SAMPLE_SHORT_SCRIPT, type Script } from "@metaficta/core";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { loadImagesConfig } from "../src/config";
import { characterLibraryPrompt, listCharacters, saveCharacter } from "../src/images/characters";
import { buildImagePrompt, estimateNeurons, generateProjectImages, pickCandidate, generateCharacterCandidates } from "../src/images/generate";
import { CloudflareImageProvider, detectExtension, type ImageProvider, type ImageRequest, ImageRefusedError } from "../src/images/provider";
import type { Project } from "../src/project";

const config = loadImagesConfig();
let png: Buffer;
beforeAll(async () => {
  png = await sharp({ create: { width: 64, height: 36, channels: 3, background: "#c90" } }).png().toBuffer();
});

describe("detectExtension", () => {
  it("recognizes png and jpeg", async () => {
    expect(detectExtension(png)).toBe("png");
    expect(detectExtension(await sharp(png).jpeg().toBuffer())).toBe("jpg");
    expect(() => detectExtension(Buffer.from("hello"))).toThrow();
  });
});

describe("CloudflareImageProvider", () => {
  const capture = (response: Response) => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return response;
    }) as unknown as typeof fetch;
    return { calls, provider: new CloudflareImageProvider("acc123", "tok456", "@cf/black-forest-labs/flux-2-klein-4b", fetchImpl) };
  };

  it("sends multipart fields and reference images, accepts raw image bytes", async () => {
    const { calls, provider } = capture(new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } }));
    const result = await provider.generate({ prompt: "Zeus", width: 1536, height: 864, references: [png, png] });
    expect(result.extension).toBe("png");
    expect(calls[0].url).toBe("https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/@cf/black-forest-labs/flux-2-klein-4b");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer tok456");
    const form = calls[0].init.body as FormData;
    expect(form.get("prompt")).toBe("Zeus");
    expect(form.get("width")).toBe("1536");
    expect(form.get("height")).toBe("864");
    expect(form.get("input_image_0")).toBeInstanceOf(Blob);
    expect(form.get("input_image_1")).toBeInstanceOf(Blob);
    expect(form.get("input_image_2")).toBeNull();
  });

  it("accepts a JSON body with a base64 image", async () => {
    const body = JSON.stringify({ success: true, result: { image: png.toString("base64") } });
    const { provider } = capture(new Response(body, { headers: { "content-type": "application/json" } }));
    expect((await provider.generate({ prompt: "x", width: 512, height: 512, references: [] })).data.equals(png)).toBe(true);
  });

  it("reports content-policy refusals separately", async () => {
    const body = JSON.stringify({ success: false, errors: [{ message: "Input flagged by safety filter (NSFW)" }] });
    const { provider } = capture(new Response(body, { status: 400, headers: { "content-type": "application/json" } }));
    await expect(provider.generate({ prompt: "x", width: 512, height: 512, references: [] })).rejects.toBeInstanceOf(ImageRefusedError);
  });

  it("surfaces other API errors", async () => {
    const body = JSON.stringify({ success: false, errors: [{ message: "Authentication error" }] });
    const { provider } = capture(new Response(body, { status: 401, headers: { "content-type": "application/json" } }));
    await expect(provider.generate({ prompt: "x", width: 512, height: 512, references: [] })).rejects.toThrow(/401.*Authentication error/);
  });

  it("rejects more than four references", async () => {
    const { provider } = capture(new Response(""));
    await expect(provider.generate({ prompt: "x", width: 512, height: 512, references: [png, png, png, png, png] })).rejects.toThrow(/4/);
  });
});

describe("prompts and cost", () => {
  it("adds reference instructions, theme style and global constraints", () => {
    const prompt = buildImagePrompt("Zeus throwing a thunderbolt.", "olympus-gold", config, [{ name: "Zeus" }, { name: "Odin" }]);
    expect(prompt).toContain("Zeus throwing a thunderbolt. Keep the exact face");
    expect(prompt).toContain("Zeus from reference image 1, Odin from reference image 2");
    expect(prompt).toContain("golden hour");
    expect(prompt).toContain("no text");
  });

  it("estimates neurons from 512px tiles", () => {
    // 1536x864 → 3x2 karo; 2 referans (496px → 1 karo)
    expect(estimateNeurons(config, 1536, 864, 2)).toBeCloseTo(6 * config.neuronsPerOutputTile + 2 * config.neuronsPerInputTile);
  });
});

/** Her isteği kaydeden sahte sağlayıcı; belirli prompt'ları reddedebilir veya hata verebilir. */
class FakeImages implements ImageProvider {
  requests: ImageRequest[] = [];
  constructor(private behavior: (req: ImageRequest, n: number) => "ok" | "refuse" | "fail" = () => "ok") {}
  async generate(req: ImageRequest) {
    this.requests.push(req);
    const what = this.behavior(req, this.requests.length);
    if (what === "refuse") throw new ImageRefusedError("flagged");
    if (what === "fail") throw new Error("boom");
    return { data: png, extension: "png" as const };
  }
}

const tempProject = (script: Script): Project => ({
  dir: mkdtempSync(path.join(tmpdir(), "metaficta-img-")),
  script: structuredClone(script),
  status: { stage: "approved", updatedAt: "", history: [] },
});

describe("generateProjectImages", () => {
  it("generates every image, auto-creates missing character references and passes them along", async () => {
    const charactersRoot = mkdtempSync(path.join(tmpdir(), "metaficta-chars-"));
    const project = tempProject(SAMPLE_LONG_SCRIPT);
    const provider = new FakeImages();
    const summary = await generateProjectImages(project, { provider, config, charactersRoot });

    expect(summary.failed).toEqual([]);
    expect(summary.createdCharacters.sort()).toEqual(["odin", "zeus"]);
    expect(listCharacters(charactersRoot).every((c) => c.hasReference)).toBe(true);
    expect(readdirSync(path.join(project.dir, "visuals")).sort()).toEqual(["odin-portrait.png", "titanomachy.png", "zeus-odin-clash.png", "zeus-portrait.png"]);

    const clash = provider.requests.find((r) => r.prompt.startsWith("Zeus and Odin facing"));
    expect(clash?.references).toHaveLength(2);
    expect(clash?.width).toBe(config.sizes.long[0]);
    const refMeta = await sharp(clash!.references[0]).metadata();
    expect(Math.max(refMeta.width ?? 0, refMeta.height ?? 0)).toBeLessThanOrEqual(config.referenceSize);
    expect(summary.neurons).toBeGreaterThan(0);
  });

  it("skips existing images and honours --only / --force", async () => {
    const charactersRoot = mkdtempSync(path.join(tmpdir(), "metaficta-chars-"));
    const project = tempProject(SAMPLE_SHORT_SCRIPT);
    await generateProjectImages(project, { provider: new FakeImages(), config, charactersRoot });

    const again = new FakeImages();
    const skipped = await generateProjectImages(project, { provider: again, config, charactersRoot });
    expect(again.requests).toHaveLength(0);
    expect(skipped.skipped.length).toBeGreaterThan(0);

    const forced = new FakeImages();
    await generateProjectImages(project, { provider: forced, config, charactersRoot, force: true, only: ["mimir-well"] });
    expect(forced.requests).toHaveLength(1);
    expect(forced.requests[0].width).toBe(config.sizes.short[0]);
  });

  it("uses an existing library reference instead of generating a new portrait", async () => {
    const charactersRoot = mkdtempSync(path.join(tmpdir(), "metaficta-chars-"));
    saveCharacter({ id: "odin", name: "Odin", look: "custom look" }, charactersRoot);
    writeFileSync(path.join(charactersRoot, "odin", "reference.png"), png);
    const provider = new FakeImages();
    const summary = await generateProjectImages(tempProject(SAMPLE_SHORT_SCRIPT), { provider, config, charactersRoot });
    expect(summary.createdCharacters).toEqual([]);
    expect(provider.requests.some((r) => r.prompt.startsWith("Character reference portrait"))).toBe(false);
    expect(characterLibraryPrompt(charactersRoot)).toContain("`odin` — Odin: custom look");
  });

  it("retries refused prompts with a softened version and keeps going after failures", async () => {
    const charactersRoot = mkdtempSync(path.join(tmpdir(), "metaficta-chars-"));
    const provider = new FakeImages((req, n) => {
      if (req.prompt.startsWith("The Titanomachy") && !req.prompt.includes("no gore")) return "refuse";
      if (req.prompt.startsWith("Zeus and Odin facing")) return "fail";
      return n > 0 ? "ok" : "ok";
    });
    const project = tempProject(SAMPLE_LONG_SCRIPT);
    const summary = await generateProjectImages(project, { provider, config, charactersRoot });
    expect(summary.generated).toContain("titanomachy");
    expect(summary.failed.map((f) => f.id)).toEqual(["zeus-odin-clash"]);
    expect(existsSync(path.join(project.dir, "visuals", "zeus-portrait.png"))).toBe(true);
  });
});

describe("character candidates", () => {
  it("generates numbered candidates and promotes the picked one to reference", async () => {
    const charactersRoot = mkdtempSync(path.join(tmpdir(), "metaficta-chars-"));
    const files = await generateCharacterCandidates({ id: "umay", name: "Umay Ana", look: "motherly goddess" }, 2, new FakeImages(), config, charactersRoot);
    expect(files.map((f) => path.basename(f))).toEqual(["candidate-1.png", "candidate-2.png"]);
    pickCandidate("umay", 2, charactersRoot);
    expect(listCharacters(charactersRoot)).toEqual([{ id: "umay", name: "Umay Ana", look: "motherly goddess", hasReference: true }]);
  });
});

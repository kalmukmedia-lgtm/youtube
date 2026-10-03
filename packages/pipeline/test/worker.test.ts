import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PanelClient } from "../src/worker/panel-client";
import { type Actions, runJob } from "../src/worker/run";
import { diff, snapshot } from "../src/worker/sync";

/** Panelin işçi API'sini bellekte taklit eden sahte sunucu. */
const fakePanel = (initialFiles: Record<string, string> = {}, job?: { id: number; type: string; projectId: string | null; params: Record<string, unknown> }) => {
  const files = new Map<string, Buffer>(Object.entries(initialFiles).map(([k, v]) => [k, Buffer.from(v)]));
  const parts = new Map<string, Buffer>();
  const state = { logs: "", completed: null as null | Record<string, unknown>, claimed: false, puts: 0, auth: [] as string[] };
  const fetchImpl = (async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    state.auth.push(new Headers(init.headers).get("Authorization") ?? "");
    const route = url.pathname.replace(/^\/api\/worker\//, "");
    const method = init.method ?? "GET";
    if (route === "jobs/claim") {
      if (!job || state.claimed) return new Response(null, { status: 204 });
      state.claimed = true;
      return Response.json(job);
    }
    if (route.endsWith("/log")) {
      state.logs += JSON.parse(String(init.body)).text;
      return new Response(null, { status: 204 });
    }
    if (route.endsWith("/complete")) {
      state.completed = JSON.parse(String(init.body));
      return new Response(null, { status: 204 });
    }
    if (route === "files") {
      const prefix = url.searchParams.get("prefix")!;
      return Response.json([...files].filter(([p]) => p.startsWith(`${prefix}/`)).map(([p, b]) => ({ path: p, size: b.length })));
    }
    const filePath = decodeURIComponent(route.replace(/^files\//, ""));
    if (method === "GET") return files.has(filePath) ? new Response(new Uint8Array(files.get(filePath)!)) : new Response(null, { status: 404 });
    if (method === "DELETE") {
      files.delete(filePath);
      return new Response(null, { status: 204 });
    }
    if (method === "PUT") {
      state.puts++;
      const offset = Number(url.searchParams.get("offset"));
      const chunk = Buffer.from(init.body as Uint8Array);
      const current = offset === 0 ? Buffer.alloc(0) : (parts.get(filePath) ?? Buffer.alloc(0));
      if (current.length !== offset) return new Response("offset", { status: 409 });
      const next = Buffer.concat([current, chunk]);
      if (url.searchParams.get("final") === "true") {
        files.set(filePath, next);
        parts.delete(filePath);
      } else parts.set(filePath, next);
      return new Response(null, { status: 204 });
    }
    return new Response("?", { status: 400 });
  }) as unknown as typeof fetch;
  return { files, state, client: new PanelClient("https://panel.example.com/", "secret", fetchImpl, 10) };
};

const noopActions = (overrides: Partial<Actions> = {}): Actions => ({
  newScript: async () => [],
  deriveShorts: async () => [],
  voice: async () => ({ synthesized: 0, skipped: 0, characters: 0, totalSeconds: 0 }),
  images: async () => ({ generated: [], skipped: [], failed: [], createdCharacters: [], neurons: 0 }),
  stills: async () => [],
  render: async () => [],
  characterCandidates: async () => [],
  ...overrides,
});

const tempDir = () => mkdtempSync(path.join(tmpdir(), "metaficta-worker-test-"));

describe("PanelClient", () => {
  it("uploads large files in ordered chunks with the bearer token", async () => {
    const { client, files, state } = fakePanel();
    const dir = tempDir();
    const file = path.join(dir, "video.mp4");
    writeFileSync(file, "abcdefghijklmnopqrstuvwxy"); // 25 bayt → 10'luk parçalarla 3 istek
    await client.upload("projects/p/render/long.mp4", file);
    expect(state.puts).toBe(3);
    expect(files.get("projects/p/render/long.mp4")?.toString()).toBe("abcdefghijklmnopqrstuvwxy");
    expect(state.auth.every((a) => a === "Bearer secret")).toBe(true);
  });

  it("returns null when there is nothing to claim", async () => {
    const { client } = fakePanel();
    expect(await client.claim()).toBeNull();
  });
});

describe("snapshot/diff", () => {
  it("detects new, modified and removed files", () => {
    const dir = tempDir();
    mkdirSync(path.join(dir, "projects/p/visuals"), { recursive: true });
    writeFileSync(path.join(dir, "projects/p/script.json"), "{}");
    writeFileSync(path.join(dir, "projects/p/visuals/a.png"), "a");
    const before = snapshot(dir, ["projects"]);
    writeFileSync(path.join(dir, "projects/p/visuals/b.png"), "b");
    writeFileSync(path.join(dir, "projects/p/script.json"), '{"x":1}');
    utimesSync(path.join(dir, "projects/p/script.json"), new Date(), new Date(Date.now() + 5000));
    rmSync(path.join(dir, "projects/p/visuals/a.png"));
    expect(diff(before, snapshot(dir, ["projects"]))).toEqual({ changed: ["projects/p/script.json", "projects/p/visuals/b.png"], removed: ["projects/p/visuals/a.png"] });
  });
});

describe("runJob", () => {
  const project = {
    "projects/p1/script.json": JSON.stringify({ id: "p1", theme: "norse-frost" }),
    "projects/p1/status.json": "{}",
    "projects/p1/render/long.mp4": "big video that should not be downloaded",
    "characters/odin/character.json": "{}",
    "music/nordic/track.mp3": "music",
    "music/epic-orchestral/other.mp3": "other",
  };

  it("downloads inputs, runs the step, uploads only the changes and reports success", async () => {
    const { client, files, state } = fakePanel(project, { id: 7, type: "render", projectId: "p1", params: { draft: true } });
    const dir = tempDir();
    let seen: string[] = [];
    const actions = noopActions({
      render: async (id, opts) => {
        seen = [id, String(opts.draft), readFileSync(path.join(dir, "music/nordic/track.mp3"), "utf8")];
        mkdirSync(path.join(dir, "projects/p1/render"), { recursive: true });
        writeFileSync(path.join(dir, "projects/p1/render/long-draft.mp4"), "new video");
        return [];
      },
    });
    const job = (await client.claim())!;
    expect(await runJob(job, client, dir, actions)).toBe(true);

    expect(seen).toEqual(["p1", "true", "music"]);
    // Çıktı klasörleri ve diğer ruh hallerinin müziği indirilmez
    expect(() => readFileSync(path.join(dir, "projects/p1/render/long.mp4"))).toThrow();
    expect(() => readFileSync(path.join(dir, "music/epic-orchestral/other.mp3"))).toThrow();
    expect(files.get("projects/p1/render/long-draft.mp4")?.toString()).toBe("new video");
    expect(state.puts).toBe(1);
    expect(state.completed).toEqual({ success: true, projectIds: [] });
    expect(state.logs).toContain("İş tamamlandı");
  });

  it("uploads partial results and reports failure when the step throws", async () => {
    const { client, files, state } = fakePanel(project, { id: 8, type: "images", projectId: "p1", params: { force: false } });
    const dir = tempDir();
    const actions = noopActions({
      images: async () => {
        mkdirSync(path.join(dir, "projects/p1/visuals"), { recursive: true });
        writeFileSync(path.join(dir, "projects/p1/visuals/odin.png"), "png");
        return { generated: ["odin"], skipped: [], failed: [{ id: "thor", error: "boom" }], createdCharacters: [], neurons: 100 };
      },
    });
    expect(await runJob((await client.claim())!, client, dir, actions)).toBe(false);
    expect(files.has("projects/p1/visuals/odin.png")).toBe(true);
    expect(state.completed).toMatchObject({ success: false });
    expect(String(state.completed?.error)).toContain("1 görsel üretilemedi");
  });

  it("reports projects created by a script job", async () => {
    const { client, files, state } = fakePanel({}, { id: 9, type: "script", projectId: null, params: { topic: "Zeus", format: "long", series: "gods-battle", research: false, revise: false, shorts: 1 } });
    const dir = tempDir();
    const actions = noopActions({
      newScript: async (opts) => {
        expect(opts).toMatchObject({ topic: "Zeus", series: "gods-battle", shorts: 1 });
        mkdirSync(path.join(dir, "projects/2026-zeus"), { recursive: true });
        writeFileSync(path.join(dir, "projects/2026-zeus/script.json"), "{}");
        return ["2026-zeus", "2026-zeus-short-01"];
      },
    });
    expect(await runJob((await client.claim())!, client, dir, actions)).toBe(true);
    expect(files.has("projects/2026-zeus/script.json")).toBe(true);
    expect(state.completed).toEqual({ success: true, projectIds: ["2026-zeus", "2026-zeus-short-01"] });
  });

  it("rejects invalid job parameters", async () => {
    const { client, state } = fakePanel({}, { id: 10, type: "script", projectId: null, params: { topic: "", format: "wide" } });
    expect(await runJob((await client.claim())!, client, tempDir(), noopActions())).toBe(false);
    expect(state.completed).toMatchObject({ success: false });
  });
});

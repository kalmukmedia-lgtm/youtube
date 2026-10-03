import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SAMPLE_SHORT_SCRIPT } from "@metaficta/core";
import { describe, expect, it } from "vitest";
import type { Project } from "../src/project";
import { importSceneAudio } from "../src/tts/import";

/** Sessiz 16-bit mono PCM WAV dosyası (harici araç gerektirmez). */
const tone = (file: string, seconds: number, sampleRate = 8000) => {
  const dataBytes = Math.round(seconds * sampleRate) * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataBytes, 40);
  writeFileSync(file, Buffer.concat([header, Buffer.alloc(dataBytes)]));
};

describe("importSceneAudio", () => {
  it("measures user-provided scene audio and reports missing scenes", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "metaficta-import-"));
    mkdirSync(path.join(dir, "audio"));
    tone(path.join(dir, "audio", "s01.wav"), 2);
    tone(path.join(dir, "audio", "S02.wav"), 3);
    const project: Project = { dir, script: structuredClone(SAMPLE_SHORT_SCRIPT), status: { stage: "approved", updatedAt: "", history: [] } };

    const summary = await importSceneAudio(project);
    expect(summary.imported).toBe(2);
    expect(summary.missing).toEqual(["s03", "s04"]);
    const manifest = JSON.parse(readFileSync(path.join(dir, "audio", "manifest.json"), "utf8"));
    expect(manifest.s01.durationSec).toBeCloseTo(2, 0);
    expect(manifest.s02).toMatchObject({ src: "audio/S02.wav" });
    expect(manifest.s02.durationSec).toBeCloseTo(3, 0);
  });
});

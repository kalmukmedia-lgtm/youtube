import type { VoiceConfig } from "../config";

const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Telaffuz sözlüğündeki kelimeleri SSML <sub> etiketiyle değiştirir.
 * Kelime sınırları Unicode harflerine göre belirlenir; Türkçe ekler ('de, 'in) korunur.
 */
export const applyPronunciations = (escapedText: string, pronunciations: Record<string, string>): string => {
  // Uzun ifadeler önce: "Codex Regius" tek başına "Codex"ten önce eşleşmeli.
  const entries = Object.entries(pronunciations).sort(([a], [b]) => b.length - a.length);
  if (entries.length === 0) return escapedText;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${entries.map(([word]) => escapeRegex(escapeXml(word))).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  const lookup = new Map(entries.map(([word, alias]) => [escapeXml(word).toLocaleLowerCase("tr-TR"), alias]));
  return escapedText.replace(pattern, (match) => {
    const alias = lookup.get(match.toLocaleLowerCase("tr-TR"));
    return alias ? `<sub alias="${escapeXml(alias)}">${match}</sub>` : match;
  });
};

export const buildSsml = (text: string, voice: Pick<VoiceConfig, "voice" | "rate" | "pitch" | "sentencePauseMs">, pronunciations: Record<string, string> = {}): string =>
  [
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="tr-TR">`,
    `<voice name="${escapeXml(voice.voice)}">`,
    `<mstts:silence type="Sentenceboundary" value="${Math.round(voice.sentencePauseMs)}ms"/>`,
    `<prosody rate="${escapeXml(voice.rate)}" pitch="${escapeXml(voice.pitch)}">${applyPronunciations(escapeXml(text.trim()), pronunciations)}</prosody>`,
    `</voice>`,
    `</speak>`,
  ].join("");

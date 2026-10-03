import type { WordTiming } from "@metaficta/core";

const normalize = (text: string): string => text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Anlatım metnindeki kelimeleri (altyazıda görünecek yazımla) TTS'in kelime sınırı zamanlarıyla eşleştirir.
 * TTS bir kelimeyi bölebilir ("Yggdrasil'de" → "Yggdrasil" + "de") ya da okunuşu farklı raporlayabilir;
 * eşleşmeyen kelimelerin zamanı komşu kelimeler arasında harf uzunluğuna göre dağıtılır.
 */
export const alignWords = (narration: string, boundaries: WordTiming[], totalSeconds: number): WordTiming[] => {
  const tokens = narration.split(/\s+/).filter(Boolean);
  const spoken = boundaries.map((b) => ({ ...b, norm: normalize(b.text) })).filter((b) => b.norm.length > 0);
  const timed: (WordTiming | null)[] = tokens.map(() => null);

  let cursor = 0;
  tokens.forEach((token, i) => {
    const target = normalize(token);
    if (!target) return;
    for (let j = cursor; j < Math.min(cursor + 4, spoken.length); j++) {
      let joined = "";
      for (let k = j; k < Math.min(j + 4, spoken.length); k++) {
        joined += spoken[k].norm;
        if (joined === target) {
          timed[i] = { text: token, start: spoken[j].start, end: spoken[k].end };
          cursor = k + 1;
          return;
        }
        if (!target.startsWith(joined)) break;
      }
    }
  });

  // Eşleşmeyen kelimeler: bir önceki ve bir sonraki eşleşen kelime arasındaki boşluğa yay.
  const result: WordTiming[] = [];
  let i = 0;
  while (i < tokens.length) {
    const known = timed[i];
    if (known) {
      result.push(known);
      i++;
      continue;
    }
    let j = i;
    while (j < tokens.length && !timed[j]) j++;
    const gapStart = result.at(-1)?.end ?? 0;
    const gapEnd = timed[j]?.start ?? totalSeconds;
    const weights = tokens.slice(i, j).map((t) => t.length + 1);
    const sum = weights.reduce((a, b) => a + b, 0);
    let t = gapStart;
    for (let k = i; k < j; k++) {
      const length = (Math.max(gapEnd - gapStart, 0) * weights[k - i]) / sum;
      result.push({ text: tokens[k], start: t, end: t + length });
      t += length;
    }
    i = j;
  }
  return result;
};

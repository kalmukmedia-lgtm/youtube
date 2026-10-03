import { estimateNarrationSeconds, type SceneAudio, type WordTiming } from "./timeline";

/**
 * Sahnenin altyazı kelimeleri. TTS kelime zamanları varsa onları kullanır;
 * yoksa kelimeleri tahmini anlatım süresine harf uzunluğuna göre dağıtır.
 */
export const captionWords = (narration: string, audio?: SceneAudio): WordTiming[] => {
  if (audio?.words?.length) return audio.words;
  const words = narration.split(/\s+/).filter(Boolean);
  const total = audio?.durationSec ?? estimateNarrationSeconds(narration);
  const weights = words.map((w) => w.length + 2);
  const sum = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return words.map((text, i) => {
    const length = (weights[i] / sum) * total;
    const word = { text, start: cursor, end: cursor + length };
    cursor += length;
    return word;
  });
};

const ENDS_SENTENCE = /[.!?…:;]["'”’)]*$/;

/** Kelimeleri ekranda birlikte gösterilecek gruplara böler; cümle sonunda yeni grup başlar. */
export const chunkWords = (words: WordTiming[], maxWords: number): WordTiming[][] => {
  const chunks: WordTiming[][] = [];
  let current: WordTiming[] = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= maxWords || ENDS_SENTENCE.test(word.text)) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
};

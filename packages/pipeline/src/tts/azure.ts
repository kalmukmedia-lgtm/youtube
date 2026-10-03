import type { WordTiming } from "@metaficta/core";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface TtsResult {
  audio: Buffer;
  durationSec: number;
  /** TTS'in raporladığı kelime sınırları (okunuşa göre; altyazı için `alignWords` ile eşleştirilir). */
  boundaries: WordTiming[];
}

export interface TtsProvider {
  synthesize(ssml: string): Promise<TtsResult>;
}

const TICKS_PER_SECOND = 10_000_000;

export class AzureTts implements TtsProvider {
  constructor(
    private readonly key: string,
    private readonly region: string,
  ) {}

  synthesize(ssml: string): Promise<TtsResult> {
    const config = sdk.SpeechConfig.fromSubscription(this.key, this.region);
    config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;
    // audioConfig = null: ses hoparlöre değil belleğe yazılır.
    const synthesizer = new sdk.SpeechSynthesizer(config, null);
    const boundaries: WordTiming[] = [];
    synthesizer.wordBoundary = (_, event) => {
      if (event.boundaryType !== sdk.SpeechSynthesisBoundaryType.Word) return;
      const start = event.audioOffset / TICKS_PER_SECOND;
      boundaries.push({ text: event.text, start, end: start + event.duration / TICKS_PER_SECOND });
    };

    return new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve({ audio: Buffer.from(result.audioData), durationSec: result.audioDuration / TICKS_PER_SECOND, boundaries });
          } else {
            reject(new Error(`Azure TTS hatası: ${result.errorDetails || sdk.ResultReason[result.reason]}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Azure TTS hatası: ${error}`));
        },
      );
    });
  }
}

export interface AzureVoice {
  ShortName: string;
  LocalName: string;
  Gender: string;
  Locale: string;
  SecondaryLocaleList?: string[];
  StyleList?: string[];
}

/** Bölgedeki sesler arasından Türkçe konuşabilenleri listeler (Türkçe yerel sesler + çok dilli sesler). */
export const listTurkishVoices = async (key: string, region: string): Promise<AzureVoice[]> => {
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
    headers: { "Ocp-Apim-Subscription-Key": key },
  });
  if (!response.ok) throw new Error(`Azure ses listesi alınamadı: ${response.status} ${response.statusText}`);
  const voices = (await response.json()) as AzureVoice[];
  return voices.filter((v) => v.Locale === "tr-TR" || v.SecondaryLocaleList?.includes("tr-TR"));
};

import { estimateNarrationSeconds } from "@metaficta/core";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, useTheme } from "../theme";

interface TimedWord {
  text: string;
  start: number;
  end: number;
}

/**
 * Kelimeleri anlatım süresine harf uzunluğuna göre dağıtır.
 * Faz 3'te whisper.cpp kelime zaman damgaları gelince bu tahmin yerine gerçek zamanlar kullanılacak.
 */
const timeWords = (narration: string, spokenFrames: number): TimedWord[] => {
  const words = narration.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return words.map((text, i) => {
    const len = (weights[i] / total) * spokenFrames;
    const word = { text, start: cursor, end: cursor + len };
    cursor += len;
    return word;
  });
};

export const Captions = ({ narration, spokenSeconds }: { narration: string; spokenSeconds?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u } = useLayout();
  const theme = useTheme();

  const spokenFrames = (spokenSeconds ?? estimateNarrationSeconds(narration)) * fps;
  const words = timeWords(narration, spokenFrames);
  const chunkSize = vertical ? 3 : 8;
  const activeIndex = words.findIndex((w) => frame >= w.start && frame < w.end);
  if (activeIndex === -1) return null;

  const chunkStart = Math.floor(activeIndex / chunkSize) * chunkSize;
  const chunk = words.slice(chunkStart, chunkStart + chunkSize);

  if (vertical) {
    return (
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: "60%", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${10 * u}px ${22 * u}px` }}>
        {chunk.map((w, i) => {
          const active = chunkStart + i === activeIndex;
          return (
            <span
              key={i}
              style={{
                fontFamily: theme.bodyFont,
                fontWeight: 800,
                fontSize: 74 * u,
                color: active ? theme.colors.accent : theme.colors.text,
                WebkitTextStroke: `${3 * u}px rgba(0,0,0,0.85)`,
                paintOrder: "stroke fill",
                textShadow: active ? `0 0 ${24 * u}px ${theme.colors.accent}, 0 ${6 * u}px ${18 * u}px rgba(0,0,0,0.8)` : `0 ${6 * u}px ${18 * u}px rgba(0,0,0,0.8)`,
              }}
            >
              {w.text.toLocaleUpperCase("tr-TR")}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70 * u, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: "70%",
          textAlign: "center",
          fontFamily: theme.bodyFont,
          fontWeight: 600,
          fontSize: 40 * u,
          lineHeight: 1.3,
          color: theme.colors.text,
          padding: `${8 * u}px ${22 * u}px`,
          background: "rgba(0,0,0,0.45)",
          borderRadius: 10 * u,
        }}
      >
        {chunk.map((w) => w.text).join(" ")}
      </div>
    </div>
  );
};

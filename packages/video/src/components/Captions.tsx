import { captionWords, chunkWords, type SceneAudio } from "@metaficta/core";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { upper } from "../text";
import { useLayout, useTheme } from "../theme";

export const Captions = ({ narration, audio }: { narration: string; audio?: SceneAudio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u } = useLayout();
  const theme = useTheme();

  const time = frame / fps;
  const chunks = chunkWords(captionWords(narration, audio), vertical ? 3 : 8);
  // Kelimeler arasındaki kısa sessizliklerde altyazı kaybolmasın: bir sonraki grup başlayana kadar ekranda kalır.
  const chunkIndex = chunks.findLastIndex((chunk) => time >= chunk[0].start);
  const chunk = chunks[chunkIndex];
  const last = chunk?.[chunk.length - 1];
  if (!chunk || !last || time > last.end + 0.6) return null;

  if (vertical) {
    return (
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: "60%", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${10 * u}px ${22 * u}px` }}>
        {chunk.map((w, i) => {
          const active = time >= w.start && time < w.end;
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
              {upper(w.text)}
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

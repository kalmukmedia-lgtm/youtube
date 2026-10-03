import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { upper } from "../text";
import { useLayout, useSceneDuration, useTheme } from "../theme";

export const Timeline = ({ scene }: { scene: SceneOf<"Timeline"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = useSceneDuration();
  const { vertical, u } = useLayout();
  const theme = useTheme();
  const events = scene.events.slice(0, 6);
  const line = interpolate(frame, [5, Math.min(duration * 0.5, 5 + events.length * 18)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const title = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <Backdrop seed="timeline" intensity={0.8} />
      {scene.title ? (
        <div style={{ position: "absolute", top: (vertical ? 150 : 90) * u, left: 0, right: 0, textAlign: "center", fontFamily: theme.displayFont, fontWeight: 700, fontSize: (vertical ? 64 : 60) * u, color: theme.colors.text, opacity: title, padding: `0 ${60 * u}px` }}>
          {upper(scene.title)}
        </div>
      ) : null}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", width: vertical ? 760 * u : "84%", height: vertical ? "62%" : 420 * u }}>
          {/* Ana çizgi */}
          <div
            style={{
              position: "absolute",
              background: `linear-gradient(${vertical ? "180deg" : "90deg"}, ${theme.colors.accentSoft}, ${theme.colors.accent})`,
              boxShadow: `0 0 ${16 * u}px ${theme.colors.accent}`,
              ...(vertical ? { left: 120 * u, top: 0, width: 4 * u, height: `${line * 100}%` } : { top: "50%", left: 0, height: 4 * u, width: `${line * 100}%` }),
            }}
          />
          {events.map((event, i) => {
            const pos = events.length === 1 ? 0.5 : i / (events.length - 1);
            const appear = spring({ frame: frame - 5 - i * 18, fps, config: { damping: 14 } });
            const focus = i === scene.focusIndex;
            const pulse = focus ? 1 + 0.15 * Math.sin(frame / 6) : 1;
            const dot = (focus ? 34 : 22) * u;
            const label = (
              <>
                <div style={{ fontFamily: theme.displayFont, fontWeight: 700, fontSize: (focus ? 40 : 32) * u, color: focus ? theme.colors.accent : theme.colors.text }}>{event.date}</div>
                <div style={{ fontFamily: theme.bodyFont, fontSize: 28 * u, color: theme.colors.muted, marginTop: 6 * u, lineHeight: 1.25 }}>{event.label}</div>
              </>
            );
            return vertical ? (
              <div key={i} style={{ position: "absolute", top: `${pos * 100}%`, left: 0, right: 0, display: "flex", alignItems: "center", transform: "translateY(-50%)", opacity: appear }}>
                <div style={{ width: 122 * u, display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ width: dot, height: dot, marginRight: -dot / 2 + 2 * u, borderRadius: "50%", background: focus ? theme.colors.accent : theme.colors.bg, border: `${4 * u}px solid ${theme.colors.accent}`, transform: `scale(${appear * pulse})` }} />
                </div>
                <div style={{ marginLeft: 50 * u }}>{label}</div>
              </div>
            ) : (
              <div key={i} style={{ position: "absolute", left: `${pos * 100}%`, top: "50%", width: 300 * u, transform: "translate(-50%, -50%)", opacity: appear, textAlign: "center" }}>
                <div style={{ height: 150 * u, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 26 * u }}>{i % 2 === 0 ? label : null}</div>
                <div style={{ width: dot, height: dot, margin: "0 auto", borderRadius: "50%", background: focus ? theme.colors.accent : theme.colors.bg, border: `${4 * u}px solid ${theme.colors.accent}`, transform: `scale(${appear * pulse})`, boxShadow: focus ? `0 0 ${30 * u}px ${theme.colors.accent}` : undefined }} />
                <div style={{ height: 150 * u, paddingTop: 26 * u }}>{i % 2 === 1 ? label : null}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import type { SceneOf } from "@metaficta/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LightLeak, RevealText, useShake } from "../components/Motion";
import { SceneImage } from "../components/SceneImage";
import { upper } from "../text";
import { useLayout, useTheme } from "../theme";

export const CinematicImage = ({ scene }: { scene: SceneOf<"CinematicImage"> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, u } = useLayout();
  const theme = useTheme();
  const reveal = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const impact = scene.transition === "flash" || scene.transition === "whip";
  // Darbeli girişte kamera sarsılır; flash/burn girişlerinde ışık sızıntısı sahnenin ilk saniyesinde söner.
  const shake = useShake(6, 16, impact ? 16 : 0);
  const leak = scene.transition === "flash" || scene.transition === "burn" ? interpolate(frame, [0, 30], [0.8, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: shake || undefined }}>
        <SceneImage image={scene.image} motion={scene.motion} darken={0.2} />
      </AbsoluteFill>
      <LightLeak strength={leak} seed={scene.id} />
      {/* Altyazı ve başlığın durduğu alt kısmı hafifçe karart: parlak görsellerde de yazı okunaklı kalsın. */}
      <AbsoluteFill
        style={{
          background:
            scene.overlayText && !vertical
              ? "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 32%, transparent 55%), linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 45%)"
              : "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 30%)",
        }}
      />
      {scene.overlayText ? (
        <div
          style={{
            position: "absolute",
            left: vertical ? 60 * u : 110 * u,
            right: vertical ? 60 * u : undefined,
            top: vertical ? "18%" : undefined,
            bottom: vertical ? undefined : 250 * u,
            textAlign: vertical ? "center" : "left",
          }}
        >
          <div
            style={{
              height: 4 * u,
              width: `${interpolate(reveal, [0, 1], [0, vertical ? 40 : 100])}%`,
              margin: vertical ? "0 auto" : undefined,
              minWidth: 0,
              maxWidth: 420 * u,
              background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accent}00)`,
              boxShadow: `0 0 ${16 * u}px ${theme.colors.accent}`,
            }}
          />
          <RevealText
            text={upper(scene.overlayText)}
            delay={10}
            fontSize={(vertical ? 76 : 74) * u}
            fontFamily={theme.displayFont}
            align={vertical ? "center" : "left"}
            style={{ marginTop: 18 * u }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

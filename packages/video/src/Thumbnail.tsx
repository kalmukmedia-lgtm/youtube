import type { RenderInput } from "@metaficta/core";
import { AbsoluteFill } from "remotion";
import { AssetsProvider } from "./assets";
import { Portrait } from "./components/Portrait";
import { SceneImage } from "./components/SceneImage";
import { Vignette } from "./components/Overlays";
import { upper } from "./text";
import { ThemeProvider, useLayout, useTheme } from "./theme";

export type ThumbnailProps = RenderInput & { variant: number };

const BigText = ({ text, size, align = "left" }: { text: string; size: number; align?: "left" | "center" }) => {
  const theme = useTheme();
  const { u } = useLayout();
  return (
    <div
      style={{
        fontFamily: theme.displayFont,
        fontWeight: 900,
        fontSize: size * u,
        lineHeight: 1,
        textAlign: align,
        color: theme.colors.text,
        WebkitTextStroke: `${6 * u}px #000`,
        paintOrder: "stroke fill",
        textShadow: `0 0 ${40 * u}px ${theme.colors.accent}, 0 ${10 * u}px ${30 * u}px rgba(0,0,0,0.9)`,
      }}
    >
      {upper(text)}
    </div>
  );
};

const Body = ({ script, variant }: ThumbnailProps) => {
  const theme = useTheme();
  const { u } = useLayout();
  const versus = script.scenes.find((s) => s.type === "Versus");
  const layout = variant % 3;

  if (layout === 1 && versus) {
    return (
      <AbsoluteFill style={{ background: theme.colors.bg }}>
        <AbsoluteFill style={{ flexDirection: "row" }}>
          <Portrait image={versus.left.image} motion="still" style={{ flex: 1, borderRadius: 0, border: "none" }} />
          <Portrait image={versus.right.image} motion="still" style={{ flex: 1, borderRadius: 0, border: "none" }} />
        </AbsoluteFill>
        <Vignette strength={0.6} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontFamily: theme.displayFont, fontWeight: 900, fontSize: 260 * u, color: theme.colors.accent, transform: "rotate(-8deg)", WebkitTextStroke: `${8 * u}px #000`, paintOrder: "stroke fill", textShadow: `0 0 ${80 * u}px ${theme.colors.accent}` }}>
            VS
          </div>
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 40 * u }}>
          <BigText text={script.thumbnail.text} size={110} align="center" />
        </div>
      </AbsoluteFill>
    );
  }

  if (layout === 2) {
    return (
      <AbsoluteFill style={{ background: theme.colors.bg }}>
        <SceneImage image={script.thumbnail.image} motion="still" darken={0.15} />
        <Vignette strength={0.85} />
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 60 * u }}>
          <BigText text={script.thumbnail.text} size={150} align="center" />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <SceneImage image={script.thumbnail.image} motion="still" darken={0} />
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${theme.colors.bg} 0%, rgba(0,0,0,0.6) 45%, transparent 75%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", padding: `0 ${80 * u}px`, width: "62%" }}>
        <div style={{ width: 120 * u, height: 10 * u, background: theme.colors.accent, marginBottom: 30 * u, boxShadow: `0 0 ${20 * u}px ${theme.colors.accent}` }} />
        <BigText text={script.thumbnail.text} size={170} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Thumbnail = (props: ThumbnailProps) => (
  <ThemeProvider themeId={props.script.theme}>
    <AssetsProvider assets={props.assets}>
      <Body {...props} />
    </AssetsProvider>
  </ThemeProvider>
);

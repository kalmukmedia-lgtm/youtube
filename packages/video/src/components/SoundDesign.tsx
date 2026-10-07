import type { RenderInput, Timeline } from "@metaficta/core";
import { Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveAsset } from "../assets";
import { roman, upper } from "../text";
import { useLayout, useTheme } from "../theme";

type Sfx = NonNullable<RenderInput["sfx"]>;
interface Cue {
  at: number;
  sound: keyof Sfx;
  volume: number;
}

const RISER_FRAMES = 78;

/** Zaman çizelgesinden ses efekti noktalarını çıkarır: geçişlerde whoosh, darbelerde impact, bölümlerden önce riser. */
export const sfxCues = (timeline: Timeline): Cue[] => {
  const cues: Cue[] = [];
  timeline.items.forEach((item, index) => {
    if (index > 0 && item.transitionIn !== "none") {
      cues.push({ at: item.from - 4, sound: "whoosh", volume: 0.28 });
      if (item.transitionIn === "flash") cues.push({ at: item.from + 7, sound: "impact", volume: 0.42 });
    }
    if (item.kind !== "scene") return;
    const { scene } = item;
    if (scene.type === "ChapterTitle") {
      cues.push({ at: item.from + 8 - RISER_FRAMES, sound: "riser", volume: 0.3 });
      cues.push({ at: item.from + 8, sound: "impact", volume: 0.45 });
    }
    if (scene.type === "ColdOpen") {
      // ColdOpen'daki son kelime darbesiyle aynı kare.
      const words = scene.headline.trim().split(/\s+/).length;
      cues.push({ at: item.from + 8 + (words - 1) * 7 + 4, sound: "impact", volume: 0.55 });
    }
    if (scene.type === "Versus") cues.push({ at: item.from + 16, sound: "impact", volume: 0.5 });
  });
  return cues.filter((cue) => cue.at >= 0).sort((a, b) => a.at - b.at);
};

export const SoundDesign = ({ sfx, timeline }: { sfx: Sfx; timeline: Timeline }) => (
  <>
    {sfxCues(timeline).map((cue, i) => (
      <Sequence key={i} from={cue.at} layout="none">
        <Audio src={resolveAsset(sfx[cue.sound])} volume={cue.volume} />
      </Sequence>
    ))}
  </>
);

const TAG_FRAMES = 150;

/** Bölüm başlığından sonra sol üstte beliren küçük bölüm etiketi (uzun videolar). */
const ChapterTagCard = ({ label, title }: { label: string; title: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const theme = useTheme();
  const inP = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const outP = interpolate(frame, [TAG_FRAMES - fps * 0.5, TAG_FRAMES], [1, 0], { extrapolateLeft: "clamp" });
  const p = Math.min(inP, outP);
  return (
    <div style={{ position: "absolute", top: 34 * u, left: 44 * u, display: "flex", alignItems: "center", gap: 14 * u, opacity: p, transform: `translateX(${(1 - inP) * -30 * u}px)` }}>
      <div style={{ width: 4 * u, height: 44 * u, background: theme.colors.accent, boxShadow: `0 0 ${12 * u}px ${theme.colors.accent}` }} />
      <div>
        <div style={{ fontFamily: theme.bodyFont, fontWeight: 700, fontSize: 16 * u, letterSpacing: 6 * u, color: theme.colors.accent }}>{label}</div>
        <div style={{ fontFamily: theme.displayFont, fontWeight: 700, fontSize: 24 * u, letterSpacing: 2 * u, color: theme.colors.text, textShadow: `0 ${2 * u}px ${8 * u}px rgba(0,0,0,0.9)` }}>{title}</div>
      </div>
    </div>
  );
};

export const ChapterTags = ({ timeline }: { timeline: Timeline }) => (
  <>
    {timeline.items.map((item, index) => {
      if (item.kind !== "scene" || item.scene.type !== "ChapterTitle") return null;
      const next = timeline.items[index + 1];
      if (!next) return null;
      return (
        <Sequence key={item.scene.id} from={next.from + 20} durationInFrames={TAG_FRAMES} layout="none">
          <ChapterTagCard label={`BÖLÜM ${roman(item.scene.chapterNumber)}`} title={upper(item.scene.title)} />
        </Sequence>
      );
    })}
  </>
);

import { z } from "zod";

export const THEME_IDS = [
  "olympus-gold",
  "norse-frost",
  "egypt-sand",
  "turkic-steppe",
  "ancient-sepia",
  "cosmic-void",
  "future-neon",
] as const;

export const ThemeIdSchema = z.enum(THEME_IDS);
export type ThemeId = z.infer<typeof ThemeIdSchema>;

export type ParticleKind = "dust" | "snow" | "sand" | "embers" | "stars" | "data";

export interface Theme {
  id: ThemeId;
  /** Turkish display name, used in previews. */
  label: string;
  colors: {
    /** Deepest background. */
    bg: string;
    /** Secondary background / fog color. */
    bgAlt: string;
    /** Main accent (titles, bars, highlights). */
    accent: string;
    /** Softer accent for gradients and glows. */
    accentSoft: string;
    text: string;
    muted: string;
  };
  fonts: {
    display: "Cinzel" | "Cormorant Garamond" | "Space Grotesk";
    body: "Inter" | "Space Grotesk";
  };
  particles: ParticleKind;
  /** 0–1 film grain strength. */
  grain: number;
  /** Bu temadaki tüm yapay zekâ görsellerine eklenen İngilizce stil tarifi (görsel bütünlüğü için). */
  imageStyle: string;
  /** Mood tag used to pick background music. */
  musicMood: "epic-orchestral" | "nordic" | "ethnic-mystery" | "steppe" | "ambient" | "cosmic-ambient" | "synthwave";
}

export const THEMES: Record<ThemeId, Theme> = {
  "olympus-gold": {
    id: "olympus-gold",
    label: "Olimpos Altını",
    colors: { bg: "#07060a", bgAlt: "#1c1508", accent: "#e8b64c", accentSoft: "#8a6420", text: "#f6efe0", muted: "#b7a98c" },
    fonts: { display: "Cinzel", body: "Inter" },
    particles: "embers",
    grain: 0.08,
    imageStyle: "epic cinematic digital painting, golden hour light, white marble and gold, dramatic rim lighting, volumetric clouds",
    musicMood: "epic-orchestral",
  },
  "norse-frost": {
    id: "norse-frost",
    label: "İskandinav Buzu",
    colors: { bg: "#05080d", bgAlt: "#0f1d2b", accent: "#9fd3ff", accentSoft: "#3c6d93", text: "#eef6ff", muted: "#97a9ba" },
    fonts: { display: "Cinzel", body: "Inter" },
    particles: "snow",
    grain: 0.07,
    imageStyle: "epic cinematic digital painting, cold blue light, snow and ice, aurora in the sky, misty fjords, dramatic rim lighting",
    musicMood: "nordic",
  },
  "egypt-sand": {
    id: "egypt-sand",
    label: "Mısır Kumu",
    colors: { bg: "#0a0805", bgAlt: "#2a1e0c", accent: "#f0c26a", accentSoft: "#2f5a8a", text: "#fbf1dc", muted: "#c7b38a" },
    fonts: { display: "Cormorant Garamond", body: "Inter" },
    particles: "sand",
    grain: 0.09,
    imageStyle: "epic cinematic digital painting, warm desert light, sandstone and gold, lapis lazuli blue accents, hazy atmosphere",
    musicMood: "ethnic-mystery",
  },
  "turkic-steppe": {
    id: "turkic-steppe",
    label: "Türk Bozkırı",
    colors: { bg: "#06090c", bgAlt: "#13232c", accent: "#5fb7e5", accentSoft: "#b5402f", text: "#f3efe6", muted: "#a9b3b5" },
    fonts: { display: "Cinzel", body: "Inter" },
    particles: "embers",
    grain: 0.08,
    imageStyle: "epic cinematic digital painting, vast Central Asian steppe, eternal blue sky, wind and fire, felt and leather textures, dramatic light",
    musicMood: "steppe",
  },
  "ancient-sepia": {
    id: "ancient-sepia",
    label: "Kadim Sepya",
    colors: { bg: "#0d0a07", bgAlt: "#2b2015", accent: "#d9a866", accentSoft: "#6e5233", text: "#f4e9d6", muted: "#bba98f" },
    fonts: { display: "Cormorant Garamond", body: "Inter" },
    particles: "dust",
    grain: 0.12,
    imageStyle: "cinematic historical illustration, warm sepia tones, ancient ruins, dust in the air, soft volumetric light, archaeological atmosphere",
    musicMood: "ambient",
  },
  "cosmic-void": {
    id: "cosmic-void",
    label: "Kozmik Boşluk",
    colors: { bg: "#03030a", bgAlt: "#160f33", accent: "#8f7bff", accentSoft: "#2bc4d8", text: "#eef0ff", muted: "#9a9cc0" },
    fonts: { display: "Space Grotesk", body: "Inter" },
    particles: "stars",
    grain: 0.05,
    imageStyle: "cinematic space art, deep purple and blue nebulae, glowing stars, vast cosmic scale, volumetric light",
    musicMood: "cosmic-ambient",
  },
  "future-neon": {
    id: "future-neon",
    label: "Gelecek Neonu",
    colors: { bg: "#020407", bgAlt: "#071a24", accent: "#22e6ff", accentSoft: "#ff2fb3", text: "#e9fbff", muted: "#86a9b3" },
    fonts: { display: "Space Grotesk", body: "Space Grotesk" },
    particles: "data",
    grain: 0.04,
    imageStyle: "cinematic sci-fi concept art, futuristic megastructures, neon cyan and magenta lights, clean high-tech atmosphere",
    musicMood: "synthwave",
  },
};

export const getTheme = (id: ThemeId): Theme => THEMES[id];

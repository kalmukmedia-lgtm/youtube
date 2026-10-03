import type { Scene } from "@metaficta/core";
import { ChapterTitle } from "./ChapterTitle";
import { CharacterCard } from "./CharacterCard";
import { CinematicImage } from "./CinematicImage";
import { ColdOpen } from "./ColdOpen";
import { Countdown } from "./Countdown";
import { Outro } from "./Outro";
import { Quote } from "./Quote";
import { StatCounter } from "./StatCounter";
import { Timeline } from "./Timeline";
import { Versus } from "./Versus";

export { Sting } from "./Sting";

/** Sahne kataloğu: senaryodaki `type` alanına göre doğru bileşeni seçer. */
export const SceneRenderer = ({ scene }: { scene: Scene }) => {
  switch (scene.type) {
    case "ColdOpen":
      return <ColdOpen scene={scene} />;
    case "CinematicImage":
      return <CinematicImage scene={scene} />;
    case "ChapterTitle":
      return <ChapterTitle scene={scene} />;
    case "Quote":
      return <Quote scene={scene} />;
    case "StatCounter":
      return <StatCounter scene={scene} />;
    case "CharacterCard":
      return <CharacterCard scene={scene} />;
    case "Versus":
      return <Versus scene={scene} />;
    case "Timeline":
      return <Timeline scene={scene} />;
    case "Countdown":
      return <Countdown scene={scene} />;
    case "Outro":
      return <Outro scene={scene} />;
  }
};

import type { TransitionKind } from "@metaficta/core";
import { TRANSITION_FRAMES } from "@metaficta/core";
import { linearTiming, type TransitionPresentation, type TransitionPresentationComponentProps } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, Easing, interpolate } from "remotion";

type NoProps = Record<string, unknown>;
type AnyPresentation = TransitionPresentation<Record<string, unknown>>;

/** Vurgu geçişi: ortada altın-beyaz parlama, yeni sahne parlamanın arkasından gelir. */
const FlashPresentation = ({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<NoProps>) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const flash = interpolate(presentationProgress, [0, 0.5, 1], [0, 1, 0]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: presentationProgress >= 0.5 ? 1 : 0 }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle, #fffaf0 0%, #ffd27a 60%, #b8860b 100%)", opacity: flash }} />
    </AbsoluteFill>
  );
};

/** Dalış geçişi: eski sahne büyüyerek kaybolur, yeni sahne içeri doğru yerleşir. */
const ZoomPresentation = ({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<NoProps>) => {
  const p = Easing.inOut(Easing.cubic)(presentationProgress);
  const style =
    presentationDirection === "exiting"
      ? { transform: `scale(${1 + 0.35 * p})`, opacity: 1 - p, filter: `blur(${p * 10}px)` }
      : { transform: `scale(${1.25 - 0.25 * p})`, opacity: p, filter: `blur(${(1 - p) * 10}px)` };
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

const flash = (): TransitionPresentation<NoProps> => ({ component: FlashPresentation, props: {} });
const zoom = (): TransitionPresentation<NoProps> => ({ component: ZoomPresentation, props: {} });

export const transitionFor = (kind: Exclude<TransitionKind, "none">) => {
  const timing = linearTiming({ durationInFrames: TRANSITION_FRAMES });
  switch (kind) {
    case "fade":
      return { presentation: fade() as AnyPresentation, timing };
    case "slide":
      return { presentation: slide({ direction: "from-right" }) as AnyPresentation, timing };
    case "wipe":
      return { presentation: wipe({ direction: "from-left" }) as AnyPresentation, timing };
    case "flash":
      return { presentation: flash(), timing };
    case "zoom":
      return { presentation: zoom(), timing };
  }
};

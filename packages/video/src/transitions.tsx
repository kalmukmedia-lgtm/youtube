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

/** Hızlı kamera savurması: eski sahne sola fırlar, yeni sahne sağdan hareket bulanıklığıyla gelir. */
const WhipPresentation = ({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<NoProps>) => {
  const p = Easing.inOut(Easing.exp)(presentationProgress);
  const blur = Math.sin(presentationProgress * Math.PI) * 28;
  const x = presentationDirection === "exiting" ? -p * 100 : (1 - p) * 100;
  return <AbsoluteFill style={{ transform: `translateX(${x}%) scaleX(${1 + blur / 140})`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
};

/** Film yanığı: sahneler sıcak bir ışık sızıntısının içinde birbirine erir. */
const BurnPresentation = ({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<NoProps>) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ opacity: 1 - Easing.in(Easing.quad)(p), filter: `brightness(${1 + p * 1.5}) saturate(${1 + p})` }}>{children}</AbsoluteFill>;
  }
  const glow = Math.sin(p * Math.PI);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: Easing.out(Easing.quad)(p), filter: `brightness(${1 + (1 - p) * 1.5})` }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: glow,
          background: "radial-gradient(ellipse at 30% 50%, #ffb347 0%, #ff6a3dcc 30%, transparent 70%), radial-gradient(ellipse at 80% 40%, #ffe7a8 0%, transparent 55%)",
        }}
      />
    </AbsoluteFill>
  );
};

const flash = (): TransitionPresentation<NoProps> => ({ component: FlashPresentation, props: {} });
const whip = (): TransitionPresentation<NoProps> => ({ component: WhipPresentation, props: {} });
const burn = (): TransitionPresentation<NoProps> => ({ component: BurnPresentation, props: {} });
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
    case "whip":
      return { presentation: whip(), timing };
    case "burn":
      return { presentation: burn(), timing };
  }
};

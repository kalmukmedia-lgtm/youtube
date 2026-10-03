import { loadFont } from "@remotion/fonts";
import type { Theme } from "@metaficta/core";
// Fontlar yerel paketlerden yüklenir: render internete bağlı kalmaz ve
// Google Fonts TTF'leri tüm Türkçe karakterleri (ğ, ş, ı, İ) içerir.
import cinzel600 from "@expo-google-fonts/cinzel/600SemiBold/Cinzel_600SemiBold.ttf";
import cinzel700 from "@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf";
import cinzel900 from "@expo-google-fonts/cinzel/900Black/Cinzel_900Black.ttf";
import cormorant500 from "@expo-google-fonts/cormorant-garamond/500Medium/CormorantGaramond_500Medium.ttf";
import cormorant500Italic from "@expo-google-fonts/cormorant-garamond/500Medium_Italic/CormorantGaramond_500Medium_Italic.ttf";
import cormorant700 from "@expo-google-fonts/cormorant-garamond/700Bold/CormorantGaramond_700Bold.ttf";
import inter400 from "@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf";
import inter600 from "@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf";
import inter800 from "@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf";
import spaceGrotesk500 from "@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf";
import spaceGrotesk700 from "@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf";

type FamilyName = Theme["fonts"]["display"] | Theme["fonts"]["body"];

const FILES: Record<FamilyName, [weight: string, url: string][]> = {
  Cinzel: [["600", cinzel600], ["700", cinzel700], ["900", cinzel900]],
  "Cormorant Garamond": [["500", cormorant500], ["700", cormorant700]],
  Inter: [["400", inter400], ["600", inter600], ["800", inter800]],
  "Space Grotesk": [["500", spaceGrotesk500], ["700", spaceGrotesk700]],
};

for (const [family, files] of Object.entries(FILES)) {
  for (const [weight, url] of files) {
    loadFont({ family, url, weight, format: "truetype" });
  }
}

// Alıntı sahneleri için gerçek italik kesim (tarayıcının yapay eğmesi yerine).
loadFont({ family: "Cormorant Garamond", url: cormorant500Italic, weight: "500", style: "italic", format: "truetype" });

export const fontFamily = (name: FamilyName): string => `"${name}"`;

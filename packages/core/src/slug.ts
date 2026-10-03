const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };

/** "Zeus vs Odin — Kim Kazanırdı?" → "zeus-vs-odin-kim-kazanirdi" */
export const slugify = (text: string, maxLength = 60): string =>
  text
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

/** Proje klasörü adı: 2026-10-03-zeus-vs-odin */
export const projectId = (topic: string, date = new Date()): string => `${date.toISOString().slice(0, 10)}-${slugify(topic)}`;

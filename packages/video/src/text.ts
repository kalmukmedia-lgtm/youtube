/** Türkçe büyük harf (i → İ, ı → I). CSS text-transform tarayıcı diline bağlı olduğu için kullanılmıyor. */
export const upper = (text: string): string => text.toLocaleUpperCase("tr-TR");

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const roman = (n: number): string => ROMAN[n] ?? String(n);

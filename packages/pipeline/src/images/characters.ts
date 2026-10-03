import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type Character, CharacterSchema } from "@metaficta/core";
import { PATHS } from "../config";

/*
 * Karakter kütüphanesi: assets/characters/<id>/
 *   character.json   id, ad, kalıcı görünüm tarifi
 *   reference.png    seçilmiş referans portre (her sahne görseline referans olarak verilir)
 *   candidates/      aday portreler (git'e eklenmez)
 */

export const characterDir = (id: string, root = PATHS.characters) => path.join(root, id);
export const referencePath = (id: string, root = PATHS.characters) => path.join(characterDir(id, root), "reference.png");

export const loadCharacter = (id: string, root = PATHS.characters): Character | undefined => {
  const file = path.join(characterDir(id, root), "character.json");
  return existsSync(file) ? CharacterSchema.parse(JSON.parse(readFileSync(file, "utf8"))) : undefined;
};

export const listCharacters = (root = PATHS.characters): (Character & { hasReference: boolean })[] =>
  existsSync(root)
    ? readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
          const character = loadCharacter(entry.name, root);
          return character ? [{ ...character, hasReference: existsSync(referencePath(entry.name, root)) }] : [];
        })
    : [];

export const saveCharacter = (character: Character, root = PATHS.characters) => {
  const dir = characterDir(character.id, root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "character.json"), `${JSON.stringify(character, null, 2)}\n`);
};

/** Senaryo prompt'una eklenecek kütüphane özeti (LLM aynı id ve görünümleri kullansın diye). */
export const characterLibraryPrompt = (root = PATHS.characters): string => {
  const characters = listCharacters(root);
  if (characters.length === 0) return "(Kütüphane henüz boş. Senaryodaki karakterler için yeni id ve görünüm tarifi oluştur.)";
  return characters.map((c) => `- \`${c.id}\` — ${c.name}: ${c.look}`).join("\n");
};

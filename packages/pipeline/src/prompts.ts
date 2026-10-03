import { readFileSync } from "node:fs";
import path from "node:path";
import { PATHS } from "./config";

type Vars = { [key: string]: string | number | Vars };

const lookup = (vars: Vars, key: string): string | number | Vars | undefined =>
  key.split(".").reduce<string | number | Vars | undefined>((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), vars);

/** `{{a.b}}` yer tutucularını doldurur; eksik değişken varsa hata verir (sessizce boş prompt gitmesin). */
export const fillTemplate = (template: string, vars: Vars): string =>
  template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = lookup(vars, key);
    if (value === undefined || typeof value === "object") throw new Error(`Prompt değişkeni eksik: ${key}`);
    return String(value);
  });

export const renderPrompt = (name: string, vars: Vars): string => fillTemplate(readFileSync(path.join(PATHS.prompts, `${name}.md`), "utf8"), vars);

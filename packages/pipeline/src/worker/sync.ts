import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { PanelClient } from "./panel-client";

export type Snapshot = Map<string, { size: number; mtimeMs: number }>;

/** Klasördeki tüm dosyalar (göreli yol, "/" ayraçlı). */
export const snapshot = (root: string, prefixes: string[]): Snapshot => {
  const files: Snapshot = new Map();
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const stat = statSync(full);
        files.set(path.relative(root, full).split(path.sep).join("/"), { size: stat.size, mtimeMs: stat.mtimeMs });
      }
    }
  };
  for (const prefix of prefixes) walk(path.join(root, prefix));
  return files;
};

/** İki anlık görüntü arasında eklenen/değişen ve silinen dosyalar. */
export const diff = (before: Snapshot, after: Snapshot): { changed: string[]; removed: string[] } => ({
  changed: [...after].filter(([file, info]) => {
    const old = before.get(file);
    return !old || old.size !== info.size || old.mtimeMs !== info.mtimeMs;
  }).map(([file]) => file).sort(),
  removed: [...before.keys()].filter((file) => !after.has(file)).sort(),
});

/** Paneldeki bir öneki yerel klasöre indirir; `exclude` ile başlayan göreli yollar atlanır. */
export const pull = async (client: PanelClient, root: string, prefix: string, exclude: string[] = []): Promise<number> => {
  const files = await client.list(prefix);
  let count = 0;
  for (const file of files) {
    if (exclude.some((e) => file.path.startsWith(e))) continue;
    await client.download(file.path, path.join(root, ...file.path.split("/")));
    count++;
  }
  return count;
};

/** Yerelde değişen dosyaları panele yükler, silinenleri panelden de siler. */
export const push = async (client: PanelClient, root: string, changes: { changed: string[]; removed: string[] }, log: (m: string) => void): Promise<void> => {
  for (const file of changes.changed) {
    await client.upload(file, path.join(root, ...file.split("/")));
  }
  for (const file of changes.removed) await client.remove(file);
  if (changes.changed.length || changes.removed.length) log(`☁️  Panele yüklendi: ${changes.changed.length} dosya${changes.removed.length ? `, ${changes.removed.length} dosya silindi` : ""}`);
};

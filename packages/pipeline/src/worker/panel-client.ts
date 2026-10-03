import { mkdirSync, openSync, readSync, closeSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type Fetch = typeof fetch;

export interface ClaimedJob {
  id: number;
  type: string;
  projectId: string | null;
  params: Record<string, unknown>;
}

export interface RemoteFile {
  path: string;
  size: number;
}

/** Paylaşımlı hosting'in istek boyutu sınırına (IIS varsayılanı ~28 MB) takılmamak için parça boyutu. */
export const CHUNK_BYTES = 16 * 1024 * 1024;

/** Panelin işçi API'si (/api/worker) için istemci. */
export class PanelClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: Fetch = fetch,
    private readonly chunkBytes: number = CHUNK_BYTES,
  ) {}

  private url(pathname: string): string {
    return `${this.baseUrl.replace(/\/+$/, "")}/api/worker/${pathname}`;
  }

  private async request(pathname: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.token}`);
    // Ağ kesintilerine karşı birkaç kez dene (paylaşımlı hosting ara sıra yavaş yanıt verebilir).
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.fetchImpl(this.url(pathname), { ...init, headers });
        if (response.status >= 500 && attempt < 3) throw new Error(`Panel ${response.status}`);
        if (!response.ok && response.status !== 204) {
          throw new PanelError(response.status, `Panel isteği başarısız (${response.status}) ${pathname}: ${(await response.text()).slice(0, 300)}`);
        }
        return response;
      } catch (error) {
        if (error instanceof PanelError || attempt >= 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
      }
    }
  }

  private json(pathname: string, body: unknown): Promise<Response> {
    return this.request(pathname, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }

  /** İşi üstlenir; iş yoksa veya başkası almışsa null. */
  async claim(jobId?: number): Promise<ClaimedJob | null> {
    const response = await this.json("jobs/claim", { jobId: jobId ?? null });
    return response.status === 204 ? null : ((await response.json()) as ClaimedJob);
  }

  async log(jobId: number, text: string): Promise<void> {
    await this.json(`jobs/${jobId}/log`, { text });
  }

  async complete(jobId: number, result: { success: boolean; error?: string; projectIds?: string[] }): Promise<void> {
    await this.json(`jobs/${jobId}/complete`, result);
  }

  async list(prefix: string): Promise<RemoteFile[]> {
    const response = await this.request(`files?prefix=${encodeURIComponent(prefix)}`);
    return (await response.json()) as RemoteFile[];
  }

  async download(remotePath: string, localFile: string): Promise<void> {
    const response = await this.request(`files/${encodePath(remotePath)}`);
    mkdirSync(path.dirname(localFile), { recursive: true });
    writeFileSync(localFile, Buffer.from(await response.arrayBuffer()));
  }

  /** Dosyayı 16 MB'lık parçalar halinde yükler; panel son parçada dosyayı yerine taşır. */
  async upload(remotePath: string, localFile: string): Promise<void> {
    const size = statSync(localFile).size;
    const fd = openSync(localFile, "r");
    try {
      let offset = 0;
      do {
        const length = Math.min(this.chunkBytes, size - offset);
        const chunk = Buffer.alloc(length);
        readSync(fd, chunk, 0, length, offset);
        const final = offset + length >= size;
        await this.request(`files/${encodePath(remotePath)}?offset=${offset}&final=${final}`, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Uint8Array(chunk),
        });
        offset += length;
      } while (offset < size);
    } finally {
      closeSync(fd);
    }
  }

  async remove(remotePath: string): Promise<void> {
    await this.request(`files/${encodePath(remotePath)}`, { method: "DELETE" });
  }
}

export class PanelError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

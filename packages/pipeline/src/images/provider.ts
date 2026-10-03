export interface ImageRequest {
  prompt: string;
  width: number;
  height: number;
  /** Karakter referans görselleri (en fazla 4, 512x512'den küçük). */
  references: Buffer[];
}

export interface GeneratedImage {
  data: Buffer;
  extension: "png" | "jpg" | "webp";
}

export interface ImageProvider {
  generate(request: ImageRequest): Promise<GeneratedImage>;
}

/** Sağlayıcı içerik politikası gerekçesiyle görseli reddetti; yumuşatılmış prompt ile yeniden denenebilir. */
export class ImageRefusedError extends Error {}

const REFUSAL_PATTERN = /nsfw|safety|flagged|moderation|content polic|inappropriate/i;

export const detectExtension = (data: Buffer): GeneratedImage["extension"] => {
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "png";
  if (data[0] === 0xff && data[1] === 0xd8) return "jpg";
  if (data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  throw new Error("Sağlayıcıdan gelen veri tanınan bir görsel biçimi değil.");
};

type Fetch = typeof fetch;

/**
 * Cloudflare Workers AI — FLUX.2 [klein]. İstek multipart/form-data; referans görseller
 * input_image_0…input_image_3 alanlarında gönderilir. Cevap ham görsel baytları ya da
 * `result.image` içinde base64 olabilir; ikisi de desteklenir.
 */
export class CloudflareImageProvider implements ImageProvider {
  constructor(
    private readonly accountId: string,
    private readonly apiToken: string,
    private readonly model: string,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  async generate(request: ImageRequest): Promise<GeneratedImage> {
    if (request.references.length > 4) throw new Error("En fazla 4 referans görsel gönderilebilir.");
    const form = new FormData();
    form.append("prompt", request.prompt);
    form.append("width", String(request.width));
    form.append("height", String(request.height));
    request.references.forEach((ref, i) => form.append(`input_image_${i}`, new Blob([new Uint8Array(ref)], { type: "image/png" }), `reference_${i}.png`));

    const response = await this.fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiToken}` },
      body: form,
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.startsWith("image/")) {
      const data = Buffer.from(await response.arrayBuffer());
      return { data, extension: detectExtension(data) };
    }

    const text = await response.text();
    let body: { success?: boolean; result?: { image?: string }; errors?: { message?: string }[] } = {};
    try {
      body = JSON.parse(text);
    } catch {
      // JSON değilse hata mesajı olarak ham metni kullan
    }
    const image = body.result?.image;
    if (response.ok && body.success !== false && image) {
      const data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
      return { data, extension: detectExtension(data) };
    }

    const message = body.errors?.map((e) => e.message).filter(Boolean).join("; ") || text.slice(0, 300) || response.statusText;
    if (REFUSAL_PATTERN.test(message)) throw new ImageRefusedError(message);
    throw new Error(`Cloudflare görsel hatası (${response.status}): ${message}`);
  }
}

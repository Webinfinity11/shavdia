// Virtual try-on through the Gemini image API. Photos are sent to Google and never saved here.

const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const TIMEOUT_MS = 90_000;

const HOURLY_PER_VISITOR = 6;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PROMPT = `Virtual clothing try-on for a fashion shop.
The first image shows the customer. The second image shows the product, possibly worn by a model.
Create a realistic photo of the customer from the first image wearing the garment or outfit from the second image.
Keep exactly: the customer's face, identity, skin tone, hair, body shape, pose, and the background and lighting of the first image.
Copy exactly from the second image: the garment's colour, fabric, texture, cut, length, pockets, zips, prints and any writing or logos.
Replace only the clothing that the new garment would cover. Ignore the person and background in the second image.
The fit and folds must look natural on the customer's body. Keep the customer fully and modestly dressed. Add no text or watermark.`;

export type TryOnResult = { ok: true; image: Buffer } | { ok: false; reason: "blocked" | "failed" | "unavailable" };

/** Finds the image in the API answer. */
export function readImage(answer: unknown): string | null {
  const data = answer as {
    output_image?: { data?: unknown };
    steps?: { type?: string; content?: { type?: string; data?: unknown }[] }[];
  } | null;
  if (typeof data?.output_image?.data === "string") return data.output_image.data;
  for (const step of data?.steps ?? []) {
    if (step.type !== "model_output") continue;
    for (const block of step.content ?? []) {
      if (block.type === "image" && typeof block.data === "string") return block.data;
    }
  }
  return null;
}

export async function generateTryOn(person: Buffer, product: Buffer, apiKey: string): Promise<TryOnResult> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": API_REVISION },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL,
        input: [
          { type: "text", text: PROMPT },
          { type: "image", mime_type: "image/jpeg", data: person.toString("base64") },
          { type: "image", mime_type: "image/jpeg", data: product.toString("base64") },
        ],
        response_format: { type: "image", aspect_ratio: "3:4", image_size: "1K" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("try-on: Gemini answered", res.status, (await res.text()).slice(0, 300));
      // 429: the Google account has no quota left, or billing is not enabled yet.
      return { ok: false, reason: res.status === 429 ? "unavailable" : "failed" };
    }
    const image = readImage(await res.json());
    // An answer without an image usually means the safety filter declined the photo.
    return image ? { ok: true, image: Buffer.from(image, "base64") } : { ok: false, reason: "blocked" };
  } catch (error) {
    console.error("try-on: request failed", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}

// Each generated image costs money, so requests are limited. Counts live in memory: this app runs as one instance.
const visitors = new Map<string, { count: number; resetAt: number }>();
let day = { count: 0, resetAt: 0 };

export function takeTryOnSlot(visitor: string, now = Date.now()): "ok" | "visitor" | "daily" {
  const dailyLimit = Number(process.env.TRY_ON_DAILY_LIMIT) || 100;
  if (now >= day.resetAt) day = { count: 0, resetAt: now + DAY_MS };
  if (day.count >= dailyLimit) return "daily";

  if (visitors.size > 5000) {
    for (const [key, row] of visitors) if (now >= row.resetAt) visitors.delete(key);
  }
  const row = visitors.get(visitor);
  const current = row && now < row.resetAt ? row : { count: 0, resetAt: now + HOUR_MS };
  if (current.count >= HOURLY_PER_VISITOR) return "visitor";

  current.count += 1;
  visitors.set(visitor, current);
  day.count += 1;
  return "ok";
}

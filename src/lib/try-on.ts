// Virtual try-on through the Gemini image API. Photos are sent to Google and never saved here.

const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const TIMEOUT_MS = 90_000;

const HOURLY_PER_VISITOR = 6;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const GARMENTS: Record<string, string> = {
  maika: "T-shirt",
  perangi: "shirt",
  hudi: "hoodie",
  qurtuki: "jacket",
  sharvali: "trousers",
  kaba: "dress",
  "sportuli-oreuli": "two-piece tracksuit (top and bottoms)",
  phexsacmeli: "pair of shoes",
  chanta: "bag",
};

/** What to put on the customer, read from the product's categories. Null when they do not say. */
export function garmentFromCategories(slugs: string[]) {
  const known = [...new Set(slugs.flatMap((slug) => (GARMENTS[slug] ? [GARMENTS[slug]] : [])))];
  return known.length === 1 ? known[0] : null;
}

export function buildPrompt(garment: string | null) {
  const target = garment
    ? `The product is the ${garment} in the second image. Put ONLY this ${garment} on the customer. Everything else the customer is wearing must stay exactly as it is in the first image. Ignore every other item in the second image, even if the model there wears it.`
    : "The product is the complete outfit worn or shown in the second image. Put that outfit on the customer.";
  return `Virtual clothing try-on for a fashion shop.
The first image shows the customer. The second image shows the product, possibly worn by a model.
${target}
Keep exactly: the customer's face, identity, skin tone, hair, body shape, pose, and the background and lighting of the first image.
Copy exactly from the second image: the product's colour, fabric, texture, cut, length, pockets, zips, prints and any writing or logos.
The fit and folds must look natural on the customer's body. Keep the customer fully and modestly dressed. Show the whole person from the first image. Add no text or watermark.`;
}

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

export async function generateTryOn(person: Buffer, product: Buffer, garment: string | null, apiKey: string): Promise<TryOnResult> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": API_REVISION },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL,
        input: [
          { type: "text", text: buildPrompt(garment) },
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

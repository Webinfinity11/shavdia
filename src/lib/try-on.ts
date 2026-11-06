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
    ? `Change ONLY the customer's clothing that this ${garment} would replace, using the ${garment} shown in IMAGE 2. All other clothing and shoes the customer wears stay exactly as they are in IMAGE 1. Ignore every other item in IMAGE 2.`
    : "Change the customer's clothing to the complete outfit shown in IMAGE 2.";
  return `This is a photo EDIT of IMAGE 1, not a new photo. IMAGE 1 is the customer. IMAGE 2 is only a reference for a clothing item.

${target}

IMAGE 1 stays the base of the result. Do not change, in any way:
- the pose: the head, arms, hands, legs and feet stay in exactly the same position and at the same angle, even if the pose is unusual, seated or has raised arms
- the body: the same build, weight, height, shoulder width, waist and proportions. Never make the customer larger, more muscular, taller or more like the person in IMAGE 2
- the face, hair, skin tone and identity
- the background, lighting, camera angle, framing and crop

If a person appears in IMAGE 2, they do not matter. Do not copy their body, pose, height, proportions, gender, hands or background. Use IMAGE 2 only for the garment's colour, fabric, texture, cut, length, pockets, zips, prints, writing and logos.

Reshape the garment to fit the customer's exact body and pose from IMAGE 1, with natural folds: sleeves follow the customer's arms, and fabric bends with how they stand or sit. Keep the customer fully and modestly dressed. Add no text or watermark.`;
}

const ASPECT_RATIOS = [
  ["1:1", 1],
  ["4:5", 4 / 5],
  ["5:4", 5 / 4],
  ["3:4", 3 / 4],
  ["4:3", 4 / 3],
  ["2:3", 2 / 3],
  ["3:2", 3 / 2],
  ["9:16", 9 / 16],
  ["16:9", 16 / 9],
] as const;

/** The supported shape closest to the customer's photo, so the result keeps its framing. */
export function closestAspectRatio(width: number, height: number) {
  const ratio = width / height;
  return ASPECT_RATIOS.reduce((best, row) => (Math.abs(row[1] - ratio) < Math.abs(best[1] - ratio) ? row : best))[0];
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

export async function generateTryOn(person: Buffer, product: Buffer, garment: string | null, aspectRatio: string, apiKey: string): Promise<TryOnResult> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": API_REVISION },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL,
        input: [
          { type: "text", text: "IMAGE 1, the customer:" },
          { type: "image", mime_type: "image/jpeg", data: person.toString("base64") },
          { type: "text", text: "IMAGE 2, the clothing reference:" },
          { type: "image", mime_type: "image/jpeg", data: product.toString("base64") },
          { type: "text", text: buildPrompt(garment) },
        ],
        response_format: { type: "image", aspect_ratio: aspectRatio, image_size: "1K" },
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

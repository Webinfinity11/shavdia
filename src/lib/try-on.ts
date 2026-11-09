// Virtual try-on through the Gemini image API. Photos are sent to Google and never saved here.

import sharp from "sharp";

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

// Word beginnings in product names. Sets come first: "მაისურის და შარვლის ორეული" is a set.
const NAME_WORDS: [RegExp, string][] = [
  [/(^|[\s,.(-])(ორეულ|კომპლექტ|სპორტული კოსტიუმ)/, GARMENTS["sportuli-oreuli"]],
  [/(^|[\s,.(-])(მაისურ|მაიკ|ფუტბოლკ)/, GARMENTS.maika],
  [/(^|[\s,.(-])(ჰუდი|ჰუდ|სვიტერ|ჯემპრ)/, GARMENTS.hudi],
  [/(^|[\s,.(-])პერანგ/, GARMENTS.perangi],
  [/(^|[\s,.(-])(ქურთუ|პიჯაკ|პალტო)/, GARMENTS.qurtuki],
  [/(^|[\s,.(-])(შარვალ|შარვლ|ჯინს)/, GARMENTS.sharvali],
  [/(^|[\s,.(-])შორტ/, "shorts"],
  [/(^|[\s,.(-])(კაბა|კაბის|კაბე)/, GARMENTS.kaba],
  [/(^|[\s,.(-])(ფეხსაცმ|ბოტას|სპორტული ფეხ)/, GARMENTS.phexsacmeli],
  [/(^|[\s,.(-])ჩანთ/, GARMENTS.chanta],
];

/**
 * What to put on the customer. The product's name decides first, then a single clear category.
 * Null means neither says, and the product is worked out from its photos.
 */
export function garmentFromProduct(name: string, categorySlugs: string[]) {
  const lower = name.toLowerCase();
  const fromName = NAME_WORDS.find(([words]) => words.test(lower));
  if (fromName) return fromName[1];
  const known = [...new Set(categorySlugs.flatMap((slug) => (GARMENTS[slug] ? [GARMENTS[slug]] : [])))];
  return known.length === 1 ? known[0] : null;
}

export function buildPrompt(garment: string | null) {
  const target = garment
    ? `The product is the ${garment}. Change ONLY the customer's clothing that this ${garment} would replace. All other clothing and shoes the customer wears stay exactly as they are in IMAGE 1. Ignore every other item in IMAGE 2.`
    : `First work out what the product is: it is the item that the photos in IMAGE 2 focus on, usually the one shown close up or from several sides. Other things a model wears or holds, such as shorts, trousers, shoes, socks or bags, are only styling and are NOT the product, unless they clearly match the top in fabric and colour as one set. Change ONLY the customer's clothing that the product would replace. All other clothing and shoes the customer wears stay exactly as they are in IMAGE 1.`;
  return `This is a photo EDIT of IMAGE 1, not a new photo. IMAGE 1 is the customer. IMAGE 2 is only a reference for a clothing item: a collage of one or more photos of the same product.

${target}

IMAGE 1 stays the base of the result. Do not change, in any way:
- the pose: the head, arms, hands, legs and feet stay in exactly the same position and at the same angle, even if the pose is unusual, seated or has raised arms
- the body: the same build, weight, height, shoulder width, waist and proportions. Never make the customer larger, more muscular, taller or more like the person in IMAGE 2
- the face, hair, skin tone and identity
- the background, lighting, camera angle, framing and crop

If a person appears in IMAGE 2, they do not matter. Do not copy their body, pose, height, proportions, gender, hands or background. Use IMAGE 2 only for the garment itself.

The garment must be an exact 1:1 copy of the one in IMAGE 2, as if the customer put on that very piece. Study every photo in IMAGE 2 and copy precisely:
- the exact colour and shade of every part, with no shift in hue, brightness or saturation, and the same colour on trims, cuffs, collar and stitching
- the fabric and its texture: knit, denim, leather, fleece, sheen or matte, ribbing, quilting
- the cut and fit: loose, oversized, regular or slim, exactly as loose or tight as in IMAGE 2
- where it ends on the body: the hem length relative to the hips or knees and the sleeve length relative to the wrist or elbow, the same as in IMAGE 2
- the neckline, collar, hood, cuffs and hem shape
- every detail at its exact place, size and count: buttons, zips, pockets, seams, panels, stripes, drawstrings, patches, labels
- every print, pattern, logo and piece of writing at the same position, size and orientation, with the same letters spelled exactly; keep logos sharp and do not mirror them
If the photos in IMAGE 2 show the garment in different colours, use only the colour shown in the first photo (top left) and use the other photos only for shape and details.
Do not simplify, redesign, recolour or "improve" the garment, and do not add any detail that is not in IMAGE 2. If a part is hidden in IMAGE 2, continue it in the same style as the visible parts.

Reshape the garment to fit the customer's exact body and pose from IMAGE 1, with natural folds: sleeves follow the customer's arms, and fabric bends with how they stand or sit. Light the garment with the lighting of IMAGE 1, without changing its real colour. Keep the customer fully and modestly dressed. Add no text or watermark.`;
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

const COLLAGE_PHOTOS = 4;
const CELL_WIDTH = 480;
const CELL_HEIGHT = 640;

/** Cuts away the plain white or flat background around a product photo, so the garment fills more of its cell. */
async function trimBorder(photo: Buffer) {
  try {
    const trimmed = await sharp(photo).rotate().flatten({ background: "#ffffff" }).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
    // A tiny result means the trim ate the garment (for example a white shirt on white); keep the original.
    return trimmed.info.width >= 120 && trimmed.info.height >= 120 ? trimmed.data : photo;
  } catch {
    return photo;
  }
}

/** Puts the product's photos into one picture, so more views cost no more than one input image. */
export async function buildProductCollage(photos: Buffer[]) {
  const used = photos.slice(0, COLLAGE_PHOTOS);
  const columns = used.length === 4 ? 2 : used.length;
  const rows = Math.ceil(used.length / columns);
  const cells = await Promise.all(
    used.map(async (photo) =>
      sharp(await trimBorder(photo))
        .resize(CELL_WIDTH, CELL_HEIGHT, { fit: "contain", background: "#ffffff", kernel: "lanczos3" })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 92 })
        .toBuffer(),
    ),
  );
  return sharp({ create: { width: columns * CELL_WIDTH, height: rows * CELL_HEIGHT, channels: 3, background: "#ffffff" } })
    .composite(cells.map((input, index) => ({ input, left: (index % columns) * CELL_WIDTH, top: Math.floor(index / columns) * CELL_HEIGHT })))
    .jpeg({ quality: 92 })
    .toBuffer();
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

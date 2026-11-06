import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { uploadDir } from "@/lib/storage";
import { buildProductCollage, closestAspectRatio, garmentFromCategories, generateTryOn, takeTryOnSlot } from "@/lib/try-on";

const MAX_BYTES = 10 * 1024 * 1024;
const MIN_SIDE = 256;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function fail(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/** Product photos are read from our own folders, chosen by the server from the product's record. */
async function readProductPhoto(url: string) {
  const name = path.basename(url);
  if (/^\/uploads\/[\w-]+\.webp$/.test(url)) return readFile(path.join(/* turbopackIgnore: true */ uploadDir(), name));
  if (/^\/(uploads\/products|images)\/[\w./-]+$/.test(url) && !url.includes("..")) {
    return readFile(path.join(/* turbopackIgnore: true */ process.cwd(), "public", url));
  }
  throw new Error("Unexpected product photo address");
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(503, "მოზომება ჯერ არ არის ჩართული.");
  if (!isSameOrigin(request)) return fail(403, "მოთხოვნა უარყოფილია.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "ფოტო ვერ წავიკითხეთ.");
  }
  if (form.get("consent") !== "1") return fail(400, "დაადასტურე, რომ ფოტოს გამოყენების უფლება გაქვს.");

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return fail(400, "აირჩიე ფოტო.");
  if (!PHOTO_TYPES.includes(photo.type)) return fail(400, "დასაშვებია მხოლოდ JPG, PNG და WebP ფოტო.");
  if (photo.size > MAX_BYTES) return fail(400, "ფოტო 10 MB-ზე დიდია.");

  const productId = Number(form.get("productId"));
  if (!Number.isInteger(productId)) return fail(400, "პროდუქტი ვერ მოიძებნა.");
  const product = await db.product.findFirst({
    where: { id: productId, status: "published" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 4 }, categories: { select: { slug: true } } },
  });
  if (!product?.images.length) return fail(404, "პროდუქტის ფოტო ვერ მოიძებნა.");

  // Re-encoding rejects files that are not really images and removes metadata such as location.
  let person: Buffer;
  let aspectRatio: string;
  try {
    const source = sharp(Buffer.from(await photo.arrayBuffer())).rotate();
    const { width, height } = await source.metadata();
    if (Math.min(width, height) < MIN_SIDE) return fail(400, "ფოტო ძალიან პატარაა. აირჩიე უფრო დიდი ფოტო.");
    const upright = await sharp(Buffer.from(await photo.arrayBuffer())).rotate().toBuffer({ resolveWithObject: true });
    aspectRatio = closestAspectRatio(upright.info.width, upright.info.height);
    person = await source.resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  } catch {
    return fail(400, "ეს ფაილი ფოტოდ ვერ წავიკითხეთ.");
  }

  // Railway sets x-real-ip. The last forwarded address is the one its edge added.
  const visitor = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "local";
  const slot = takeTryOnSlot(visitor);
  if (slot === "visitor") return fail(429, "ცდების ლიმიტი ამოიწურა. სცადე ერთ საათში.");
  if (slot === "daily") return fail(429, "დღევანდელი ცდები ამოიწურა. სცადე ხვალ.");

  const garment = await buildProductCollage(await Promise.all(product.images.map((image) => readProductPhoto(image.url))));

  const garmentType = garmentFromCategories(product.categories.map((category) => category.slug));
  const result = await generateTryOn(person, garment, garmentType, aspectRatio, apiKey);
  if (!result.ok) {
    if (result.reason === "unavailable") return fail(503, "მოზომება დროებით მიუწვდომელია. სცადე მოგვიანებით.");
    return result.reason === "blocked"
      ? fail(422, "ამ ფოტოზე მოზომება ვერ მოხერხდა. სცადე სხვა ფოტო, სადაც მთლიანად ჩანხარ.")
      : fail(502, "მოზომება ვერ მოხერხდა. სცადე ცოტა ხანში.");
  }

  const image = await sharp(result.image).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
}

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Folder for photos uploaded in the admin panel. In production this is a volume, via UPLOAD_DIR. */
export function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads");
}

/**
 * Saves an uploaded photo as WebP and returns its public URL.
 * Re-encoding rejects files that are not really images and removes metadata such as location.
 */
export async function saveImage(file: File) {
  if (!TYPES.includes(file.type)) throw new Error(`${file.name}: დასაშვებია მხოლოდ JPG, PNG, WebP და AVIF`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name}: ფაილი 15 MB-ზე დიდია`);

  const output = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const name = `${randomUUID()}.webp`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ dir, name), output);
  return `/uploads/${name}`;
}

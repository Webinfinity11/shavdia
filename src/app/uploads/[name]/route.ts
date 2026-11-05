import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/storage";

// Serves photos uploaded in the admin panel. Files added after the build are not in public/.
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[\w-]+\.webp$/.test(name)) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(path.join(/* turbopackIgnore: true */ uploadDir(), name));
    return new Response(file, {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

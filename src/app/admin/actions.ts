"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSessionToken, safeEqual, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/orders";
import { isOptionAttribute, parseAttributes, type ColorOption } from "@/lib/product";
import { CONTENT_TAG, type AboutContent, type HomeContent, type SiteInfo, type StoreInfo } from "@/lib/site-content";
import { slugify } from "@/lib/slug";
import { saveImage } from "@/lib/storage";

export type ActionState = { ok: boolean; message: string } | null;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function json<T>(formData: FormData, name: string, fallback: T): T {
  try {
    return JSON.parse(String(formData.get(name) ?? "")) as T;
  } catch {
    return fallback;
  }
}

/** Only our own photo folders. Next.js image optimisation rejects anything else. */
function isOwnImage(url: unknown): url is string {
  return typeof url === "string" && /^\/(uploads|images)\/[\w./-]+$/.test(url) && !url.includes("..");
}

/** Internal path or https address. Rules out javascript: links. */
function isSafeLink(url: string) {
  return /^\/(?!\/)/.test(url) || /^https:\/\//.test(url);
}

/** Lari as typed, with a dot or comma, to tetri. Empty gives null, invalid gives NaN. */
function toTetri(value: string) {
  if (!value) return null;
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
}

async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  const root = base || "item";
  let slug = root;
  for (let suffix = 2; await taken(slug); suffix++) slug = `${root}-${suffix}`;
  return slug;
}

// ---------- Session ----------

export async function login(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  const expectedUsername = process.env.ADMIN_USERNAME ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedUsername || !expectedPassword) return { ok: false, message: "ადმინის მონაცემები მითითებული არ არის." };

  if (!(safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword))) {
    await new Promise((resolve) => setTimeout(resolve, 600)); // slows down guessing
    return { ok: false, message: "მომხმარებელი ან პაროლი არასწორია." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  const next = text(formData, "next");
  redirect(/^\/admin(\/|$)/.test(next) ? next : "/admin");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------- Photos ----------

export async function uploadImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ფაილი არჩეული არ არის." };
  try {
    return { url: await saveImage(file) };
  } catch (error) {
    console.error(error);
    return { error: error instanceof Error && error.message.includes(":") ? error.message : `${file.name}: ფოტო ვერ აიტვირთა.` };
  }
}

// ---------- Products ----------

export async function saveProduct(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "მიუთითე პროდუქტის სახელი." };

  const price = toTetri(text(formData, "price"));
  const salePrice = toTetri(text(formData, "salePrice"));
  if (price === null || Number.isNaN(price)) return { ok: false, message: "მიუთითე სწორი ფასი." };
  if (Number.isNaN(salePrice)) return { ok: false, message: "ფასდაკლებული ფასი არასწორია." };
  if (salePrice !== null && salePrice >= price) return { ok: false, message: "ფასდაკლებული ფასი ძველ ფასზე ნაკლები უნდა იყოს." };

  const stockText = text(formData, "stockQuantity");
  const stockQuantity = stockText ? Number(stockText) : null;
  if (stockQuantity !== null && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) {
    return { ok: false, message: "რაოდენობა მთელი რიცხვი უნდა იყოს." };
  }

  const images = json<unknown[]>(formData, "images", []).filter(isOwnImage);
  const categoryIds = formData.getAll("categories").map(Number).filter(Number.isInteger);
  const sizes = [...new Set(text(formData, "sizes").split(",").map((size) => size.trim()).filter(Boolean))];
  const colors = json<ColorOption[]>(formData, "colors", [])
    .filter((color) => color?.name?.trim() && /^#[0-9a-f]{6}$/i.test(color.hex))
    .map((color) => ({ name: color.name.trim(), hex: color.hex }));

  const existing = id ? await db.product.findUnique({ where: { id }, select: { attributes: true } }) : null;
  if (id && !existing) return { ok: false, message: "პროდუქტი ვერ მოიძებნა." };
  const otherAttributes = parseAttributes(existing?.attributes).filter((row) => !isOptionAttribute(row.name));

  const requestedSlug = text(formData, "slug");
  // Imported products keep their Georgian links, so letters of any alphabet are allowed.
  const cleanSlug = requestedSlug.replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/^-+|-+$/g, "");
  const slug = await uniqueSlug(cleanSlug || slugify(name), async (candidate) => {
    const row = await db.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(row && row.id !== id);
  });

  const inStock = text(formData, "stockStatus") !== "outofstock";
  const fields = {
    name,
    slug,
    shortDescription: text(formData, "shortDescription") || null,
    description: text(formData, "description") || null,
    sku: text(formData, "sku") || null,
    price,
    salePrice,
    stockQuantity,
    stockStatus: inStock ? "instock" : "outofstock",
    status: text(formData, "status") === "draft" ? "draft" : "published",
    featured: formData.get("featured") === "on",
    attributes: [
      ...otherAttributes,
      ...(sizes.length ? [{ name: "ზომა", values: sizes }] : []),
      ...(colors.length
        ? [{ name: "ფერი", values: colors.map((color) => color.name), colors: Object.fromEntries(colors.map((color) => [color.name, color.hex])) }]
        : []),
    ],
  };
  const imageRows = images.map((url, sortOrder) => ({ url, sortOrder }));
  const categoryRefs = categoryIds.map((categoryId) => ({ id: categoryId }));

  const row = id
    ? await db.product.update({
        where: { id },
        data: { ...fields, categories: { set: categoryRefs }, images: { deleteMany: {}, create: imageRows } },
      })
    : await db.product.create({
        data: { ...fields, categories: { connect: categoryRefs }, images: { create: imageRows } },
      });

  updateTag(CATALOG_TAG);
  redirect(`/admin/products/${row.id}?saved=1`);
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  await db.product.delete({ where: { id: Number(formData.get("id")) } });
  updateTag(CATALOG_TAG);
  redirect("/admin/products?deleted=1");
}

// ---------- Categories ----------

export async function saveCategory(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const name = text(formData, "name");
  if (!name) return { ok: false, message: "მიუთითე კატეგორიის სახელი." };

  const slug = await uniqueSlug(slugify(text(formData, "slug")) || slugify(name), async (candidate) => {
    const row = await db.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(row && row.id !== id);
  });
  const image = text(formData, "image");
  const fields = {
    name,
    slug,
    description: text(formData, "description") || null,
    image: isOwnImage(image) ? image : null,
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };

  if (id) await db.category.update({ where: { id }, data: fields });
  else await db.category.create({ data: fields });

  updateTag(CATALOG_TAG);
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  await db.category.delete({ where: { id: Number(formData.get("id")) } });
  updateTag(CATALOG_TAG);
  redirect("/admin/categories?deleted=1");
}

// ---------- Site content ----------

async function writeSetting(key: string, value: object) {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  updateTag(CONTENT_TAG);
}

export async function saveHome(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const home: HomeContent = {
    heroImage: text(formData, "heroImage"),
    heroAlt: text(formData, "heroAlt"),
    heroCaption: text(formData, "heroCaption"),
    detailImage: text(formData, "detailImage"),
    detailAlt: text(formData, "detailAlt"),
    editorialTitle: text(formData, "editorialTitle"),
    editorialButton: text(formData, "editorialButton"),
    editorialLink: text(formData, "editorialLink"),
    collectionTitle: text(formData, "collectionTitle"),
    tiles: [0, 1].map((index) => ({
      image: text(formData, `tile${index}Image`),
      label: text(formData, `tile${index}Label`),
      link: text(formData, `tile${index}Link`),
    })),
  };
  const images = [home.heroImage, home.detailImage, ...home.tiles.map((tile) => tile.image)];
  if (!images.every(isOwnImage)) return { ok: false, message: "ყველა ბანერს ფოტო უნდა ჰქონდეს." };
  const links = [home.editorialLink, ...home.tiles.map((tile) => tile.link)];
  if (!links.every(isSafeLink)) return { ok: false, message: "ბმული უნდა იწყებოდეს / ან https:// სიმბოლოებით." };
  const required = [home.editorialTitle, home.editorialButton, home.collectionTitle];
  if (required.some((value) => !value) || home.tiles.some((tile) => !tile.label)) {
    return { ok: false, message: "შეავსე ყველა სათაური." };
  }

  await writeSetting("home", home);
  return { ok: true, message: "შენახულია." };
}

export async function saveSite(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const site: SiteInfo = {
    description: text(formData, "description"),
    announcement: text(formData, "announcement"),
    announcementLabel: text(formData, "announcementLabel"),
    announcementLink: text(formData, "announcementLink"),
    contactTitle: text(formData, "contactTitle"),
    contactImage: text(formData, "contactImage"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    address: text(formData, "address"),
    instagram: text(formData, "instagram"),
    facebook: text(formData, "facebook"),
    copyright: text(formData, "copyright"),
    stores: json<StoreInfo[]>(formData, "stores", [])
      .map((store) => ({ name: String(store?.name ?? "").trim(), address: String(store?.address ?? "").trim() }))
      .filter((store) => store.name),
  };
  if (!site.contactTitle) return { ok: false, message: "მიუთითე კონტაქტის გვერდის სათაური." };
  if (!isOwnImage(site.contactImage)) return { ok: false, message: "კონტაქტის გვერდს ფოტო უნდა ჰქონდეს." };
  if ([site.instagram, site.facebook].some((url) => url && !url.startsWith("https://"))) {
    return { ok: false, message: "სოციალური ქსელის ბმული უნდა იწყებოდეს https:// სიმბოლოებით." };
  }
  if (site.announcementLink && !isSafeLink(site.announcementLink)) {
    return { ok: false, message: "ბმული უნდა იწყებოდეს / ან https:// სიმბოლოებით." };
  }

  await writeSetting("site", site);
  return { ok: true, message: "შენახულია." };
}

export async function saveAbout(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const about: AboutContent = {
    title: text(formData, "title"),
    image: text(formData, "image"),
    intro: text(formData, "intro"),
    story: text(formData, "story"),
    photos: json<unknown[]>(formData, "photos", []).filter(isOwnImage).slice(0, 3),
    slogan: text(formData, "slogan"),
    featuresTitle: text(formData, "featuresTitle"),
    featuresSubtitle: text(formData, "featuresSubtitle"),
    features: [0, 1, 2, 3].map((index) => ({
      title: text(formData, `feature${index}Title`),
      text: text(formData, `feature${index}Text`),
    })),
  };
  if (!about.title) return { ok: false, message: "მიუთითე სათაური." };
  if (!isOwnImage(about.image)) return { ok: false, message: "გვერდს ფოტო უნდა ჰქონდეს." };

  await writeSetting("about", about);
  return { ok: true, message: "შენახულია." };
}

// ---------- Orders ----------

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = text(formData, "status");
  if (Number.isInteger(id) && ORDER_STATUSES.some((option) => option.value === status)) {
    await db.order.update({ where: { id }, data: { status } });
  }
  redirect(`/admin/orders/${id}?saved=1`);
}

"use server";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { currentPrice, readOptions } from "@/lib/product";

export type CheckoutFields = "firstName" | "lastName" | "phone" | "personalId" | "email" | "address" | "city";

export type CheckoutState =
  | null
  | { ok: true; token: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<CheckoutFields, string>>;
      /** Lines whose price changed since they were added to the bag */
      repriced?: { key: string; price: number }[];
      /** Lines that can no longer be bought */
      removed?: string[];
    };

type IncomingLine = { key: string; productId: number; size: string; color: string; quantity: number; price: number };

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

function parseLines(value: FormDataEntryValue | null): IncomingLine[] {
  try {
    const rows = JSON.parse(String(value ?? "[]"));
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, MAX_LINES).flatMap((row) =>
      row &&
      typeof row.key === "string" &&
      Number.isInteger(row.productId) &&
      Number.isInteger(row.price) &&
      Number.isInteger(row.quantity) &&
      row.quantity >= 1 &&
      row.quantity <= MAX_QUANTITY
        ? [{ key: row.key, productId: row.productId, size: String(row.size ?? ""), color: String(row.color ?? ""), quantity: row.quantity, price: row.price }]
        : [],
    );
  } catch {
    return [];
  }
}

export async function placeOrder(_previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const field = (name: CheckoutFields) => String(formData.get(name) ?? "").trim().slice(0, 200);
  const values = {
    firstName: field("firstName"),
    lastName: field("lastName"),
    phone: field("phone").replace(/[\s()-]/g, ""),
    personalId: field("personalId").replace(/\s/g, ""),
    email: field("email").toLowerCase(),
    address: field("address"),
    city: field("city"),
  };

  const fieldErrors: Partial<Record<CheckoutFields, string>> = {};
  if (!values.firstName) fieldErrors.firstName = "მიუთითე სახელი.";
  if (!values.lastName) fieldErrors.lastName = "მიუთითე გვარი.";
  if (!/^\+?\d{9,15}$/.test(values.phone)) fieldErrors.phone = "მიუთითე სწორი ტელეფონის ნომერი.";
  if (!/^\d{11}$/.test(values.personalId)) fieldErrors.personalId = "პირადი ნომერი 11 ციფრისგან უნდა შედგებოდეს.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fieldErrors.email = "მიუთითე სწორი ელფოსტა.";
  if (!values.address) fieldErrors.address = "მიუთითე მისამართი.";
  if (!values.city) fieldErrors.city = "მიუთითე ქალაქი.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "გთხოვ, შეამოწმო შევსებული ველები.", fieldErrors };

  const lines = parseLines(formData.get("items"));
  if (!lines.length) return { ok: false, message: "კალათა ცარიელია." };

  // Prices, stock and options always come from the database, never from the browser.
  const products = await db.product.findMany({
    where: { id: { in: lines.map((line) => line.productId) }, status: "published" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  const removed: string[] = [];
  const repriced: { key: string; price: number }[] = [];
  const items = lines.flatMap((line) => {
    const product = products.find((row) => row.id === line.productId);
    if (!product || product.stockStatus === "outofstock" || !product.price) {
      removed.push(line.key);
      return [];
    }
    const { sizes, colors } = readOptions(product.attributes);
    const sizeOk = sizes.length ? sizes.includes(line.size) : line.size === "";
    const colorOk = colors.length ? colors.some((color) => color.name === line.color) : line.color === "";
    if (!sizeOk || !colorOk) {
      removed.push(line.key);
      return [];
    }
    const price = currentPrice({ price: product.price, salePrice: product.salePrice });
    if (price !== line.price) repriced.push({ key: line.key, price });
    return [{ productId: product.id, name: product.name, image: product.images[0]?.url ?? null, size: line.size, color: line.color, price, quantity: line.quantity }];
  });

  if (removed.length) {
    return { ok: false, message: "კალათის ზოგიერთი პროდუქტი აღარ არის ხელმისაწვდომი და ამოვიღეთ. გადაამოწმე შეკვეთა.", removed, repriced };
  }
  if (repriced.length) {
    return { ok: false, message: "ზოგიერთი პროდუქტის ფასი შეიცვალა. გადაამოწმე ჯამი და დაადასტურე თავიდან.", repriced };
  }

  const token = randomUUID();
  await db.order.create({
    data: {
      token,
      ...values,
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      items: { create: items },
    },
  });
  return { ok: true, token };
}

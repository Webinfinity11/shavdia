import { useSyncExternalStore } from "react";
import { currentPrice, type ProductSummary } from "./product";

// Cart and favourites, kept in the browser. Rows hold a copy of what they show,
// so the bag opens instantly. Checkout must re-read prices from the database.

export type CartItem = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  size: string;
  color: string;
  quantity: number;
};

type ShopState = { cart: CartItem[]; wishlist: ProductSummary[] };

export const MAX_QUANTITY = 99;
const CART_KEY = "shavdia-cart-v2";
const WISHLIST_KEY = "shavdia-wishlist-v2";
const EMPTY: ShopState = { cart: [], wishlist: [] };

let state = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The shop keeps working for this visit when storage is unavailable.
  }
}

/** Saved data can be stale or edited, so keep only well-formed rows. */
function validCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).filter(
    (row) =>
      row &&
      typeof row.key === "string" &&
      typeof row.name === "string" &&
      typeof row.slug === "string" &&
      Number.isInteger(row.productId) &&
      Number.isInteger(row.price) &&
      Number.isInteger(row.quantity) &&
      row.quantity >= 1 &&
      row.quantity <= MAX_QUANTITY,
  );
}

function validWishlist(value: unknown): ProductSummary[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).filter(
    (row) =>
      row &&
      Number.isInteger(row.id) &&
      typeof row.name === "string" &&
      typeof row.slug === "string" &&
      Number.isInteger(row.price) &&
      Array.isArray(row.sizes) &&
      Array.isArray(row.colors),
  );
}

function getSnapshot() {
  if (!loaded) {
    loaded = true;
    state = { cart: validCart(read(CART_KEY)), wishlist: validWishlist(read(WISHLIST_KEY)) };
  }
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setCart(cart: CartItem[]) {
  state = { ...getSnapshot(), cart };
  write(CART_KEY, cart);
  emit();
}

/** Renders as empty on the server and on first paint, then with the saved data. */
export function useShopStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

/** Returns false when the item is already at the maximum quantity. */
export function addToCart(product: ProductSummary, size: string, color: string) {
  const { cart } = getSnapshot();
  const key = `${product.id}::${size}::${color}`;
  const existing = cart.find((item) => item.key === key);
  if (existing && existing.quantity >= MAX_QUANTITY) return false;
  setCart(
    existing
      ? cart.map((item) => (item === existing ? { ...item, quantity: item.quantity + 1 } : item))
      : [
          ...cart,
          {
            key,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.image,
            price: currentPrice(product),
            size,
            color,
            quantity: 1,
          },
        ],
  );
  return true;
}

export function changeQuantity(key: string, change: 1 | -1) {
  const { cart } = getSnapshot();
  setCart(
    cart.flatMap((item) => {
      if (item.key !== key) return [item];
      const quantity = Math.min(MAX_QUANTITY, item.quantity + change);
      return quantity < 1 ? [] : [{ ...item, quantity }];
    }),
  );
}

export function removeFromCart(key: string) {
  setCart(getSnapshot().cart.filter((item) => item.key !== key));
}

export function clearCart() {
  setCart([]);
}

/** Applies what the server found at checkout: new prices and lines that can no longer be bought. */
export function applyCheckoutChanges(repriced: { key: string; price: number }[], removed: string[]) {
  setCart(
    getSnapshot().cart.flatMap((item) => {
      if (removed.includes(item.key)) return [];
      const change = repriced.find((row) => row.key === item.key);
      return [change ? { ...item, price: change.price } : item];
    }),
  );
}

/** Returns true when the product is now saved. */
export function toggleWishlist(product: ProductSummary) {
  const current = getSnapshot();
  const saved = !current.wishlist.some((item) => item.id === product.id);
  const wishlist = saved ? [...current.wishlist, product] : current.wishlist.filter((item) => item.id !== product.id);
  state = { ...current, wishlist };
  write(WISHLIST_KEY, wishlist);
  emit();
  return saved;
}

export function cartTotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

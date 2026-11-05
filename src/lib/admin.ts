import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/** Checks the session in pages and actions. proxy.ts is only the first gate. */
export async function requireAdmin() {
  const store = await cookies();
  if (!(await verifySessionToken(store.get(SESSION_COOKIE)?.value))) redirect("/admin/login");
}

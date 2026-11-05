import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { ORDER_STATUSES, orderStatusLabel } from "@/lib/orders";
import { money } from "@/lib/product";

export const metadata = { title: "შეკვეთები" };
// Waits for the session check before responding.
export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminOrders({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const status = ORDER_STATUSES.some((option) => option.value === params.status) ? String(params.status) : undefined;
  const orders = await db.order.findMany({
    where: status ? { status } : {},
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <div className="admin-title">
        <h1>შეკვეთები ({orders.length})</h1>
      </div>
      <div className="admin-card admin-checks">
        <Link href="/admin/orders" className={`admin-chip${status ? "" : " is-active"}`}>
          ყველა
        </Link>
        {ORDER_STATUSES.map((option) => (
          <Link key={option.value} href={`/admin/orders?status=${option.value}`} className={`admin-chip${status === option.value ? " is-active" : ""}`}>
            {option.label}
          </Link>
        ))}
      </div>
      <div className="admin-card admin-table-wrap">
        {orders.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ნომერი</th>
                <th>თარიღი</th>
                <th>მომხმარებელი</th>
                <th>ტელეფონი</th>
                <th>ჯამი</th>
                <th>სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`}>#{order.id}</Link>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{order.createdAt.toLocaleString("ka-GE", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tbilisi" })}</td>
                  <td>
                    {order.firstName} {order.lastName}
                  </td>
                  <td>{order.phone}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{money(order.total)}</td>
                  <td>
                    <span className={`admin-tag${order.status === "new" ? " admin-tag-draft" : ""}`}>{orderStatusLabel(order.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>შეკვეთები ჯერ არ არის.</p>
        )}
      </div>
    </>
  );
}

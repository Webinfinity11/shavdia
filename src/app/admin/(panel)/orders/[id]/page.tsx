import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/orders";
import { money } from "@/lib/product";
import { updateOrderStatus } from "../../../actions";

export const metadata = { title: "შეკვეთა" };
// Waits for the session check before responding.
export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminOrder({ params, searchParams }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const saved = (await searchParams).saved === "1";
  const order = await db.order.findUnique({ where: { id }, include: { items: { orderBy: { id: "asc" } } } });
  if (!order) notFound();

  const customer = [
    ["სახელი, გვარი", `${order.firstName} ${order.lastName}`],
    ["ტელეფონი", order.phone],
    ["პირადი ნომერი", order.personalId],
    ["ელფოსტა", order.email],
    ["ქალაქი", order.city],
    ["მისამართი", order.address],
  ];

  return (
    <>
      <Link href="/admin/orders">← შეკვეთები</Link>
      <div className="admin-title" style={{ marginTop: 8 }}>
        <h1>შეკვეთა #{order.id}</h1>
        <span>{order.createdAt.toLocaleString("ka-GE", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tbilisi" })}</span>
      </div>
      {saved ? <p className="admin-note admin-note-ok">სტატუსი შეიცვალა.</p> : null}

      <form className="admin-card admin-checks" action={updateOrderStatus}>
        <input type="hidden" name="id" value={order.id} />
        <select className="admin-input" style={{ width: "auto" }} name="status" defaultValue={order.status} aria-label="სტატუსი">
          {ORDER_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="admin-btn" type="submit">
          სტატუსის შენახვა
        </button>
      </form>

      <section className="admin-card">
        <h2>მომხმარებელი</h2>
        <dl className="admin-details">
          {customer.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="admin-card admin-table-wrap">
        <h2>პროდუქტები</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ფოტო</th>
              <th>სახელი</th>
              <th>ფერი / ზომა</th>
              <th>ფასი</th>
              <th>რაოდენობა</th>
              <th>ჯამი</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.image ? <Image className="admin-thumb" src={item.image} alt="" width={1000} height={1333} sizes="48px" /> : null}</td>
                <td>{item.productId ? <Link href={`/admin/products/${item.productId}`}>{item.name}</Link> : item.name}</td>
                <td>{[item.color, item.size].filter(Boolean).join(" / ") || "არ არის"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{money(item.price)}</td>
                <td>{item.quantity}</td>
                <td style={{ whiteSpace: "nowrap" }}>{money(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="admin-order-total">ჯამი: {money(order.total)}</p>
      </section>
    </>
  );
}

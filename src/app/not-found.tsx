import Link from "next/link";
import { caps } from "@/lib/text";

export default function NotFound() {
  return (
    <main className="empty-page">
      <h1>გვერდი ვერ მოიძებნა</h1>
      <p>ეს გვერდი არ არსებობს ან წაშლილია.</p>
      <Link href="/" className="button">
        {caps("მთავარი გვერდი")}
      </Link>
    </main>
  );
}

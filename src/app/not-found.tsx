import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-page">
      <h1>გვერდი ვერ მოიძებნა</h1>
      <p>ეს გვერდი არ არსებობს ან წაშლილია.</p>
      <Link href="/" className="button">
        მთავარი გვერდი
      </Link>
    </main>
  );
}

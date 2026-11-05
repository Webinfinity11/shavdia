"use client";

import { useRouter } from "next/navigation";
import { SORTS, toSearch, type ShopQuery } from "@/lib/shop-query";

export function SortSelect({ query }: { query: ShopQuery }) {
  const router = useRouter();
  return (
    <label className="sort-select">
      <span className="sr-only">დალაგება</span>
      <select
        value={query.sort}
        onChange={(event) => router.push(toSearch({ ...query, sort: event.target.value as ShopQuery["sort"], page: 1 }))}
      >
        {SORTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

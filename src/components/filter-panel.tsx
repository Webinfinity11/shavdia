"use client";

import { useState } from "react";
import { Icon } from "./icon";

/** On phones the filters collapse behind a button. On larger screens they are always visible. */
export function FilterPanel({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={`shop-filters${open ? " is-open" : ""}`} aria-label="ფილტრები">
      <button className="filter-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        ფილტრები{activeCount ? ` (${activeCount})` : ""}
        <Icon name={open ? "close" : "plus"} />
      </button>
      <div className="filter-groups">{children}</div>
    </aside>
  );
}

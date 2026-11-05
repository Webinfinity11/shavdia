import Image from "next/image";
import Link from "next/link";
import type { HomeTile } from "@/lib/site-content";
import { Icon } from "./icon";

export function CategoryTiles({ tiles }: { tiles: HomeTile[] }) {
  return (
    <section className="category-tiles" aria-label="კოლექციები">
      {tiles.slice(0, 2).map((tile, index) => (
        <Link key={index} href={tile.link} className="category-tile">
          <Image src={tile.image} alt={tile.label} width={1600} height={1000} sizes="(max-width: 600px) 60vw, 900px" />
          <span className="category-label">
            {tile.label} <Icon name="right" />
          </span>
        </Link>
      ))}
    </section>
  );
}

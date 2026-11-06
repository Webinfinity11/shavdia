import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import { DESIGN_TILE_IMAGES, type HomeTile } from "@/lib/site-content";
import { Icon } from "./icon";

const DESIGN_CROPS = ["tile-overshirts", "tile-trousers"];

export function CategoryTiles({ tiles }: { tiles: HomeTile[] }) {
  return (
    <section className="category-tiles" aria-label="კოლექციები">
      {tiles.slice(0, 2).map((tile, index) => (
        <Link key={index} href={tile.link} className={`category-tile${tile.image === DESIGN_TILE_IMAGES[index] ? ` ${DESIGN_CROPS[index]}` : ""}`}>
          <Image src={tile.image} alt={tile.label} width={1086} height={1448} sizes="100vw" />
          <span className="category-label">
            {caps(tile.label)} <Icon name="right" />
          </span>
        </Link>
      ))}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryRef, ProductSummary } from "@/lib/product";
import { caps } from "@/lib/text";
import { Icon } from "./icon";
import { ProductCard } from "./product-card";

type CarouselStatus = { canPrev: boolean; canNext: boolean; current: number; ratio: number };

function readStatus(track: HTMLElement): CarouselStatus {
  const left = Math.max(0, track.scrollLeft);
  const max = Math.max(0, track.scrollWidth - track.clientWidth);
  const trackLeft = track.getBoundingClientRect().left;
  let current = 0;
  let distance = Infinity;
  Array.from(track.children).forEach((card, index) => {
    const difference = Math.abs(card.getBoundingClientRect().left - trackLeft);
    if (difference < distance) {
      current = index;
      distance = difference;
    }
  });
  return { canPrev: left > 2, canNext: left < max - 2, current, ratio: max > 0 ? Math.min(1, left / max) : 0 };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

type Props = { title: string; products: ProductSummary[]; tabs: CategoryRef[] };

export function Collection({ title, products: allProducts, tabs }: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<CarouselStatus>({ canPrev: false, canNext: true, current: 0, ratio: 0 });
  const products = filter ? allProducts.filter((product) => product.categories.some((c) => c.slug === filter)) : allProducts;
  const total = products.length;

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    element.scrollLeft = 0;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setStatus(readStatus(element));
      });
    };
    schedule();
    element.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [filter]);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let startX = 0;
    let startLeft = 0;
    let pointer: number | null = null;
    let dragged = false;

    const down = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startLeft = element.scrollLeft;
      dragged = false;
    };
    const moveDrag = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      const delta = event.clientX - startX;
      if (!dragged && Math.abs(delta) < 6) return;
      if (!dragged) {
        dragged = true;
        element.setPointerCapture(event.pointerId);
        element.classList.add("is-dragging");
      }
      element.scrollLeft = startLeft - delta;
    };
    const up = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      pointer = null;
      if (!dragged) return;
      const left = element.scrollLeft;
      // Keep snap off until the smooth settle onto the nearest card finishes.
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        element.classList.remove("is-dragging");
        element.removeEventListener("scrollend", settle);
      };
      element.addEventListener("scrollend", settle);
      window.setTimeout(settle, 600);
      const trackLeft = element.getBoundingClientRect().left;
      const padding = parseFloat(getComputedStyle(element).scrollPaddingInlineStart) || 0;
      let target = left;
      let distance = Infinity;
      for (const card of Array.from(element.children)) {
        const offset = card.getBoundingClientRect().left - trackLeft - padding;
        if (Math.abs(offset) < distance) {
          distance = Math.abs(offset);
          target = left + offset;
        }
      }
      element.scrollTo({ left: target, behavior: "smooth" });
    };
    const click = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };
    const noNativeDrag = (event: DragEvent) => event.preventDefault();

    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", moveDrag);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("click", click, true);
    element.addEventListener("dragstart", noNativeDrag);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", moveDrag);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("click", click, true);
      element.removeEventListener("dragstart", noNativeDrag);
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const element = track.current;
    const card = element?.firstElementChild;
    if (!element || !card) return;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <section id="collection" className="collection-section" aria-labelledby="collection-title">
      <div className="collection-header">
        <h2 className="section-title" id="collection-title">
          {title}
        </h2>
        <div className="filter-tabs" role="group" aria-label="კოლექციის ფილტრი">
          <button
            className={`filter-pill${filter === null ? " is-active" : ""}`}
            type="button"
            aria-pressed={filter === null}
            onClick={() => setFilter(null)}
          >
            {caps("ყველა")}
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.slug}
              className={`filter-pill${tab.slug === filter ? " is-active" : ""}`}
              type="button"
              aria-pressed={tab.slug === filter}
              onClick={() => setFilter(tab.slug)}
            >
              {caps(tab.name)}
            </button>
          ))}
        </div>
        <div className="carousel-controls">
          <button type="button" aria-label="წინა პროდუქტები" disabled={!status.canPrev} onClick={() => move(-1)}>
            <Icon name="left" />
          </button>
          <button type="button" aria-label="შემდეგი პროდუქტები" disabled={!status.canNext} onClick={() => move(1)}>
            <Icon name="right" />
          </button>
        </div>
      </div>
      <div className="product-carousel">
        <div
          ref={track}
          className="product-track"
          role="list"
          aria-label="პროდუქტები"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              eager={index < 4}
              sizes="(max-width: 600px) 78vw, (max-width: 900px) 44vw, 460px"
            />
          ))}
        </div>
      </div>
      {total > 0 ? (
        <div className="carousel-status" aria-label="კარუსელის პროგრესი">
          <span id="carousel-count">
            {pad(Math.min(status.current + 1, total))} / {pad(total)}
          </span>
          <div className="progress-track" aria-hidden="true">
            <span
              id="carousel-progress"
              style={{ width: `${100 / total}%`, transform: `translateX(${status.ratio * (total - 1) * 100}%)` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

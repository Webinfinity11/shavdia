"use client";

import { useRef } from "react";
import type { ColorOption } from "@/lib/product";

type SizeProps = { sizes: string[]; value: string; onChange: (size: string) => void };

/** Size buttons with arrow-key support. */
export function SizePicker({ sizes, value, onChange }: SizeProps) {
  const group = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = sizes.indexOf(value);
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? sizes.length - 1 : (index + step + sizes.length) % sizes.length;
    onChange(sizes[next]);
    group.current?.querySelectorAll<HTMLElement>("[role=radio]")[next]?.focus();
  };

  return (
    <>
      <p className="size-label">აირჩიე ზომა</p>
      <div ref={group} className="size-options" role="radiogroup" aria-label="აირჩიე ზომა" onKeyDown={onKeyDown}>
        {sizes.map((size) => (
          <button
            key={size}
            className={`size-option${size === value ? " is-selected" : ""}`}
            type="button"
            role="radio"
            aria-checked={size === value}
            tabIndex={size === value ? 0 : -1}
            onClick={() => onChange(size)}
          >
            {size}
          </button>
        ))}
      </div>
    </>
  );
}

type ColorProps = { colors: ColorOption[]; value: string; onChange: (color: string) => void };

export function ColorPicker({ colors, value, onChange }: ColorProps) {
  return (
    <>
      <p className="size-label">
        ფერი{value ? <span className="option-value">: {value}</span> : null}
      </p>
      <div className="color-options" role="radiogroup" aria-label="აირჩიე ფერი">
        {colors.map((color) => (
          <button
            key={color.name}
            className={`product-swatch${color.name === value ? " is-selected" : ""}`}
            type="button"
            role="radio"
            aria-checked={color.name === value}
            aria-label={color.name}
            title={color.name}
            style={{ backgroundColor: color.hex }}
            onClick={() => onChange(color.name)}
          />
        ))}
      </div>
    </>
  );
}

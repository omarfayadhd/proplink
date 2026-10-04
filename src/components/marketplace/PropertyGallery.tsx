"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface GalleryImage {
  url: string;
  alt: string;
}

/**
 * Main image + thumbnail strip for `/marketplace/[id]` (Task 2.5 brief:
 * "gallery ... keyboard accessible"). Thumbnails are real `<button>`
 * elements, not `<div onClick>` — native buttons are focusable and already
 * fire `onClick` on Enter/Space, so no extra key handling is needed for
 * keyboard users; `aria-selected` marks the one currently shown as the main
 * image for assistive tech, matching the `role="tab"` selection-widget
 * semantics (not `aria-pressed`, which `role="tab"` doesn't support).
 * Plain `<img>`, not `next/image`: no other component in this codebase uses
 * it either (checked first — S3/mock-storage URLs and arbitrary agent-hosted
 * URLs aren't in any configured image domain list), same
 * `eslint-disable-next-line @next/next/no-img-element` convention as
 * `ModerationQueue.tsx`/`ImageUploader.tsx`.
 */
export function PropertyGallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-line bg-surface text-sm text-muted">
        No photos uploaded yet
      </div>
    );
  }

  const active = images[activeIndex] ?? images[0];

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={active.url}
        alt={active.alt}
        data-testid="gallery-main-image"
        // Capped, not just proportional: at the page's full width a 16/9 hero
        // is ~650px tall and pushes the price, the key facts and every action
        // below the fold — the photo is the invitation, not the page.
        className="aspect-[16/9] max-h-[28rem] w-full rounded-xl border border-line bg-surface object-cover"
      />
      {images.length > 1 && (
        <div
          className="mt-3 flex gap-2 overflow-x-auto"
          role="tablist"
          aria-label="Photos"
        >
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-16 w-24 flex-none overflow-hidden rounded-md border-2",
                i === activeIndex ? "border-accent" : "border-line",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

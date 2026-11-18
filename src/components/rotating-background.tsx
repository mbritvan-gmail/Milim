"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LOGIN_PHOTOS } from "@/lib/login-photos";

// Full-screen crossfading photo background with a dark overlay so text stays readable.
// Photos load one step ahead instead of all at once, and the rotation pauses for people
// who prefer reduced motion.
export function RotatingBackground({ intervalMs = 7000, creditClass = "bottom-3", fade = true, showCredit = true }: { intervalMs?: number; creditClass?: string; fade?: boolean; showCredit?: boolean }) {
  const photos = LOGIN_PHOTOS;
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(() => new Set([0, 1]));

  useEffect(() => {
    if (photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setActive((a) => {
        const next = (a + 1) % photos.length;
        // Start loading the photo after the one we're fading to.
        setLoaded((prev) => new Set(prev).add(next).add((next + 1) % photos.length));
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [photos.length, intervalMs]);

  const current = photos[active];

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-background">
        {/* Soft glow, visible when there are no photos yet or while they load. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(122,168,255,0.18),transparent_60%)]" />
        {photos.map((photo, i) =>
          loaded.has(i) ? (
            <Image
              key={photo.src}
              src={photo.src}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              className={`object-cover transition-opacity duration-[1500ms] ${i === active ? "opacity-100" : "opacity-0"}`}
            />
          ) : null,
        )}
        {fade && <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/55 to-background/90" />}
      </div>
      {showCredit && current && (
        <p className={`absolute ${creditClass} left-4 right-4 z-10 text-center text-[11px] ${fade ? "text-muted" : ""}`}>
          <a
            href={current.creditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 ${fade ? "" : "rounded-md bg-black/40 px-2 py-0.5 text-white backdrop-blur-sm"}`}
          >
            {current.credit}
          </a>
        </p>
      )}
    </>
  );
}

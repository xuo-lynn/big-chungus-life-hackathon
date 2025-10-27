"use client";

import { useEffect, useRef, useState } from "react";
import type { MarkerData } from "@/src/components/MapView";
import { ArrowLeft, ArrowRight, MapPin, Star, Heart, Check } from "lucide-react";

type Props = {
  items: MarkerData[];
  onFocus?: (item: MarkerData) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (item: MarkerData) => void;
};

type Detail = {
  image_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  website?: string | null;
};

const categoryColor = (cat?: string) => {
  switch ((cat || "").toLowerCase()) {
    case "restaurant":
    case "lunch":
      return "#ffd1dc"; // pink tint
    case "dessert":
      return "#ffe8a3"; // soft yellow
    case "tourist attraction":
    case "sightseeing":
      return "#d6f2ff"; // light blue
    default:
      return "#f0f0f0"; // neutral
  }
};

export default function PlacesCarousel({ items, onFocus, selectedIds, onToggleSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});

  // Drag state for mouse/pointer swiping
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const isAdjustingRef = useRef(false); // unused now; kept for safety
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Helper to measure one card step including gap
  const measureStep = () => {
    const el = scrollerRef.current;
    if (!el || el.children.length < 2) return 300; // fallback
    const a = (el.children[0] as HTMLElement).getBoundingClientRect();
    const b = (el.children[1] as HTMLElement).getBoundingClientRect();
    return b.left - a.left;
  };

  useEffect(() => {
    const ids = items.map((i) => i.id).filter(Boolean);
    if (!ids.length) return;
    (async () => {
      try {
        const res = await fetch("/api/retrieve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setDetails(data.details || {});
      } catch {
        /* ignore */
      }
    })();
  }, [items]);

  // No infinite centering; start at default position
  useEffect(() => {
    // intentionally empty
  }, [items.length]);

  // Pointer-based drag to scroll (mouse/touch) with momentum
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const step = measureStep();
      const absY = Math.abs(e.deltaY);
      const absX = Math.abs(e.deltaX);
      if (absY >= absX) {
        // Vertical wheel: translate to horizontal slide
        e.preventDefault();
        el.scrollBy({ left: (e.deltaY > 0 ? 1 : -1) * step, behavior: "smooth" });
      } else {
        // Horizontal trackpad gesture
        e.preventDefault();
        el.scrollBy({ left: e.deltaX, behavior: "smooth" });
      }
    };

    // wheel handler is registered below with other listeners and cleaned up in the same return

    const onDown = (e: PointerEvent) => {
      draggingRef.current = true;
      startXRef.current = e.clientX;
      startScrollLeftRef.current = el.scrollLeft;
      lastXRef.current = e.clientX;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      el.scrollLeft = startScrollLeftRef.current - dx;

      const now = performance.now();
      const dt = now - lastTimeRef.current || 16;
      const vx = (e.clientX - lastXRef.current) / dt;
      velocityRef.current = vx;
      lastXRef.current = e.clientX;
      lastTimeRef.current = now;
    };

    const startMomentum = () => {
      const friction = 0.92;
      let v = velocityRef.current;
      let last = performance.now();
      const stepSize = measureStep();

      const tick = (now: number) => {
        const dt = now - last;
        last = now;
        v *= friction;
        el.scrollLeft -= v * dt;

        if (Math.abs(v) < 0.02) {
          const target = Math.round(el.scrollLeft / stepSize) * stepSize;
          el.scrollTo({ left: target, behavior: "smooth" });
          rafRef.current = null;
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const onUp = (e: PointerEvent) => {
      draggingRef.current = false;
      el.style.cursor = "grab";
      el.style.userSelect = "";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      startMomentum();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
      el.removeEventListener("wheel", onWheel as EventListener);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const scrollByCards = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = measureStep();
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  };

  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-500">No suggestions yet.</p>;
  }

  const renderItems = items;

  return (
    <div className="relative w-full">
      {/* Controls */}
      <div className="absolute -top-8 right-2 flex gap-2 z-10">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByCards("left")}
          className="rounded-full bg-white/80 hover:bg-white shadow p-2 border"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByCards("right")}
          className="rounded-full bg-white/80 hover:bg-white shadow p-2 border"
        >
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Scroller */}
      <div
        ref={scrollerRef}
        style={{ scrollSnapType: "x proximity" }}
        className="flex overflow-x-auto gap-6 py-2 w-full px-1 cursor-grab"
      >
        {renderItems.map((p) => {
          const d = details[p.id] || {};
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
          const staticFallback =
            token && p.lng != null && p.lat != null
              ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+555(${p.lng},${p.lat})/${p.lng},${p.lat},15,0/600x400?access_token=${token}`
              : undefined;
          const imgSrc = d.image_url || staticFallback;
          const isSelected = selectedIds?.has(p.id);

          return (
            <article
               key={p.id}
               style={{ scrollSnapAlign: "center", borderColor: "#f5c6ff" }}
               className="relative shrink-0 w-72 rounded-3xl border bg-white overflow-hidden shadow-md hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
               onDragStart={(e) => e.preventDefault()}
               onClick={() => { if (!draggingRef.current) { onToggleSelect?.(p); onFocus?.(p); } }}
            >
              <button
                type="button"
                aria-label={isSelected ? "Deselect" : "Select"}
                onClick={(e) => { e.stopPropagation(); onToggleSelect?.(p); }}
                className={`absolute top-2 right-2 rounded-full p-1 border shadow ${isSelected ? "bg-green-500" : "bg-white/80 hover:bg-white"}`}
              >
                <Check size={16} color={isSelected ? "#fff" : "#16a34a"} />
              </button>
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={p.name}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  style={{
                    background: `linear-gradient(135deg, ${categoryColor(
                      p.category
                    )}, #ffffff)`,
                  }}
                />
              ) : (
                <div
                  className="h-40 relative"
                  style={{
                    background: `linear-gradient(135deg, ${categoryColor(
                      p.category
                    )}, #ffffff)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-60">
                    <MapPin size={48} color="#6b7280" />
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: "#f5e6ff", color: "#6b46c1" }}
                >
                  {p.category || "place"}
                </span>

                <h3 className="text-base font-semibold text-gray-800 leading-snug">
                  {p.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {p.place_name || "Location unknown"}
                </p>

                {d.rating != null ? (
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <Star size={16} className="text-yellow-500" />
                    <span>
                      {d.rating.toFixed(1)} ({d.review_count ?? "–"})
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between mt-2 items-center">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      p.name + " " + (p.place_name || "")
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Open in Maps
                  </a>
                  <span className="text-xs text-gray-400">
                    {p.lng?.toFixed(3)}, {p.lat?.toFixed(3)}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
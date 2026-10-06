"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AnnouncementData } from "@/types";

interface SlideshowProps {
  announcements?: AnnouncementData[];
  hotelSlug?: string;
}

export default function AnnouncementSlideshow({
  announcements: initialAnnouncements,
  hotelSlug = "hotel-annapoorna",
}: SlideshowProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>(
    initialAnnouncements || []
  );
  const [isPaused, setIsPaused] = useState(false);

  // If initial announcements were not passed, fetch them client-side
  useEffect(() => {
    if (initialAnnouncements && initialAnnouncements.length > 0) {
      setAnnouncements(initialAnnouncements);
      return;
    }

    async function loadAnnouncements() {
      try {
        const res = await fetch(`/api/announcements?hotel=${encodeURIComponent(hotelSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.announcements && Array.isArray(data.announcements)) {
            setAnnouncements(data.announcements);
          }
        }
      } catch (err) {
        console.error("Failed to load announcements:", err);
      }
    }

    loadAnnouncements();
  }, [hotelSlug, initialAnnouncements]);

  // Active items
  const activeItems = useMemo(() => {
    return (announcements || []).filter((a) => a.isActive);
  }, [announcements]);

  if (activeItems.length === 0) {
    return null;
  }

  // Calculate dynamic duration based on total text length for comfortable reading speed
  const totalLength = activeItems.reduce((acc, curr) => acc + (curr.text?.length || 0), 0);
  const durationSeconds = Math.max(25, Math.min(60, Math.round(totalLength * 0.28)));

  // Duplicate items twice to guarantee smooth infinite seamless looping
  const marqueeItems = [...activeItems, ...activeItems];

  return (
    <section
      aria-label="Running Announcements Ticker"
      className="w-full px-4 sm:px-6 lg:px-8 pt-3 pb-1"
    >
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0E2B20] via-[#153C2D] to-[#0A2118] border border-[#C9A227]/35 shadow-md flex items-center h-11 sm:h-12 text-white select-none transition-all"
      >
        {/* Subtle left & right soft fade edges for smooth entrance & exit */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0E2B20] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0A2118] to-transparent z-10 pointer-events-none" />

        {/* 100% Full-Width Infinite Running Marquee Track */}
        <div className="relative w-full overflow-hidden h-full flex items-center">
          <div
            data-paused={isPaused ? "true" : "false"}
            className="animate-marquee flex items-center whitespace-nowrap cursor-grab active:cursor-grabbing"
            style={{
              animationDuration: `${durationSeconds}s`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {marqueeItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 shrink-0 group"
              >
                {/* Badge Tag if available */}
                {item.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-[#C9A227] text-black shadow-2xs shrink-0">
                    {item.badge}
                  </span>
                )}

                {/* Running Text with full Emojis */}
                <span className="text-xs sm:text-sm font-semibold tracking-tight text-stone-100 group-hover:text-[#C9A227] transition-colors">
                  {item.text}
                </span>

                {/* Sparkling Separator between announcements */}
                <span className="text-[#C9A227]/70 text-xs sm:text-sm font-black pl-3 sm:pl-4 select-none">
                  ✦
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

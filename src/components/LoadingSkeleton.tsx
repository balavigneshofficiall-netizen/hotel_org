import React from "react";

export function MenuSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-stone-200" />
          <div className="w-40 h-5 rounded-md bg-stone-200" />
        </div>
        <div className="w-24 h-8 rounded-xl bg-stone-200" />
      </div>

      {/* Search bar */}
      <div className="w-full h-12 rounded-2xl bg-stone-200" />

      {/* Category tabs */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-24 h-9 rounded-xl bg-stone-200 shrink-0" />
        ))}
      </div>

      {/* Food Cards Grid: 2 on mobile, 3 on tablet, 5 on laptop/desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="bg-white rounded-3xl p-3 border border-stone-200 space-y-2.5">
            <div className="w-full aspect-[16/11] rounded-2xl bg-stone-200" />
            <div className="w-3/4 h-3.5 rounded-md bg-stone-200" />
            <div className="w-1/2 h-3 rounded-md bg-stone-200" />
            <div className="flex items-center justify-between pt-1">
              <div className="w-12 h-4 rounded-md bg-stone-200" />
              <div className="w-12 h-6 rounded-xl bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
      <div className="w-48 h-6 rounded-md bg-stone-200 mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 h-72 rounded-3xl bg-stone-200" />
        <div className="md:col-span-5 h-72 rounded-3xl bg-stone-200" />
      </div>
    </div>
  );
}

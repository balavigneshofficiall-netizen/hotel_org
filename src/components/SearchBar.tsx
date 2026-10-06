"use client";

import React from "react";
import { Search, X } from "lucide-react";

export type DietFilter = "ALL" | "VEG" | "NON_VEG";

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  dietFilter: DietFilter;
  setDietFilter: (filter: DietFilter) => void;
}

export default function SearchBar({
  query,
  setQuery,
  dietFilter,
  setDietFilter,
}: SearchBarProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes (Biriyani, Dosa, Paneer, Tandoori)..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E5E2D9] rounded-2xl text-xs sm:text-sm text-[#171717] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] shadow-2xs transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Veg & Non-Veg Filter Segmented Group */}
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {/* All Button */}
          <button
            type="button"
            onClick={() => setDietFilter("ALL")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              dietFilter === "ALL"
                ? "bg-[#12372A] text-white shadow-xs border border-[#C9A227]/30"
                : "bg-white text-stone-600 border border-[#E5E2D9] hover:bg-stone-50"
            }`}
          >
            <span>All</span>
          </button>

          {/* Veg Button */}
          <button
            type="button"
            onClick={() => setDietFilter(dietFilter === "VEG" ? "ALL" : "VEG")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              dietFilter === "VEG"
                ? "bg-emerald-800 text-white shadow-xs border border-emerald-700"
                : "bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50/60"
            }`}
            title="Filter Vegetarian dishes"
          >
            <div
              className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center p-0.5 shrink-0 ${
                dietFilter === "VEG"
                  ? "border-white bg-emerald-900"
                  : "border-emerald-600 bg-white"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  dietFilter === "VEG" ? "bg-white" : "bg-emerald-600"
                }`}
              />
            </div>
            <span>Pure Veg</span>
          </button>

          {/* Non-Veg Button */}
          <button
            type="button"
            onClick={() => setDietFilter(dietFilter === "NON_VEG" ? "ALL" : "NON_VEG")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              dietFilter === "NON_VEG"
                ? "bg-red-800 text-white shadow-xs border border-red-700"
                : "bg-white text-red-800 border border-red-300 hover:bg-red-50/60"
            }`}
            title="Filter Non-Vegetarian dishes"
          >
            <div
              className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center p-0.5 shrink-0 ${
                dietFilter === "NON_VEG"
                  ? "border-white bg-red-900"
                  : "border-red-600 bg-white"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  dietFilter === "NON_VEG" ? "bg-white" : "bg-red-600"
                }`}
              />
            </div>
            <span>Non-Veg</span>
          </button>
        </div>
      </div>
    </div>
  );
}

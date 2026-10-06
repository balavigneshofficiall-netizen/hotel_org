"use client";

import React, { useRef, useEffect } from "react";
import { CategoryData } from "@/types";
import {
  Sparkles,
  UtensilsCrossed,
  Flame,
  Soup,
  Wheat,
  IceCream,
  Coffee,
  GlassWater,
  Fish,
  Salad,
  Pizza,
  Tag,
} from "lucide-react";

interface CategoryTabsProps {
  categories: CategoryData[];
  selectedCategory: string | number;
  onSelectCategory: (categoryId: string | number) => void;
}

export default function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getCategoryIcon = (slug: string, iconName?: string | null) => {
    switch (iconName) {
      case "Flame":
        return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      case "Sparkles":
        return <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />;
      case "Soup":
        return <Soup className="w-3.5 h-3.5 text-rose-500" />;
      case "Wheat":
        return <Wheat className="w-3.5 h-3.5 text-amber-600" />;
      case "IceCream":
        return <IceCream className="w-3.5 h-3.5 text-pink-500" />;
      case "UtensilsCrossed":
        return <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />;
      case "Coffee":
        return <Coffee className="w-3.5 h-3.5 text-stone-600" />;
      case "GlassWater":
        return <GlassWater className="w-3.5 h-3.5 text-cyan-500" />;
      case "Fish":
        return <Fish className="w-3.5 h-3.5 text-blue-500" />;
      case "Salad":
        return <Salad className="w-3.5 h-3.5 text-lime-600" />;
      case "Pizza":
        return <Pizza className="w-3.5 h-3.5 text-amber-500" />;
      case "Tag":
        return <Tag className="w-3.5 h-3.5 text-indigo-500" />;
    }

    switch (slug) {
      case "popular":
        return <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />;
      case "starters":
        return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      case "biriyani":
        return <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />;
      case "curries":
        return <Soup className="w-3.5 h-3.5 text-red-500" />;
      case "breads":
        return <Wheat className="w-3.5 h-3.5 text-yellow-600" />;
      case "desserts":
        return <IceCream className="w-3.5 h-3.5 text-pink-500" />;
      default:
        return <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  // Center selected pill automatically when changed
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector(
        `[data-category-id="${selectedCategory}"]`
      ) as HTMLElement;
      if (activeEl) {
        const container = containerRef.current;
        const scrollLeft =
          activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [selectedCategory]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
      >
        {/* All Dishes Tab */}
        <button
          data-category-id="all"
          onClick={() => onSelectCategory("all")}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition-all duration-200 cursor-pointer select-none ${
            selectedCategory === "all"
              ? "bg-gradient-to-r from-[#12372A] to-[#1E4D3C] text-white shadow-xs border border-[#C9A227]/40 ring-1 ring-[#C9A227]/30"
              : "bg-white text-stone-700 border border-[#E5E2D9] hover:bg-stone-50 shadow-2xs hover:border-stone-300"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${selectedCategory === "all" ? "text-[#E2B755]" : "text-[#C9A227]"}`} />
          <span>All Dishes</span>
        </button>

        {/* Categories list */}
        {categories.map((cat) => {
          const isSelected = String(selectedCategory) === String(cat.id);
          const dishCount = cat.products?.length ?? 0;

          return (
            <button
              key={cat.id}
              data-category-id={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-black transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? "bg-gradient-to-r from-[#12372A] to-[#1E4D3C] text-white shadow-xs border border-[#C9A227]/40 ring-1 ring-[#C9A227]/30"
                  : "bg-white text-stone-700 border border-[#E5E2D9] hover:bg-stone-50 shadow-2xs hover:border-stone-300"
              }`}
            >
              {getCategoryIcon(cat.slug, cat.icon)}
              <span>{cat.name}</span>
              {dishCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                    isSelected
                      ? "bg-white/20 text-[#E2B755]"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {dishCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

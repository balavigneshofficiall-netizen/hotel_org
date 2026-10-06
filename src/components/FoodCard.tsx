"use client";

import React from "react";
import Image from "next/image";
import { ProductData } from "@/types";
import { Star, Plus, Minus } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface FoodCardProps {
  product: ProductData;
  currency?: string;
  onOpenDetails: (product: ProductData) => void;
}

export default function FoodCard({
  product,
  currency = "₹",
  onOpenDetails,
}: FoodCardProps) {
  const { getItemQuantity, addItem, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity - 1);
  };

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="group relative bg-white rounded-3xl p-3 sm:p-3.5 border border-[#E5E2D9] shadow-2xs hover:shadow-xl hover:border-[#12372A]/25 transition-all duration-300 flex flex-col justify-between cursor-pointer active:scale-[0.99]"
    >
      <div>
        {/* Food Image Container */}
        <div className="relative w-full aspect-[16/11] rounded-2xl overflow-hidden bg-stone-100 mb-2.5 shadow-inner">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Veg / Non-Veg emblem */}
          <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-xs p-1 rounded-lg shadow-sm border border-black/5">
            <div
              className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center p-0.5 ${
                product.isVeg ? "border-emerald-600 bg-white" : "border-red-600 bg-white"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  product.isVeg ? "bg-emerald-600" : "bg-red-600"
                }`}
              />
            </div>
          </div>

          {/* Star Rating Badge */}
          {product.rating > 0 && (
            <div className="absolute top-2 right-2 z-10 bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-black text-white shadow-sm border border-white/10">
              <Star className="w-2.5 h-2.5 text-[#E2B755] fill-[#E2B755]" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Chef's Pick Gold Badge */}
          {product.isPopular && (
            <div className="absolute bottom-2 left-2 z-10 bg-gradient-to-r from-[#C9A227] to-[#E2B755] text-stone-950 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
              Chef&apos;s Pick
            </div>
          )}

          {/* Prep time chip */}
          {product.prepTimeMinutes > 0 && (
            <div className="absolute bottom-2 right-2 z-10 bg-black/55 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
              ⏱️ {product.prepTimeMinutes}m
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="font-black text-[#171717] text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-[#12372A] transition-colors tracking-tight">
          {product.name}
        </h3>
        <p className="text-[11px] text-[#6B7280] line-clamp-2 mt-1 leading-relaxed min-h-[2rem]">
          {product.description}
        </p>
      </div>

      {/* Bottom Pricing & Add / Counter Button */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E5E2D9]/70">
        <div className="flex items-baseline gap-1">
          <span className="text-sm sm:text-base font-black text-[#12372A]">
            {currency}
            {product.price}
          </span>
          {product.originalPrice && (
            <span className="text-[10px] sm:text-xs text-stone-400 line-through">
              {currency}
              {product.originalPrice}
            </span>
          )}
        </div>

        {/* Add button or Counter */}
        {quantity === 0 ? (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] active:scale-95 text-white text-xs font-black shadow-xs border border-[#C9A227]/30 transition-all cursor-pointer"
            aria-label={`Add ${product.name} to order`}
          >
            <Plus className="w-3.5 h-3.5 text-[#E2B755]" />
            <span>Add</span>
          </button>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#12372A] to-[#1A4535] text-white rounded-xl px-2 py-1 shadow-xs border border-[#C9A227]/30"
          >
            <button
              onClick={handleDecrement}
              className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/20 active:scale-90 transition cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3 text-white" />
            </button>
            <span className="text-xs font-black w-4 text-center text-[#E2B755]">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/20 active:scale-90 transition cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

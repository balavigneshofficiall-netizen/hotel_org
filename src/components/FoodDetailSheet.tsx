"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ProductData } from "@/types";
import { X, Star, Clock, Plus, Minus, CheckCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface FoodDetailSheetProps {
  product: ProductData | null;
  currency?: string;
  onClose: () => void;
}

export default function FoodDetailSheet({
  product,
  currency = "₹",
  onClose,
}: FoodDetailSheetProps) {
  const { addItem, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [addedAnimation, setAddedAnimation] = useState(false);

  useEffect(() => {
    if (product) {
      const existingQty = getItemQuantity(product.id);
      setQuantity(existingQty > 0 ? existingQty : 1);
      setInstructions("");
      setAddedAnimation(false);
    }
  }, [product]);

  if (!product) return null;

  const handleAddToCart = () => {
    addItem(product, quantity, instructions.trim() || undefined);
    setAddedAnimation(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const totalPrice = product.price * quantity;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Modal / Bottom Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-md max-h-[92vh] bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grab handle for mobile */}
          <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/70 rounded-full z-20 pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md"
            aria-label="Close sheet"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto no-scrollbar pb-24">
            {/* Food Image */}
            <div className="relative w-full aspect-[16/10] bg-stone-100">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 450px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                <div className="flex items-center gap-2">
                  <span className="bg-white/90 p-1 rounded-md">
                    <span
                      className={`block w-2.5 h-2.5 rounded-full ${
                        product.isVeg ? "bg-emerald-600" : "bg-red-600"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md">
                    {product.isVeg ? "Pure Veg" : "Non-Veg"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>{product.prepTimeMinutes} mins prep</span>
                </div>
              </div>
            </div>

            {/* Dish Header Info */}
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-[#171717]">
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-xl text-xs font-bold text-amber-900 shrink-0">
                    <Star className="w-3.5 h-3.5 text-[#C9A227] fill-[#C9A227]" />
                    <span>{product.rating.toFixed(1)}</span>
                    <span className="text-[10px] text-amber-700/70 font-normal">
                      ({product.reviewsCount})
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-[#12372A]">
                    {currency}
                    {product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-[#6B7280] line-through">
                      {currency}
                      {product.originalPrice}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed text-[#6B7280]">
                {product.description}
              </p>

              {/* Ingredients */}
              {product.ingredients && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-xs font-bold text-[#171717]">
                    Ingredients
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {product.ingredients.split(",").map((ing, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF9F6] text-[#6B7280] border border-black/5"
                      >
                        {ing.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Instructions Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-[#171717] flex items-center justify-between">
                  <span>Special requests for kitchen</span>
                  <span className="text-[10px] text-[#6B7280] font-normal">
                    Optional
                  </span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Less spicy, less oil, no onion..."
                  rows={2}
                  maxLength={150}
                  className="w-full p-3 text-xs bg-[#FAF9F6] border border-black/8 rounded-xl text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition resize-none"
                />
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-3 border-t border-black/5">
                <span className="text-xs font-bold text-[#171717]">Quantity</span>
                <div className="flex items-center gap-3 bg-[#FAF9F6] border border-black/8 rounded-2xl p-1 shadow-2xs">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-[#171717] disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 active:scale-95 transition"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-[#171717]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-[#171717] hover:bg-black/5 active:scale-95 transition"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-black/5 shadow-lg">
            <button
              onClick={handleAddToCart}
              className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm shadow-md flex items-center justify-between transition-all duration-200 active:scale-[0.98] ${
                addedAnimation
                  ? "bg-emerald-600 text-white"
                  : "bg-[#12372A] hover:bg-[#0e2b21] text-white"
              }`}
            >
              {addedAnimation ? (
                <div className="flex items-center justify-center gap-2 w-full">
                  <CheckCircle className="w-5 h-5 text-white animate-bounce" />
                  <span>Added to Order!</span>
                </div>
              ) : (
                <>
                  <span className="text-white/80 font-normal text-xs">
                    {quantity} {quantity === 1 ? "item" : "items"}
                  </span>
                  <span>Add to Cart</span>
                  <span className="font-extrabold">
                    {currency}
                    {totalPrice}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

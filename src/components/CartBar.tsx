"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CartBarProps {
  currency?: string;
}

export default function CartBar({ currency = "₹" }: CartBarProps) {
  const { totalItems, subtotal, tableToken, hotelSlug } = useCart();

  if (totalItems === 0) return null;

  const cartHref = tableToken
    ? `/cart?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(tableToken)}`
    : "/cart";

  return (
    <AnimatePresence>
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pointer-events-none md:bottom-6 md:right-8 md:left-auto md:w-96 md:px-0">
        <div className="w-full max-w-md mx-auto pointer-events-auto">
          <Link
            href={cartHref}
            className="block w-full"
            aria-label="View your cart and review order"
          >
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-[#0E2B20] via-[#12372A] to-[#0A2118] text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border-2 border-[#C9A227]/40 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
                  <ShoppingBag className="w-5 h-5 text-[#E2B755]" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C9A227] text-stone-950 text-[11px] font-black flex items-center justify-center shadow-xs">
                    {totalItems}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-[11px] text-stone-300 font-medium">
                    {totalItems} {totalItems === 1 ? "dish selected" : "dishes selected"}
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    {currency}
                    {subtotal.toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-[#C9A227] hover:bg-[#d6ad2e] px-4 py-2 rounded-xl text-xs font-black text-stone-950 transition shadow-xs">
                <span>Review Order</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </AnimatePresence>
  );
}

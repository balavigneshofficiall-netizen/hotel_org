"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, ArrowRight, Check, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface TableSwitchModalProps {
  isOpen: boolean;
  fromTable: string;
  toTable: string;
  itemCount: number;
  hasActiveOrder?: boolean;
  activeOrderNumber?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TableSwitchModal({
  isOpen,
  fromTable,
  toTable,
  itemCount,
  hasActiveOrder = false,
  activeOrderNumber,
  onConfirm,
  onCancel,
}: TableSwitchModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-5"
        >
          {hasActiveOrder ? (
            /* CASE 1: UNBILLED LIVE ORDER CONFLICT (Cannot place orders across multiple tables simultaneously) */
            <>
              <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shadow-xs">
                <ShieldAlert className="w-7 h-7 text-amber-700" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-black text-[#171717]">
                  Active Order at {fromTable}
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  You currently have an active dining order at <strong className="text-[#12372A]">{fromTable}</strong>. Please complete and settle your bill at {fromTable} before ordering at a new table.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {activeOrderNumber ? (
                  <Link
                    href={`/orders/${activeOrderNumber}`}
                    className="w-full py-3 px-4 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <span>View {fromTable} Order</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#171717] font-bold text-xs transition cursor-pointer"
                >
                  Stay at {fromTable}
                </button>
              </div>
            </>
          ) : (
            /* CASE 2: DRAFT CART MOVE CONFIRMATION (User has items in cart and moved to new table) */
            <>
              <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-50 text-[#12372A] flex items-center justify-center border border-emerald-200 shadow-xs">
                <Utensils className="w-7 h-7 text-[#12372A]" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-black text-[#171717]">
                  Switch to {toTable}?
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  You added <strong className="text-[#171717]">{itemCount} {itemCount === 1 ? "dish" : "dishes"}</strong> to your cart from <strong className="text-[#12372A]">{fromTable}</strong>.
                </p>
                <div className="p-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] flex items-center justify-center gap-2 text-xs font-bold text-[#171717]">
                  <span className="px-2 py-0.5 rounded-lg bg-stone-200 text-stone-700">{fromTable}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span className="px-2 py-0.5 rounded-lg bg-[#12372A] text-white">{toTable}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="w-full py-3 px-4 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#C9A227]" />
                  <span>Yes, Move Cart to {toTable}</span>
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-98 text-[#6B7280] hover:text-[#171717] font-bold text-xs transition cursor-pointer"
                >
                  No, Keep {fromTable}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

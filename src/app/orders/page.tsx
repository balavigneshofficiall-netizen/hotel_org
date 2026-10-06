"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Utensils, History, ArrowRight } from "lucide-react";

export default function OrdersIndexPage() {
  const router = useRouter();
  const { activeOrderNumber, customerPhone } = useCart();

  useEffect(() => {
    const savedOrder =
      activeOrderNumber ||
      (typeof window !== "undefined"
        ? localStorage.getItem("annapoorna_active_order")
        : null);

    if (savedOrder) {
      router.replace(`/orders/${savedOrder}`);
    } else if (customerPhone) {
      // If customer has phone, check if they have an ongoing active dining order
      fetch(`/api/customer/active-order?phone=${encodeURIComponent(customerPhone)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.hasActiveOrder && data.activeOrder?.orderNumber) {
            router.replace(`/orders/${data.activeOrder.orderNumber}`);
          }
        })
        .catch(() => {});
    }
  }, [activeOrderNumber, customerPhone, router]);

  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center border border-black/8 shadow-sm space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#12372A] shadow-xs">
          <Utensils className="w-8 h-8 sm:w-10 sm:h-10 text-[#12372A]" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
            No Active Orders
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed max-w-xs mx-auto">
            You don&apos;t have any ongoing orders at your table right now. Ready to enjoy our delicious food?
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/menu"
            className="w-full py-3.5 px-6 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <Utensils className="w-4 h-4 text-[#C9A227]" />
            <span>Explore Menu & Order</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {customerPhone ? (
            <Link
              href="/history"
              className="w-full py-3 px-6 rounded-2xl bg-white hover:bg-stone-50 border border-black/10 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98"
            >
              <History className="w-3.5 h-3.5" />
              <span>View Past Order History</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full py-3 px-6 rounded-2xl bg-white hover:bg-stone-50 border border-black/10 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98"
            >
              <span>Login to View History</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

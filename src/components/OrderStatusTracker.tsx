"use client";

import React from "react";
import { OrderData, OrderStatus } from "@/types";
import {
  Check,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

interface OrderStatusTrackerProps {
  order: OrderData;
  isLiveConnected: boolean;
  isBillRequested?: boolean;
  isSessionActive?: boolean;
  isOrderFullyServed?: boolean;
  onRequestCompleteBill?: () => void;
}

const STEPS: {
  key: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    key: "CHECKING",
    title: "Checking Order",
    desc: "Restaurant staff is checking dish availability in the kitchen",
    icon: Clock,
  },
  {
    key: "CONFIRMED",
    title: "Order Confirmed",
    desc: "Order confirmed! Dishes are being cooked fresh",
    icon: Check,
  },
  {
    key: "SERVED",
    title: "Served at Table",
    desc: "Hot dishes delivered to your table. Enjoy your meal!",
    icon: Sparkles,
  },
  {
    key: "COMPLETED",
    title: "Completed",
    desc: "Thank you for dining with us!",
    icon: CheckCircle2,
  },
];

export default function OrderStatusTracker({
  order,
  isLiveConnected,
  isBillRequested = false,
  isSessionActive = true,
  isOrderFullyServed = true,
  onRequestCompleteBill,
}: OrderStatusTrackerProps) {
  const { tableToken, hotelSlug } = useCart();
  const currentStatus = order.status;

  const currentTableToken = order.table?.qrCodeToken || tableToken;
  const menuHref = currentTableToken
    ? `/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(currentTableToken)}`
    : "/menu";

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 0; // Checking Order
      case OrderStatus.ACCEPTED:
      case OrderStatus.PREPARING:
      case OrderStatus.READY:
        return 1; // Order Confirmed
      case OrderStatus.SERVED:
        return 2; // Served at Table
      case OrderStatus.COMPLETED:
        return 3; // Completed
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isCancelled = currentStatus === OrderStatus.CANCELLED;

  const latestNotification =
    order.notifications?.[0]?.body ||
    order.statusHistory?.slice().reverse().find((h) => h.status === OrderStatus.CANCELLED)?.note ||
    order.statusHistory?.slice().reverse().find((h) => h.note)?.note;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/8 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <div className="flex items-center gap-3">
          {order.hotel?.logoUrl ? (
            <div className="w-10 h-10 rounded-2xl bg-white border border-black/10 shadow-2xs flex items-center justify-center p-1 overflow-hidden shrink-0">
              <img
                src={order.hotel.logoUrl}
                alt={order.hotel?.name || "Hotel Logo"}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          ) : order.hotel?.name ? (
            <div className="w-10 h-10 rounded-2xl bg-white border border-black/10 shadow-2xs flex items-center justify-center font-serif font-black text-sm text-[#12372A] shrink-0">
              {order.hotel.name.charAt(0)}
            </div>
          ) : null}
          <div>
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              Live Order Status
            </span>
            <h3 className="text-lg font-black text-[#171717] mt-0.5">
              Order #{order.orderNumber}
            </h3>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs font-extrabold text-[#12372A] bg-stone-100 border border-black/10 px-3 py-1 rounded-full">
            {order.table?.tableNumber || "Table 08"}
          </span>
        </div>
      </div>

      {isCancelled ? (
        <div className="p-5 bg-red-50/80 border-2 border-red-200 rounded-3xl space-y-3 text-red-900 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 shrink-0 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-red-950">
                Dish Unavailable / Order Notice
              </h4>
              <p className="text-xs text-red-800 leading-relaxed font-medium">
                {latestNotification ||
                  "One or more dishes in your order are currently unavailable. Please check with your floor staff or select other items from the menu."}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-red-200/60 flex items-center justify-between">
            <span className="text-[11px] text-red-700 font-semibold">
              Floor staff notified for your table
            </span>
            <Link
              href="/menu"
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Order Other Items
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Partial unavailability notice for active order */}
          {latestNotification &&
            (latestNotification.toLowerCase().includes("unavailable") ||
              latestNotification.toLowerCase().includes("out of stock")) && (
              <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl space-y-1.5 text-amber-950 animate-in fade-in duration-300">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                      <span>Dish Update · Order Confirmed</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-black">
                        Cooking Fresh
                      </span>
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      {latestNotification}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Stepper progression */}
          <div className="space-y-4 relative">
            {STEPS.map((step, idx) => {
              const isCompleted = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const Icon = step.icon;

              return (
                <div key={step.key} className="relative flex items-start gap-4 group">
                {/* Connecting vertical line */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 w-0.5 -bottom-2 transition-colors duration-500 ${
                      isCompleted ? "bg-[#12372A]" : "bg-stone-200"
                    }`}
                  />
                )}

                {/* Circle Icon Badge */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isCurrent
                      ? "bg-[#12372A] text-white ring-4 ring-[#12372A]/20 shadow-md scale-105"
                      : isCompleted
                      ? "bg-[#12372A] text-white"
                      : "bg-stone-100 text-[#6B7280] border border-stone-200"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-emerald-300" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}

                  {/* Pulsing beacon for active state */}
                  {isCurrent && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A227] opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C9A227]" />
                    </span>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-bold leading-none ${
                        isCurrent
                          ? "text-[#12372A] text-sm"
                          : isCompleted
                          ? "text-[#171717]"
                          : "text-[#6B7280]"
                      }`}
                    >
                      {step.title}
                    </h4>

                    {isCurrent && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#C9A227] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Now
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      isCurrent
                        ? "text-[#171717] font-medium"
                        : "text-[#6B7280]"
                    }`}
                  >
                    {step.desc}
                  </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action shortcuts */}
      <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-3">
        {!isSessionActive ? (
          /* Session is closed / settled -> Only show View Paid Bill / Receipt, hide One More Order */
          <Link
            href={`/bill/${order.id}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-black text-center transition shadow-sm flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4 text-[#C9A227]" />
            <span>Bill Settled · View Paid Receipt</span>
          </Link>
        ) : isBillRequested ? (
          /* Bill requested -> Proceed to counter, hide One More Order */
          <>
            <Link
              href={`/bill/${order.id}`}
              className="flex-1 py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#171717] text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5 text-[#12372A]" />
              <span>View Bill</span>
            </Link>
            <div className="flex-1 py-3 px-4 rounded-2xl bg-[#12372A] text-white text-xs font-extrabold text-center border border-emerald-600/40 shadow-xs flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Proceed to Counter</span>
            </div>
          </>
        ) : (
          /* Active dining session -> One More Order vs Complete Bill */
          <>
            <Link
              href={menuHref}
              className="flex-1 py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#171717] text-xs font-bold text-center transition border border-stone-200 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>One More Order</span>
            </Link>

            <button
              type="button"
              onClick={onRequestCompleteBill}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-black text-center transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Receipt className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Complete Bill</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

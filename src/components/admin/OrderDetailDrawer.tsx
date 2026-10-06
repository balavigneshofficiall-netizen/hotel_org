"use client";

import React from "react";
import { OrderStatus } from "@/types";
import {
  X,
  Check,
  Clock,
  Phone,
  User,
  CheckCircle2,
  ChefHat,
  Utensils,
  Sparkles,
  Receipt,
  AlertCircle,
  ArrowRight,
  Printer,
  Bike,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import OrderSourceBadge from "@/components/orders/OrderSourceBadge";

interface OrderDetailDrawerProps {
  order: any | null;
  onClose: () => void;
  onAdvanceStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  onOpenSettleModal?: (order: any) => void;
  onOpenUnavailableModal?: (order: any, preselectedItem?: string) => void;
  onToggleItemServed?: (orderId: string | number, itemId: string | number, currentServed: boolean) => Promise<void>;
  loading?: boolean;
}

const STATUS_PROGRESSION: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.SERVED,
  OrderStatus.COMPLETED,
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Received",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  ACCEPTED: <CheckCircle2 className="w-3.5 h-3.5" />,
  PREPARING: <ChefHat className="w-3.5 h-3.5" />,
  READY: <Sparkles className="w-3.5 h-3.5" />,
  SERVED: <Utensils className="w-3.5 h-3.5" />,
  COMPLETED: <Receipt className="w-3.5 h-3.5" />,
  CANCELLED: <AlertCircle className="w-3.5 h-3.5" />,
};

export default function OrderDetailDrawer({
  order,
  onClose,
  onAdvanceStatus,
  onOpenSettleModal,
  onOpenUnavailableModal,
  onToggleItemServed,
  loading = false,
}: OrderDetailDrawerProps) {
  if (!order) return null;

  let rawIndex = STATUS_PROGRESSION.indexOf(order.status as OrderStatus);
  if (rawIndex === -1 && ["PREPARING", "READY"].includes(order.status)) {
    rawIndex = 1; // Map PREPARING & READY to ACCEPTED step
  }
  const currentIndex = rawIndex;
  const nextStatus =
    currentIndex > -1 && currentIndex < STATUS_PROGRESSION.length - 1
      ? STATUS_PROGRESSION[currentIndex + 1]
      : null;

  const currency = "₹";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-[#E5E2D9] animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-[#FAF9F6] border-b border-[#E5E2D9] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <OrderSourceBadge
                source={order.orderSource}
                externalOrderId={order.externalOrderId}
                tableNumber={order.table?.tableNumber}
                riderName={order.riderName}
                riderPhone={order.riderPhone}
                riderStatus={order.riderStatus}
                otp={order.otp}
                compact
              />
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full ${order.status === OrderStatus.SERVED
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
                    : order.status === OrderStatus.CANCELLED
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-[#12372A] text-white"
                  }`}
              >
                {order.status === OrderStatus.SERVED
                  ? "Served ✨"
                  : STATUS_LABELS[order.status as OrderStatus] || order.status}
              </span>
            </div>
            <h2 className="text-xl font-black text-[#171717] mt-1">
              Order #{order.orderNumber}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E5E2D9] flex items-center justify-center text-[#6B7280] hover:bg-stone-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Customer Information Profile Card */}
          <div className="bg-gradient-to-r from-[#FAF9F5] via-[#F4F1EA] to-[#FAF9F5] rounded-2xl p-4 border border-[#EAE6DF] shadow-2xs space-y-3 relative overflow-hidden">
            {/* Header title */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0D382B]" />
                Customer Profile
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8F8F0] text-[#0D382B] border border-[#10B981]/20">
                {order.table?.tableNumber || (order.tableNumber ? `Table ${order.tableNumber}` : "Dine-In")}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* Left: Avatar + Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0D382B] text-[#D4AF37] font-black text-sm flex items-center justify-center shadow-xs border border-[#C9A227]/30 shrink-0">
                  {order.customerName ? order.customerName.charAt(0).toUpperCase() : "G"}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#0F172A] leading-tight">
                    {order.customerName || "Guest Diner"}
                  </h4>
                  <span className="text-[11px] text-stone-400 font-medium">Hotel Guest</span>
                </div>
              </div>

              {/* Right: Phone pill */}
              {order.customerPhone && (
                <a
                  href={`tel:${order.customerPhone}`}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E0DCD3] hover:border-emerald-500/50 hover:bg-emerald-50/50 text-[#0D382B] transition flex items-center gap-2 text-xs font-bold shadow-2xs group"
                  title="Call customer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#10B981] group-hover:scale-110 transition-transform" />
                  <span>{order.customerPhone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Delivery Partner Section (Swiggy / Zomato) */}
          {(order.orderSource === "SWIGGY" || order.orderSource === "ZOMATO" || order.riderName) && (
            <div className="bg-gradient-to-r from-orange-50/50 to-amber-50/50 rounded-2xl p-4 border border-orange-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-950 flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-orange-600" />
                  Assigned Delivery Partner ({order.orderSource || "Online"})
                </span>
                {order.otp && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white text-orange-900 border border-orange-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-orange-600" />
                    Pickup OTP: {order.otp}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div className="text-sm font-black text-stone-900">
                    {order.riderName || "Delivery Partner on the way"}
                  </div>
                  <div className="text-xs text-orange-700 font-medium">
                    Status: <span className="font-bold">{order.riderStatus || "ARRIVED"}</span>
                  </div>
                </div>
                {order.riderPhone && (
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="px-3 py-1.5 rounded-xl bg-white border border-orange-200 hover:bg-orange-100/50 text-orange-900 transition flex items-center gap-2 text-xs font-bold shadow-2xs"
                    title="Call Delivery Partner"
                  >
                    <Phone className="w-3.5 h-3.5 text-orange-600" />
                    <span>Call Rider</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Ordered Dishes List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
              Items Ordered ({order.items.length})
            </h4>

            <div className="divide-y divide-black/5 border border-[#E5E2D9] rounded-2xl overflow-hidden bg-white">
              {order.items.map((item: any) => {
                const isItemCancelled =
                  item.isCancelled === true || order.status === OrderStatus.CANCELLED;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-start justify-between gap-3 text-xs transition ${item.isCancelled && order.status !== OrderStatus.CANCELLED
                        ? "bg-red-50/90 border border-red-200 rounded-xl my-1"
                        : isItemCancelled
                          ? "bg-stone-50/90 opacity-75"
                          : ""
                      }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${isItemCancelled
                              ? "bg-red-600"
                              : item.isVeg
                                ? "bg-emerald-600"
                                : "bg-red-600"
                            }`}
                        />
                        <span
                          className={`font-bold ${isItemCancelled ? "line-through text-red-950" : "text-[#171717]"
                            }`}
                        >
                          {item.quantity} × {item.productName}
                        </span>

                        {item.isCancelled && order.status !== OrderStatus.CANCELLED && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-2xs">
                            Dismissed / Out of Stock (Not Billed · {currency}0)
                          </span>
                        )}
                      </div>

                      {item.specialInstructions && (
                        <p className="text-[11px] text-[#C9A227] italic pl-4">
                          &ldquo;{item.specialInstructions}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-bold ${isItemCancelled ? "line-through text-[#6B7280]" : "text-[#12372A]"
                            }`}
                        >
                          {currency}
                          {isItemCancelled ? "0.00" : item.subtotal.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#6B7280] block">
                          @{currency}
                          {item.unitPrice}
                        </span>
                      </div>

                      {/* Item Served Toggle */}
                      {!item.isCancelled && onToggleItemServed && order.status !== OrderStatus.CANCELLED && (
                        <button
                          type="button"
                          onClick={() => onToggleItemServed(order.id, item.id, Boolean(item.isServed))}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${item.isServed
                              ? "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700"
                              : "bg-stone-100 hover:bg-emerald-50 text-[#12372A] border border-stone-200 hover:border-emerald-300"
                            }`}
                          title={item.isServed ? "Click to unmark served" : `Click to mark ${item.productName} as Served`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{item.isServed ? "Served ✨" : "Serve"}</span>
                        </button>
                      )}

                      {!item.isCancelled &&
                        order.status === OrderStatus.PENDING &&
                        onOpenUnavailableModal && (
                          <button
                            type="button"
                            onClick={() => onOpenUnavailableModal(order, item.productName)}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold transition flex items-center gap-1"
                            title="Dismiss this dish as out of stock"
                          >
                            <span>Out of Stock</span>
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kitchen special note */}
          {order.specialInstructions && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/60 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-amber-900 block">
                Order Note / Customer Request:
              </span>
              <p className="text-xs text-amber-800 italic">
                &ldquo;{order.specialInstructions}&rdquo;
              </p>
            </div>
          )}

          {/* Pretty Order Status Flow Card */}
          <div className="bg-[#0F172A] rounded-2xl p-4 text-white shadow-md relative overflow-hidden space-y-3">
            {/* Ambient accent glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Order Live Progression</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                {order.status === OrderStatus.CANCELLED
                  ? "Cancelled"
                  : `${Math.min(currentIndex + 1, STATUS_PROGRESSION.length)} of ${STATUS_PROGRESSION.length} Steps`}
              </span>
            </div>

            {order.status === OrderStatus.CANCELLED ? (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>This order is cancelled and closed.</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 relative z-10 pt-1">
                {STATUS_PROGRESSION.map((st, idx) => {
                  const isPassed = currentIndex > idx;
                  const isCurrent =
                    currentIndex === idx ||
                    (st === OrderStatus.ACCEPTED && ["PREPARING", "READY"].includes(order.status));

                  return (
                    <div
                      key={st}
                      className={`py-2.5 px-1.5 rounded-xl text-center transition-all duration-200 flex flex-col items-center gap-1.5 select-none ${isCurrent
                          ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-extrabold shadow-lg shadow-emerald-950/50 scale-[1.03] ring-2 ring-emerald-300/40"
                          : isPassed
                            ? "bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30"
                            : "bg-white/5 text-slate-400 font-medium border border-white/10"
                        }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isCurrent
                            ? "bg-white text-emerald-800 font-black shadow-xs"
                            : isPassed
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/10 text-slate-400"
                          }`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : STATUS_ICONS[st]}
                      </div>
                      <span className="text-[10px] leading-tight block truncate w-full text-center">
                        {STATUS_LABELS[st]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Banner if attached to session */}
          {order.session && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center justify-between">
              <span>Session: {order.session.sessionCode}</span>
              <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Table Grouped</span>
            </div>
          )}

          {/* Cancellation Notice */}
          {order.status === OrderStatus.CANCELLED && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>This order is cancelled — Not included in bill (₹0.00).</span>
            </div>
          )}

          {/* Bill Summary */}
          <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#E5E2D9] space-y-2 text-xs">
            <div className="flex justify-between text-[#6B7280]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#171717]">
                {currency}
                {order.status === OrderStatus.CANCELLED ? "0.00" : order.subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-[#6B7280]">
              <span>GST ({order.taxRate}%)</span>
              <span className="font-semibold text-[#171717]">
                {currency}
                {order.status === OrderStatus.CANCELLED ? "0.00" : order.taxAmount.toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E5E2D9] flex justify-between text-sm font-extrabold text-[#12372A]">
              <span>Grand Total</span>
              {order.status === OrderStatus.CANCELLED ? (
                <span className="text-red-700">
                  {currency}0.00 <span className="text-xs text-[#6B7280] font-normal">(Cancelled)</span>
                </span>
              ) : (
                <span>
                  {currency}
                  {order.totalAmount.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-white border-t border-[#E5E2D9] flex flex-wrap items-center gap-2.5">
          <Link
            href={`/bill/${order.id}`}
            target="_blank"
            className="p-3 rounded-xl border border-[#E5E2D9] text-[#171717] hover:bg-stone-50 flex items-center gap-2 text-xs font-bold transition"
          >
            <Printer className="w-4 h-4 text-[#12372A]" />
            <span>Print Bill</span>
          </Link>

          {order.status === OrderStatus.PENDING && (
            <>
              <button
                onClick={() =>
                  onAdvanceStatus(
                    order.id,
                    OrderStatus.ACCEPTED
                  )
                }
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
                <span>Confirm Order</span>
              </button>

              <button
                onClick={() =>
                  onAdvanceStatus(
                    order.id,
                    OrderStatus.CANCELLED
                  )
                }
                disabled={loading}
                className="py-3 px-3 rounded-xl bg-white hover:bg-red-50 border border-red-300 text-red-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Unavailable</span>
              </button>
            </>
          )}

          {["ACCEPTED", "PREPARING", "READY"].includes(order.status) && (
            <button
              onClick={() => onAdvanceStatus(order.id, OrderStatus.SERVED)}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-98 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Mark as Served</span>
            </button>
          )}

          {order.status === OrderStatus.SERVED && (
            <button
              onClick={() => {
                if (onOpenSettleModal) {
                  onOpenSettleModal(order);
                } else {
                  onAdvanceStatus(order.id, OrderStatus.COMPLETED);
                }
              }}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
              <span>Complete & Settle Bill</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

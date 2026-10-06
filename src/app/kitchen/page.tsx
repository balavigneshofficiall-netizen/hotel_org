"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { OrderData, OrderStatus } from "@/types";
import {
  ChefHat,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Utensils,
  ArrowRight,
  ExternalLink,
  Users,
} from "lucide-react";
import OrderSourceBadge from "@/components/orders/OrderSourceBadge";

function KitchenContent() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/kitchen?hotel=hotel-annapoorna");
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load kitchen orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string | number, nextStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextAction = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return {
          next: OrderStatus.ACCEPTED,
          label: "Accept Order",
          color: "bg-blue-600 hover:bg-blue-700",
        };
      case OrderStatus.ACCEPTED:
        return {
          next: OrderStatus.PREPARING,
          label: "Start Cooking 🔥",
          color: "bg-amber-600 hover:bg-amber-700",
        };
      case OrderStatus.PREPARING:
        return {
          next: OrderStatus.READY,
          label: "Mark Ready 🍽️",
          color: "bg-purple-600 hover:bg-purple-700",
        };
      case OrderStatus.READY:
        return {
          next: OrderStatus.SERVED,
          label: "Mark Served ✨",
          color: "bg-emerald-600 hover:bg-emerald-700",
        };
      case OrderStatus.SERVED:
        return {
          next: OrderStatus.COMPLETED,
          label: "Settle & Complete ✓",
          color: "bg-[#12372A] hover:bg-[#0e2b21]",
        };
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-black/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#12372A] text-white flex items-center justify-center font-bold shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
              Kitchen Live KOT Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Hotel Annapoorna · Real-time kitchen dispatch & customer sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-2xl bg-white border border-black/8 hover:bg-black/5 text-[#6B7280] transition shadow-2xs"
            title="Refresh orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/menu"
            className="text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl bg-[#12372A] text-white hover:bg-[#0e2b21] shadow-xs"
          >
            Customer Menu View
          </Link>
        </div>
      </div>

      {/* Active Orders Kanban / Card Grid: 1 col on mobile, 2 on tablet, 3 on laptop/desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-20 space-y-2">
            <ChefHat className="w-14 h-14 text-stone-300 mx-auto" />
            <h3 className="font-bold text-base text-[#171717]">No active orders in queue</h3>
            <p className="text-xs text-[#6B7280]">
              Scan a table QR to place a live customer order.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const action = getNextAction(order.status);
            const isCompleted = order.status === OrderStatus.COMPLETED;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 border border-black/8 shadow-sm space-y-4 flex flex-col justify-between relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top order bar */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#171717]">
                          #{order.orderNumber}
                        </span>
                        <OrderSourceBadge
                          source={order.orderSource}
                          externalOrderId={order.externalOrderId}
                          tableNumber={order.table?.tableNumber}
                          riderName={order.riderName}
                          riderPhone={order.riderPhone}
                          riderStatus={order.riderStatus}
                          otp={order.otp}
                        />
                        {order.guestCount && order.guestCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <Users className="w-3 h-3 text-amber-700" />
                            <span>{order.guestCount} {order.guestCount === 1 ? "Guest" : "Guests"}</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="text-xs text-[#6B7280]">
                        {order.customerName} · {order.customerPhone}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] pt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Current Status Pill */}
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        order.status === OrderStatus.PENDING
                          ? "bg-amber-100 text-amber-900 animate-pulse"
                          : order.status === OrderStatus.ACCEPTED
                          ? "bg-blue-100 text-blue-900"
                          : order.status === OrderStatus.PREPARING
                          ? "bg-orange-100 text-orange-900"
                          : order.status === OrderStatus.READY
                          ? "bg-purple-100 text-purple-900"
                          : order.status === OrderStatus.SERVED
                          ? "bg-teal-100 text-teal-900"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Items KOT breakdown */}
                  <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border border-black/5 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.isVeg ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                          <span className="font-bold text-[#171717] truncate">
                            {item.quantity} × {item.productName}
                          </span>
                          {Boolean(item.isServed) && (
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                              ✓ Served
                            </span>
                          )}
                          {item.specialInstructions && (
                            <span className="text-[10px] text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded-md font-semibold truncate shrink-0">
                              {item.specialInstructions}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-[#6B7280] shrink-0">
                          ₹{item.subtotal}
                        </span>
                      </div>
                    ))}

                    {order.specialInstructions && (
                      <div className="pt-2 border-t border-black/5 text-xs text-amber-900 font-medium">
                        Note: &ldquo;{order.specialInstructions}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Action button to progress status */}
                <div className="flex items-center justify-between pt-2 border-t border-black/5 gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    target="_blank"
                    className="text-xs font-semibold text-[#6B7280] hover:text-[#171717] flex items-center gap-1"
                  >
                    <span>Guest View</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  {action && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, action.next)}
                      disabled={updatingId === order.id}
                      className={`px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition ${action.color}`}
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isCompleted && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading Kitchen...</div>}>
      <KitchenContent />
    </Suspense>
  );
}

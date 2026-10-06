"use client";

import React, { useState, useEffect, useCallback } from "react";
import { OrderStatus } from "@/types";
import { ChefHat, Clock, AlertCircle, Check, ArrowRight, RefreshCw } from "lucide-react";
import OrderSourceBadge from "@/components/orders/OrderSourceBadge";

export default function KitchenKDSPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKitchenOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orders?status=ALL");
      const data = await res.json();
      if (res.ok) {
        // Kitchen only cares about NEW, PREPARING, and READY
        const active = (data.orders || []).filter((o: any) =>
          ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
        );
        setOrders(active);
      }
    } catch (err) {
      console.error("Failed to load kitchen orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  // Real-time listener
  useEffect(() => {
    const handleUpdate = () => {
      fetchKitchenOrders();
    };
    window.addEventListener("admin:orderUpdate", handleUpdate);
    return () => window.removeEventListener("admin:orderUpdate", handleUpdate);
  }, [fetchKitchenOrders]);

  const advanceOrder = async (orderId: string, status: OrderStatus) => {
    try {
      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      fetchKitchenOrders();
    } catch (err) {
      console.error("Kitchen status update error:", err);
    }
  };

  const newOrders = orders.filter((o) =>
    ["PENDING", "ACCEPTED"].includes(o.status)
  );
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");

  // Order age color styling
  const getAgeBadge = (dateString: string) => {
    const minutes = Math.round(
      (Date.now() - new Date(dateString).getTime()) / 60000
    );

    if (minutes < 10) {
      return {
        text: `${minutes}m ago (Normal)`,
        className: "bg-emerald-100 text-emerald-900 border-emerald-300",
      };
    }
    if (minutes < 20) {
      return {
        text: `${minutes}m ago (Warning)`,
        className: "bg-amber-100 text-amber-900 border-amber-300",
      };
    }
    return {
      text: `${minutes}m ago (Attention)`,
      className: "bg-red-100 text-red-900 border-red-300 font-extrabold",
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#12372A] text-white flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-[#C9A227]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#171717] tracking-tight">
              Kitchen Display System (KDS)
            </h2>
            <p className="text-xs text-[#6B7280]">
              Large cards for cooks & kitchen tablet displays
            </p>
          </div>
        </div>

        <button
          onClick={fetchKitchenOrders}
          className="p-2.5 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#171717] transition flex items-center gap-2 text-xs font-bold shadow-2xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KDS 3 Column View: NEW | PREPARING | READY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: NEW */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
            <h3 className="font-black text-base text-[#171717] uppercase tracking-wider">
              NEW ({newOrders.length})
            </h3>
          </div>

          <div className="space-y-4">
            {newOrders.map((order) => {
              const age = getAgeBadge(order.createdAt);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 border-2 border-[#E5E2D9] shadow-sm space-y-4 hover:border-[#12372A] transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-black text-[#171717]">
                        #{order.orderNumber}
                      </h4>
                      <div className="mt-1">
                        <OrderSourceBadge
                          source={order.orderSource}
                          externalOrderId={order.externalOrderId}
                          tableNumber={order.table?.tableNumber}
                          riderName={order.riderName}
                          riderPhone={order.riderPhone}
                          riderStatus={order.riderStatus}
                          otp={order.otp}
                        />
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${age.className}`}
                    >
                      {age.text}
                    </span>
                  </div>

                  {/* Dishes list with large typography */}
                  <div className="space-y-2 border-t border-b border-dashed border-stone-200 py-3">
                    {order.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm sm:text-base font-bold text-[#171717]"
                      >
                        <span className="truncate pr-2">
                          {item.productName}
                        </span>
                        <span className="text-xl font-black text-[#12372A]">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Special instruction */}
                  {order.specialInstructions && (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold italic">
                      Note: {order.specialInstructions}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#6B7280]">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <button
                      onClick={() => advanceOrder(order.id, OrderStatus.PREPARING)}
                      className="py-3 px-6 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white font-extrabold text-sm shadow-md transition flex items-center gap-2"
                    >
                      <span>START</span>
                      <ArrowRight className="w-4 h-4 text-[#C9A227]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: PREPARING */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-blue-500">
            <h3 className="font-black text-base text-[#171717] uppercase tracking-wider">
              PREPARING ({preparingOrders.length})
            </h3>
          </div>

          <div className="space-y-4">
            {preparingOrders.map((order) => {
              const age = getAgeBadge(order.createdAt);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 border-2 border-amber-200 shadow-sm space-y-4 hover:border-amber-400 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-black text-[#171717]">
                        #{order.orderNumber}
                      </h4>
                      <div className="mt-1">
                        <OrderSourceBadge
                          source={order.orderSource}
                          externalOrderId={order.externalOrderId}
                          tableNumber={order.table?.tableNumber}
                          riderName={order.riderName}
                          riderPhone={order.riderPhone}
                          riderStatus={order.riderStatus}
                          otp={order.otp}
                        />
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${age.className}`}
                    >
                      {age.text}
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-b border-dashed border-stone-200 py-3">
                    {order.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm sm:text-base font-bold text-[#171717]"
                      >
                        <span className="truncate pr-2">
                          {item.productName}
                        </span>
                        <span className="text-xl font-black text-[#12372A]">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.specialInstructions && (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold italic">
                      Note: {order.specialInstructions}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#6B7280]">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <button
                      onClick={() => advanceOrder(order.id, OrderStatus.READY)}
                      className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-md transition flex items-center gap-2"
                    >
                      <span>READY</span>
                      <Check className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: READY */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
            <h3 className="font-black text-base text-[#171717] uppercase tracking-wider">
              READY ({readyOrders.length})
            </h3>
          </div>

          <div className="space-y-4">
            {readyOrders.map((order) => {
              const age = getAgeBadge(order.createdAt);

              return (
                <div
                  key={order.id}
                  className="bg-emerald-50/50 rounded-3xl p-5 border-2 border-emerald-300 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-black text-[#171717]">
                        #{order.orderNumber}
                      </h4>
                      <div className="mt-1">
                        <OrderSourceBadge
                          source={order.orderSource}
                          externalOrderId={order.externalOrderId}
                          tableNumber={order.table?.tableNumber}
                          riderName={order.riderName}
                          riderPhone={order.riderPhone}
                          riderStatus={order.riderStatus}
                          otp={order.otp}
                        />
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${age.className}`}
                    >
                      {age.text}
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-b border-dashed border-emerald-200 py-3">
                    {order.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm sm:text-base font-bold text-[#171717]"
                      >
                        <span className="truncate pr-2">
                          {item.productName}
                        </span>
                        <span className="text-xl font-black text-emerald-800">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#6B7280]">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <button
                      onClick={() => advanceOrder(order.id, OrderStatus.SERVED)}
                      className="py-3 px-6 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white font-extrabold text-sm shadow-md transition flex items-center gap-2"
                    >
                      <span>SERVED</span>
                      <Check className="w-4 h-4 text-[#C9A227]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

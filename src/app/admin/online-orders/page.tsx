"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { OrderStatus } from "@/types";
import {
  Store,
  Bike,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Phone,
  Printer,
  ChevronRight,
  Flame,
  Check,
  X,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  PackageCheck,
  User,
  ShoppingBag,
  Minus,
  Plus,
  Copy,
} from "lucide-react";
import OrderSourceBadge from "@/components/orders/OrderSourceBadge";

interface OnlineOrder {
  id: number;
  orderNumber: string;
  externalOrderId: string | null;
  orderSource: "SWIGGY" | "ZOMATO";
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  specialInstructions: string | null;
  riderName: string | null;
  riderPhone: string | null;
  riderStatus: string | null;
  otp: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    isVeg: boolean;
    specialInstructions?: string | null;
    isCancelled?: boolean;
  }>;
}

interface ItemAdjustment {
  id: number;
  productName: string;
  originalQty: number;
  availableQty: number;
  unitPrice: number;
  isVeg: boolean;
}

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [channelFilter, setChannelFilter] = useState<"ALL" | "SWIGGY" | "ZOMATO">("ALL");
  const [activeTab, setActiveTab] = useState<"INCOMING" | "PREPARING" | "READY" | "COMPLETED">("INCOMING");
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  
  // Per-order OTP inputs & errors (fixes shared state across multiple cards)
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<number, boolean>>({});
  const [copiedOtpId, setCopiedOtpId] = useState<number | null>(null);

  // Sudden Out of Stock & Partial Quantity Modal states
  const [outOfStockOrder, setOutOfStockOrder] = useState<OnlineOrder | null>(null);
  const [itemAdjustments, setItemAdjustments] = useState<ItemAdjustment[]>([]);
  const [autoTurnOffMenu, setAutoTurnOffMenu] = useState(true);
  const [customRejectionReason, setCustomRejectionReason] = useState("");
  const [isProcessingOutOfStock, setIsProcessingOutOfStock] = useState(false);

  const prevPendingCount = useRef(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // AudioContext not allowed without interaction
    }
  }, [soundEnabled]);

  // Fetch only SWIGGY and ZOMATO orders
  const fetchOnlineOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orders?channel=ONLINE&status=ALL");
      const data = await res.json();
      if (res.ok) {
        const fetchedOrders: OnlineOrder[] = data.orders || [];
        setOrders(fetchedOrders);

        // Sound alert if new pending order arrived
        const pendingCount = fetchedOrders.filter((o) => o.status === OrderStatus.PENDING).length;
        if (pendingCount > prevPendingCount.current) {
          playChime();
        }
        prevPendingCount.current = pendingCount;
      }
    } catch (err) {
      console.error("Failed to load online orders:", err);
    } finally {
      setLoading(false);
    }
  }, [playChime]);

  useEffect(() => {
    fetchOnlineOrders();
    const interval = setInterval(fetchOnlineOrders, 6000);
    return () => clearInterval(interval);
  }, [fetchOnlineOrders]);

  // Real-time SSE listener
  useEffect(() => {
    const handleUpdate = () => {
      fetchOnlineOrders();
    };
    window.addEventListener("admin:orderUpdate", handleUpdate);
    return () => window.removeEventListener("admin:orderUpdate", handleUpdate);
  }, [fetchOnlineOrders]);

  // Update order status: Accept, Ready, Dispatch, Reject
  const updateOrderStatus = async (orderId: number, nextStatus: OrderStatus, note?: string) => {
    try {
      setActionLoading(orderId);
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: nextStatus,
          note: note || `Online order updated to ${nextStatus}`,
        }),
      });

      if (res.ok) {
        showToast(`Order status updated to ${nextStatus}!`);
        await fetchOnlineOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Simulate instant order from Swiggy or Zomato
  const handleSimulate = async (platform: "SWIGGY" | "ZOMATO") => {
    try {
      setSimulating(platform);
      const res = await fetch("/api/integrations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, hotelSlug: "hotel-annapoorna" }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        showToast(`⚡ New ${platform} order #${data.order.externalOrderId || data.order.orderNumber} received!`);
        playChime();
        setActiveTab("INCOMING");
        await fetchOnlineOrders();
      }
    } catch (err) {
      console.error("Simulate error:", err);
    } finally {
      setSimulating(null);
    }
  };

  // Handle per-order OTP input change
  const handleOtpInputChange = (orderId: number, val: string) => {
    setOtpInputs((prev) => ({ ...prev, [orderId]: val }));
    if (otpErrors[orderId]) {
      setOtpErrors((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Copy OTP to clipboard
  const handleCopyOtp = (order: OnlineOrder) => {
    if (!order.otp) return;
    navigator.clipboard.writeText(order.otp);
    setCopiedOtpId(order.id);
    showToast(`📋 OTP ${order.otp} copied to clipboard!`);
    setTimeout(() => setCopiedOtpId(null), 2500);
  };

  // Auto-fill OTP into this specific order's input
  const handleAutoFillOtp = (order: OnlineOrder) => {
    if (!order.otp) return;
    setOtpInputs((prev) => ({ ...prev, [order.id]: order.otp || "" }));
    setOtpErrors((prev) => ({ ...prev, [order.id]: false }));
    showToast(`⚡ OTP ${order.otp} auto-filled!`);
  };

  // Verify Handover with OTP
  const handleHandoverWithOtp = (order: OnlineOrder) => {
    const inputVal = (otpInputs[order.id] || "").trim();
    if (order.otp && inputVal !== order.otp.trim()) {
      setOtpErrors((prev) => ({ ...prev, [order.id]: true }));
      return;
    }
    setOtpErrors((prev) => ({ ...prev, [order.id]: false }));
    setOtpInputs((prev) => {
      const next = { ...prev };
      delete next[order.id];
      return next;
    });
    updateOrderStatus(order.id, OrderStatus.COMPLETED, `Handed over to delivery partner ${order.riderName || ""}. OTP verified.`);
  };

  // Open Out of Stock & Partial Adjustment Modal
  const openOutOfStockModal = (order: OnlineOrder) => {
    setOutOfStockOrder(order);
    const activeItems = order.items.filter((it) => !it.isCancelled);
    const adjustments: ItemAdjustment[] = activeItems.map((it) => ({
      id: it.id,
      productName: it.productName,
      originalQty: it.quantity,
      availableQty: it.quantity, // default to all available, staff lowers unavailable items
      unitPrice: it.unitPrice,
      isVeg: it.isVeg,
    }));

    // If order has single item with multiple qty, default availableQty to originalQty - 1 for instant demo
    if (adjustments.length === 1 && adjustments[0].originalQty > 1) {
      adjustments[0].availableQty = adjustments[0].originalQty - 1;
    } else if (adjustments.length === 1 && adjustments[0].originalQty === 1) {
      adjustments[0].availableQty = 0;
    } else if (adjustments.length > 1) {
      // For multi-item, set first item availableQty to 0 as quick starting point
      adjustments[0].availableQty = 0;
    }

    setItemAdjustments(adjustments);
    setAutoTurnOffMenu(true);
    setCustomRejectionReason("");
  };

  // Adjust quantity available in kitchen
  const setItemAvailableQty = (itemId: number, nextQty: number) => {
    setItemAdjustments((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const clamped = Math.max(0, Math.min(it.originalQty, nextQty));
        return { ...it, availableQty: clamped };
      })
    );
  };

  // Accept partial order: Cook remaining dishes, refund unavailable items/quantities
  const handlePartialFulfillment = async () => {
    if (!outOfStockOrder) return;
    try {
      setIsProcessingOutOfStock(true);

      const partiallyUnavailableDishes = itemAdjustments.filter(
        (it) => it.availableQty < it.originalQty
      );

      const unavailablePayload = partiallyUnavailableDishes.map((it) => ({
        id: it.id,
        dismissQty: it.originalQty - it.availableQty,
      }));

      if (unavailablePayload.length === 0) {
        showToast("No items were reduced. Please reduce quantity or choose Keep Order.");
        setIsProcessingOutOfStock(false);
        return;
      }

      // 1. Turn OFF dishes in menu if auto-toggle is checked and kitchen has 0 left
      if (autoTurnOffMenu) {
        for (const item of partiallyUnavailableDishes) {
          if (item.availableQty === 0) {
            try {
              await fetch("/api/admin/menu", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: item.productName,
                  isAvailable: false,
                }),
              });
            } catch (e) {
              console.error("Failed to toggle menu item:", e);
            }
          }
        }
      }

      // 2. Call PATCH /api/admin/orders
      const dismissalSummary = partiallyUnavailableDishes
        .map((it) => `${it.originalQty - it.availableQty}x ${it.productName}`)
        .join(", ");

      const totalDismissedAmount = partiallyUnavailableDishes.reduce(
        (sum, it) => sum + (it.originalQty - it.availableQty) * it.unitPrice,
        0
      );

      const note = customRejectionReason.trim()
        ? customRejectionReason
        : `⚠️ Out of Stock: ${dismissalSummary} unavailable. Refund initiated for customer. Remaining dishes confirmed & cooking fresh!`;

      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: outOfStockOrder.id,
          status: OrderStatus.ACCEPTED,
          unavailableItems: unavailablePayload,
          note,
        }),
      });

      if (res.ok) {
        showToast(
          `✅ Order #${outOfStockOrder.externalOrderId || outOfStockOrder.orderNumber} updated! ${dismissalSummary} removed. Kitchen cooking remaining items.`
        );
        setOutOfStockOrder(null);
        await fetchOnlineOrders();
      } else {
        const errData = await res.json();
        showToast(`Failed: ${errData.error || "Could not update order"}`);
      }
    } catch (err) {
      console.error("Partial fulfillment error:", err);
      showToast("Error updating order");
    } finally {
      setIsProcessingOutOfStock(false);
    }
  };

  // Reject entire order with 100% refund
  const handleRejectEntireOrder = async () => {
    if (!outOfStockOrder) return;
    try {
      setIsProcessingOutOfStock(true);

      const unavailableDishes = itemAdjustments.filter(
        (it) => it.availableQty < it.originalQty
      );

      // Turn OFF dishes in menu if auto-toggle is checked
      if (autoTurnOffMenu && unavailableDishes.length > 0) {
        for (const item of unavailableDishes) {
          try {
            await fetch("/api/admin/menu", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: item.productName,
                isAvailable: false,
              }),
            });
          } catch (e) {
            console.error("Failed to toggle menu item:", e);
          }
        }
      }

      const dishNames = unavailableDishes.length > 0
        ? unavailableDishes.map((it) => it.productName).join(", ")
        : outOfStockOrder.items[0]?.productName || "Dish";

      await updateOrderStatus(
        outOfStockOrder.id,
        OrderStatus.CANCELLED,
        customRejectionReason.trim() || `Out of Stock: ${dishNames} is finished in kitchen. Entire order cancelled with 100% refund.`
      );

      showToast(`Order #${outOfStockOrder.externalOrderId || outOfStockOrder.orderNumber} cancelled. 100% refund sent to customer.`);
      setOutOfStockOrder(null);
    } catch (err) {
      console.error("Reject entire order error:", err);
    } finally {
      setIsProcessingOutOfStock(false);
    }
  };

  // Filter orders by channel and search query
  const filteredOrders = orders.filter((o) => {
    if (channelFilter !== "ALL" && o.orderSource !== channelFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.externalOrderId && o.externalOrderId.toLowerCase().includes(q)) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      (o.riderName && o.riderName.toLowerCase().includes(q))
    );
  });

  // Group into delivery stages
  const incomingOrders = filteredOrders.filter((o) => o.status === OrderStatus.PENDING);
  const preparingOrders = filteredOrders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const readyOrders = filteredOrders.filter((o) => o.status === OrderStatus.READY);
  const completedOrders = filteredOrders.filter((o) => ["COMPLETED", "CANCELLED", "SERVED"].includes(o.status));

  // Print thermal delivery KOT slip
  const handlePrintKOT = (order: OnlineOrder) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Delivery Ticket - #${order.orderNumber}</title>
          <style>
            body { font-family: monospace; font-size: 13px; margin: 15px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
            .otp-box { border: 2px solid #000; padding: 6px; text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">HOTEL ANNAPOORNA</div>
          <div class="center border-bottom">*** ${order.orderSource} DELIVERY TICKET ***</div>
          
          <div class="bold">Ext ID: #${order.externalOrderId || order.orderNumber}</div>
          <div>Internal: #${order.orderNumber}</div>
          <div>Time: ${new Date(order.createdAt).toLocaleTimeString()}</div>
          <div class="border-bottom">Customer: ${order.customerName} (${order.customerPhone})</div>

          <div class="bold" style="margin-bottom: 6px;">ITEMS TO PACK:</div>
          ${order.items
            .filter((it) => !it.isCancelled)
            .map((it) => `
            <div class="item-row">
              <span>${it.quantity}x ${it.productName}</span>
              <span>₹${it.subtotal}</span>
            </div>
            ${it.specialInstructions ? `<div style="font-size: 10px; padding-left: 10px;">Note: ${it.specialInstructions}</div>` : ""}
          `).join("")}

          <div class="border-bottom" style="margin-top: 8px;"></div>
          <div class="item-row bold">
            <span>TOTAL AMOUNT</span>
            <span>₹${order.totalAmount}</span>
          </div>

          <div class="otp-box">
            PICKUP OTP: ${order.otp || "NOT REQUIRED"}
          </div>

          <div style="font-size: 11px;">Rider: ${order.riderName || "Valet Assigned"}</div>
          <div style="font-size: 11px;">Phone: ${order.riderPhone || "-"}</div>
          
          <div class="center" style="margin-top: 15px; font-size: 11px;">
            --- Seal Parcel Bag Before Handover ---
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12372A] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#C9A227]/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Zap className="w-5 h-5 text-[#C9A227]" />
          <span className="text-sm font-black">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-[#FC8019] to-red-600 text-white flex items-center justify-center shadow-md">
            <Bike className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-[#171717] tracking-tight">
                Online Delivery Orders
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                  Swiggy
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                  Zomato
                </span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] font-medium mt-0.5">
              Dedicated delivery dispatch workflow · No dine-in tables, no cash settlement
            </p>
          </div>
        </div>

        {/* Quick Simulator & Sound Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Swiggy Test */}
          <button
            onClick={() => handleSimulate("SWIGGY")}
            disabled={simulating !== null}
            className="py-2.5 px-3.5 rounded-xl bg-[#FC8019] hover:bg-[#e06f14] active:scale-95 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Create a test Swiggy delivery order"
          >
            <Zap className={`w-3.5 h-3.5 ${simulating === "SWIGGY" ? "animate-spin" : ""}`} />
            <span>+ Swiggy Test</span>
          </button>

          {/* Quick Zomato Test */}
          <button
            onClick={() => handleSimulate("ZOMATO")}
            disabled={simulating !== null}
            className="py-2.5 px-3.5 rounded-xl bg-[#E23744] hover:bg-[#c52d3a] active:scale-95 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Create a test Zomato delivery order"
          >
            <Zap className={`w-3.5 h-3.5 ${simulating === "ZOMATO" ? "animate-spin" : ""}`} />
            <span>+ Zomato Test</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${soundEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-stone-100 border-stone-200 text-stone-500"}`}
            title={soundEnabled ? "Order chime enabled" : "Order chime muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchOnlineOrders}
            className="p-2.5 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#171717] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Channel Selector Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Channel Pills */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200/80 w-full sm:w-auto">
          <button
            onClick={() => setChannelFilter("ALL")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${channelFilter === "ALL" ? "bg-white text-[#171717] shadow-xs" : "text-stone-600 hover:text-black"}`}
          >
            All Delivery ({orders.length})
          </button>
          <button
            onClick={() => setChannelFilter("SWIGGY")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${channelFilter === "SWIGGY" ? "bg-[#FC8019] text-white shadow-xs" : "text-stone-600 hover:text-black"}`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            Swiggy ({orders.filter((o) => o.orderSource === "SWIGGY").length})
          </button>
          <button
            onClick={() => setChannelFilter("ZOMATO")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${channelFilter === "ZOMATO" ? "bg-[#E23744] text-white shadow-xs" : "text-stone-600 hover:text-black"}`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Zomato ({orders.filter((o) => o.orderSource === "ZOMATO").length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search order ID, rider, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#12372A]"
          />
        </div>
      </div>

      {/* 4 Delivery Pipeline Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Step 1: Incoming */}
        <button
          onClick={() => setActiveTab("INCOMING")}
          className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${activeTab === "INCOMING" ? "bg-[#12372A] text-white border-[#12372A] shadow-md" : "bg-white hover:bg-stone-50 border-[#E5E2D9] text-[#171717]"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === "INCOMING" ? "bg-white/20 text-emerald-200" : "bg-stone-100 text-stone-600"}`}>
              Step 1
            </span>
            {incomingOrders.length > 0 && (
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="text-xl font-black">{incomingOrders.length}</div>
          <div className={`text-xs font-bold ${activeTab === "INCOMING" ? "text-emerald-200" : "text-stone-600"}`}>
            🔔 New Incoming
          </div>
          <div className={`text-[11px] font-medium mt-0.5 ${activeTab === "INCOMING" ? "text-emerald-100/70" : "text-stone-400"}`}>
            Accept & set prep time
          </div>
        </button>

        {/* Step 2: Preparing */}
        <button
          onClick={() => setActiveTab("PREPARING")}
          className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${activeTab === "PREPARING" ? "bg-[#12372A] text-white border-[#12372A] shadow-md" : "bg-white hover:bg-stone-50 border-[#E5E2D9] text-[#171717]"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === "PREPARING" ? "bg-white/20 text-emerald-200" : "bg-stone-100 text-stone-600"}`}>
              Step 2
            </span>
            {preparingOrders.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            )}
          </div>
          <div className="text-xl font-black">{preparingOrders.length}</div>
          <div className={`text-xs font-bold ${activeTab === "PREPARING" ? "text-emerald-200" : "text-stone-600"}`}>
            🍳 In Kitchen Cooking
          </div>
          <div className={`text-[11px] font-medium mt-0.5 ${activeTab === "PREPARING" ? "text-emerald-100/70" : "text-stone-400"}`}>
            Dishes being prepared
          </div>
        </button>

        {/* Step 3: Ready for Rider */}
        <button
          onClick={() => setActiveTab("READY")}
          className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${activeTab === "READY" ? "bg-[#12372A] text-white border-[#12372A] shadow-md" : "bg-white hover:bg-stone-50 border-[#E5E2D9] text-[#171717]"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === "READY" ? "bg-white/20 text-emerald-200" : "bg-stone-100 text-stone-600"}`}>
              Step 3
            </span>
            {readyOrders.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            )}
          </div>
          <div className="text-xl font-black">{readyOrders.length}</div>
          <div className={`text-xs font-bold ${activeTab === "READY" ? "text-emerald-200" : "text-stone-600"}`}>
            🛵 Ready for Pickup (OTP)
          </div>
          <div className={`text-[11px] font-medium mt-0.5 ${activeTab === "READY" ? "text-emerald-100/70" : "text-stone-400"}`}>
            Handover to Delivery Partner
          </div>
        </button>

        {/* Step 4: Dispatched / Past Orders */}
        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${activeTab === "COMPLETED" ? "bg-[#12372A] text-white border-[#12372A] shadow-md" : "bg-white hover:bg-stone-50 border-[#E5E2D9] text-[#171717]"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === "COMPLETED" ? "bg-white/20 text-emerald-200" : "bg-stone-100 text-stone-600"}`}>
              Step 4
            </span>
          </div>
          <div className="text-xl font-black">{completedOrders.length}</div>
          <div className={`text-xs font-bold ${activeTab === "COMPLETED" ? "text-emerald-200" : "text-stone-600"}`}>
            ✅ Dispatched & Delivered
          </div>
          <div className={`text-[11px] font-medium mt-0.5 ${activeTab === "COMPLETED" ? "text-emerald-100/70" : "text-stone-400"}`}>
            Completed online orders
          </div>
        </button>
      </div>

      {/* Main Order Cards Grid */}
      {(() => {
        const displayed =
          activeTab === "INCOMING"
            ? incomingOrders
            : activeTab === "PREPARING"
            ? preparingOrders
            : activeTab === "READY"
            ? readyOrders
            : completedOrders;

        if (displayed.length === 0) {
          return (
            <div className="bg-white rounded-3xl p-12 border border-[#E5E2D9] text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#171717]">
                  No {activeTab.toLowerCase()} orders right now
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  New incoming delivery orders from Swiggy and Zomato will automatically arrive here in real time.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleSimulate("SWIGGY")}
                  className="py-2.5 px-4 rounded-xl bg-[#FC8019] hover:bg-[#e06f14] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Swiggy Order</span>
                </button>
                <button
                  onClick={() => handleSimulate("ZOMATO")}
                  className="py-2.5 px-4 rounded-xl bg-[#E23744] hover:bg-[#c52d3a] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Zomato Order</span>
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {displayed.map((order) => {
              const isSwiggy = order.orderSource === "SWIGGY";
              const isPending = order.status === OrderStatus.PENDING;
              const isReady = order.status === OrderStatus.READY;
              const isCompleted = order.status === OrderStatus.COMPLETED;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border-2 transition-all shadow-sm hover:shadow-md flex flex-col h-[530px] overflow-hidden ${
                    isPending
                      ? "border-amber-400 ring-2 ring-amber-400/20"
                      : isReady
                      ? "border-emerald-400 ring-2 ring-emerald-400/20"
                      : isSwiggy
                      ? "border-orange-200 hover:border-orange-400"
                      : "border-red-200 hover:border-red-400"
                  }`}
                >
                  {/* Card Header (Fixed height) */}
                  <div className={`p-4 border-b flex items-start justify-between gap-2 shrink-0 ${
                    isSwiggy ? "bg-orange-50/50 border-orange-100" : "bg-red-50/50 border-red-100"
                  }`}>
                    <div>
                      <OrderSourceBadge
                        source={order.orderSource}
                        externalOrderId={order.externalOrderId}
                        riderName={order.riderName}
                        riderPhone={order.riderPhone}
                        riderStatus={order.riderStatus}
                        otp={isReady ? order.otp : null}
                        compact
                      />
                      <div className="text-xs text-stone-500 font-mono mt-1">
                        #{order.orderNumber}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-[#171717]">
                        ₹{order.totalAmount}
                      </div>
                      <div className="text-[10px] text-stone-500 font-semibold flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>

                  {/* Card Body (Flex-1 min-h-0 with internal scroll for dishes) */}
                  <div className="p-4 space-y-3 flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Customer & Delivery Partner info */}
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 space-y-1 text-xs shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500 flex items-center gap-1 font-semibold">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          Customer:
                        </span>
                        <span className="font-bold text-stone-900 truncate max-w-[160px]">
                          {order.customerName}
                        </span>
                      </div>

                      {order.riderName && (
                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                          <span className="text-stone-500 flex items-center gap-1 font-semibold">
                            <Bike className={`w-3.5 h-3.5 ${isSwiggy ? "text-[#FC8019]" : "text-[#E23744]"}`} />
                            Rider:
                          </span>
                          <span className="font-bold text-stone-900 truncate max-w-[160px]">
                            {order.riderName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Prominent OTP Banner ONLY when order is READY for pickup */}
                    {isReady && order.otp && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-2xl border-2 border-amber-300 flex items-center justify-between shrink-0">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                            Pickup Verification OTP
                          </span>
                          <span className="text-2xl font-black text-amber-950 font-mono tracking-widest">
                            {order.otp}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyOtp(order)}
                            className="py-1.5 px-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title="Copy OTP to clipboard"
                          >
                            {copiedOtpId === order.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-amber-700" />
                                <span>Copy OTP</span>
                              </>
                            )}
                          </button>
                          <ShieldCheck className="w-8 h-8 text-amber-600 opacity-80" />
                        </div>
                      </div>
                    )}

                    {/* Ordered Items List - Scrollable food items */}
                    <div className="flex-1 min-h-0 flex flex-col border-t border-dashed border-stone-200 pt-2.5">
                      <div className="mb-1.5 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                          Dishes to Pack ({order.items.filter((i) => !i.isCancelled).length})
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-0 divide-y divide-stone-100/80">
                        {order.items.map((it) => (
                          <div
                            key={it.id}
                            className={`flex items-center justify-between text-xs font-bold py-1 ${
                              it.isCancelled ? "text-stone-400 line-through opacity-60" : "text-stone-800"
                            }`}
                          >
                            <span className="truncate pr-2 flex items-center gap-1.5">
                              {it.isCancelled && (
                                <span className="no-underline text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-extrabold uppercase">
                                  Out of Stock
                                </span>
                              )}
                              {it.quantity}x {it.productName}
                            </span>
                            <span className="font-mono text-stone-600 shrink-0">₹{it.subtotal}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Special packing instruction (Hide boilerplate simulation text) */}
                    {order.specialInstructions && !order.specialInstructions.includes("Live Simulated Order") && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 italic font-medium flex items-start gap-1.5 shrink-0 truncate">
                        <span className="font-bold not-italic text-amber-950 mr-1">Note:</span>
                        <span>{order.specialInstructions}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer - Uniform height & consistent styling across all stages */}
                  <div className="p-4 bg-stone-50/80 border-t border-stone-200/80 shrink-0 min-h-[112px] flex flex-col justify-center space-y-2">
                    {/* Stage 1 Actions: Accept or Reject or Out of Stock */}
                    {isPending && (
                      <div className="space-y-2">
                        {/* Row 1: Full-Width Primary Accept */}
                        <button
                          onClick={() => updateOrderStatus(order.id, OrderStatus.ACCEPTED, "Order accepted by kitchen.")}
                          disabled={actionLoading === order.id}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept & Cook Order</span>
                        </button>

                        {/* Row 2: Out of Stock & Reject evenly split */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openOutOfStockModal(order)}
                            className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Dish Sudden Out of Stock?"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="truncate">Out of Stock?</span>
                          </button>

                          <button
                            onClick={() => updateOrderStatus(order.id, OrderStatus.CANCELLED, "Kitchen at capacity. Order rejected.")}
                            disabled={actionLoading === order.id}
                            className="py-2 px-2.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 active:scale-95 text-red-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Reject order"
                          >
                            <X className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stage 2 Actions: Preparing -> Mark Food Ready */}
                    {["ACCEPTED", "PREPARING"].includes(order.status) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateOrderStatus(order.id, OrderStatus.READY, "Food prepared and packed. Waiting for delivery partner.")}
                            disabled={actionLoading === order.id}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <PackageCheck className="w-4 h-4 text-[#C9A227]" />
                            <span>Mark Food Ready 🔔</span>
                          </button>

                          <button
                            onClick={() => handlePrintKOT(order)}
                            className="p-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                            title="Print Parcel KOT"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Out of Stock in kitchen */}
                        <button
                          onClick={() => openOutOfStockModal(order)}
                          className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          <span>⚠️ Item Out of Stock?</span>
                        </button>
                      </div>
                    )}

                    {/* Stage 3 Actions: Ready -> Handover to Rider with OTP */}
                    {isReady && (
                      <div className="space-y-2">
                        {/* Row 1: OTP Input & 1-Click Auto-Fill Button */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Enter 4-digit OTP"
                              value={otpInputs[order.id] || ""}
                              onChange={(e) => handleOtpInputChange(order.id, e.target.value)}
                              maxLength={6}
                              className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold text-center tracking-widest transition focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                                otpErrors[order.id]
                                  ? "border-red-500 bg-red-50 text-red-800 ring-2 ring-red-400"
                                  : "border-stone-300 bg-white text-stone-900 shadow-2xs"
                              }`}
                            />
                          </div>

                          {order.otp && (
                            <button
                              type="button"
                              onClick={() => handleAutoFillOtp(order)}
                              className="py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 active:scale-95 border border-amber-300 text-amber-900 text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-2xs"
                              title="Click to fill this order's OTP automatically"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-700" />
                              <span>Auto-Fill OTP</span>
                            </button>
                          )}
                        </div>

                        {/* Row 2: Full-Width Handover & Dispatch Button */}
                        <button
                          onClick={() => handleHandoverWithOtp(order)}
                          disabled={actionLoading === order.id}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Bike className="w-4 h-4" />
                          <span>Handover to Rider & Dispatch</span>
                        </button>

                        {otpErrors[order.id] && (
                          <p className="text-[11px] text-red-600 font-bold text-center bg-red-50 py-1 px-2 rounded-xl border border-red-200">
                            Incorrect OTP. Correct OTP is {order.otp}. Please verify with rider.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Stage 4: Completed / Dispatched view */}
                    {isCompleted && (
                      <div className="space-y-2">
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Dispatched & Delivered</span>
                          </span>
                          <span className="text-[11px] text-emerald-700 font-medium truncate max-w-[130px]">
                            {order.riderName || "Delivery Valet"}
                          </span>
                        </div>
                        <button
                          onClick={() => handlePrintKOT(order)}
                          className="w-full py-2.5 px-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Re-print Parcel KOT</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      {/* Sudden Out of Stock & Partial Quantity Modal */}
      {outOfStockOrder && (() => {
        const totalOriginalQty = itemAdjustments.reduce((sum, it) => sum + it.originalQty, 0);
        const totalCookingQty = itemAdjustments.reduce((sum, it) => sum + it.availableQty, 0);
        const totalDismissedQty = itemAdjustments.reduce((sum, it) => sum + (it.originalQty - it.availableQty), 0);

        const dismissedSubtotal = itemAdjustments.reduce(
          (sum, it) => sum + (it.originalQty - it.availableQty) * it.unitPrice,
          0
        );

        // Approximate tax rate
        const taxRateRatio = outOfStockOrder.subtotal > 0
          ? outOfStockOrder.taxAmount / outOfStockOrder.subtotal
          : 0.05;

        const estimatedRefundWithTax = Math.round((dismissedSubtotal * (1 + taxRateRatio)) * 100) / 100;
        const estimatedNewTotal = Math.max(0, Math.round((outOfStockOrder.totalAmount - estimatedRefundWithTax) * 100) / 100);

        const hasModifications = totalDismissedQty > 0;
        const canCookPartial = totalCookingQty > 0 && hasModifications;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#171717]">
                      Item Availability & Out-of-Stock Manager
                    </h3>
                    <p className="text-xs text-stone-500">
                      Order #{outOfStockOrder.externalOrderId || outOfStockOrder.orderNumber} • <span className="font-bold text-stone-800">{outOfStockOrder.orderSource}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setOutOfStockOrder(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customer Call Strip (For dish swapping / informing) */}
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-950 block">Customer: {outOfStockOrder.customerName}</span>
                  <span className="text-blue-700">{outOfStockOrder.customerPhone}</span>
                </div>
                <a
                  href={`tel:${outOfStockOrder.customerPhone}`}
                  className="py-1.5 px-3 rounded-xl bg-white border border-blue-300 hover:bg-blue-100/50 text-blue-900 font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Call to Swap Dish</span>
                </a>
              </div>

              {/* Dish-by-Dish Availability Stepper */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#171717] block">
                    Adjust How Many Quantities Kitchen Can Prepare:
                  </label>
                  <span className="text-[11px] text-stone-500 font-semibold">
                    {totalCookingQty} of {totalOriginalQty} items cooking
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {itemAdjustments.map((it) => {
                    const isAllAvailable = it.availableQty === it.originalQty;
                    const isPartiallyAvailable = it.availableQty > 0 && it.availableQty < it.originalQty;
                    const isOutOfStock = it.availableQty === 0;

                    return (
                      <div
                        key={it.id}
                        className={`p-3.5 rounded-2xl border transition ${
                          isOutOfStock
                            ? "bg-red-50/70 border-red-200"
                            : isPartiallyAvailable
                            ? "bg-amber-50/70 border-amber-300"
                            : "bg-white border-stone-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Dish info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  it.isVeg ? "bg-emerald-600" : "bg-red-600"
                                }`}
                              />
                              <span className="font-black text-xs text-stone-900 truncate">
                                {it.productName}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              ₹{it.unitPrice} each • Ordered by customer: <span className="font-bold text-stone-800">{it.originalQty}</span>
                            </div>
                          </div>

                          {/* Stepper controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-xl bg-white border border-stone-300 shadow-2xs p-0.5">
                              <button
                                onClick={() => setItemAvailableQty(it.id, it.availableQty - 1)}
                                disabled={it.availableQty <= 0}
                                className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
                                title="Decrease available quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              <span className="w-8 text-center text-xs font-black font-mono text-stone-900">
                                {it.availableQty}
                              </span>

                              <button
                                onClick={() => setItemAvailableQty(it.id, it.availableQty + 1)}
                                disabled={it.availableQty >= it.originalQty}
                                className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
                                title="Increase available quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Quick Presets */}
                            <button
                              onClick={() => setItemAvailableQty(it.id, 0)}
                              className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition cursor-pointer ${
                                isOutOfStock
                                  ? "bg-red-600 text-white border-red-600"
                                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                              }`}
                            >
                              0 Qty
                            </button>
                          </div>
                        </div>

                        {/* Status message */}
                        <div className="mt-2 pt-2 border-t border-stone-200/60 text-[11px] font-semibold flex items-center justify-between">
                          {isAllAvailable && (
                            <span className="text-emerald-700">✓ Fully available (Kitchen will cook {it.originalQty})</span>
                          )}
                          {isPartiallyAvailable && (
                            <span className="text-amber-800">
                              ⚠️ Kitchen cooking {it.availableQty} of {it.originalQty} • Refund {it.originalQty - it.availableQty}x (₹{(it.originalQty - it.availableQty) * it.unitPrice}) to customer
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="text-red-700">
                              ✕ Out of stock in kitchen • Full refund ₹{it.originalQty * it.unitPrice} to customer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Financial Impact Box */}
              <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">
                  Live Bill & Payout Impact
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-xl border border-stone-200/80">
                    <span className="text-[10px] text-stone-500 block">Original Bill</span>
                    <span className="text-xs font-black text-stone-800 font-mono">₹{outOfStockOrder.totalAmount}</span>
                  </div>

                  <div className="p-2 bg-red-50/70 rounded-xl border border-red-200">
                    <span className="text-[10px] text-red-700 block font-semibold">Refund Customer</span>
                    <span className="text-xs font-black text-red-700 font-mono">
                      {estimatedRefundWithTax > 0 ? `-₹${estimatedRefundWithTax}` : "₹0"}
                    </span>
                  </div>

                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block font-bold">New Hotel Bill</span>
                    <span className="text-xs font-black text-emerald-800 font-mono">
                      ₹{estimatedNewTotal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Auto Turn OFF in Menu Checkbox */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTurnOffMenu}
                    onChange={(e) => setAutoTurnOffMenu(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black text-stone-900 block">
                      Turn OFF unavailable items in Digital Menu & Swiggy/Zomato for today
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Disables future orders for these dishes until the chef re-enables them.
                    </span>
                  </div>
                </label>
              </div>

              {/* Optional Custom Note */}
              <div>
                <label className="text-[11px] font-bold text-stone-500 block mb-1">
                  Reason Note (Sent to {outOfStockOrder.orderSource} & Customer):
                </label>
                <input
                  type="text"
                  placeholder="Optional custom reason..."
                  value={customRejectionReason}
                  onChange={(e) => setCustomRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-stone-100">
                <button
                  onClick={() => setOutOfStockOrder(null)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  Keep Order As Is
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Action 1: Reject Entire Order */}
                  <button
                    onClick={handleRejectEntireOrder}
                    disabled={isProcessingOutOfStock}
                    className="py-2.5 px-3.5 rounded-xl bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    Reject Full Order
                  </button>

                  {/* Action 2: Cook Remaining Dishes (Partial Fulfillment) */}
                  <button
                    onClick={handlePartialFulfillment}
                    disabled={isProcessingOutOfStock || !canCookPartial}
                    className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingOutOfStock ? (
                      <span>Updating...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {canCookPartial
                            ? `Cook Remaining (${totalCookingQty} items)`
                            : "Select items to reduce"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


"use client";

import React, { useState, useEffect, useCallback } from "react";
import { OrderStatus } from "@/types";
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  RefreshCw,
  Utensils,
  Receipt,
  Phone,
  User,
  Check,
  Printer,
  Sparkles,
  ChevronRight,
  Send,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  ShoppingBag,
  Loader2,
  XCircle,
  History,
  UtensilsCrossed,
  Plus,
} from "lucide-react";
import Link from "next/link";
import OrderDetailDrawer from "@/components/admin/OrderDetailDrawer";
import OrderSourceBadge from "@/components/orders/OrderSourceBadge";
import ManualOrderModal from "@/components/admin/ManualOrderModal";

export interface GroupedSession {
  id: string;
  sessionId: string | null;
  sessionCode?: string;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  createdAt: string | Date;
  closedAt?: string | Date | null;
  orders: any[];
  orderCount: number;
  orderNumbers: string[];
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  totalDishesCount: number;
  servedDishesCount?: number;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    subtotal: number;
    orderNumber: string;
    isVeg?: boolean;
  }>;
  status: OrderStatus;
  allServed: boolean;
  hasPending: boolean;
  paymentMethod?: string | null;
  billNumber?: string | null;
  primaryOrderId: string;
  billRequested?: boolean;
  orderSource?: string;
  externalOrderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  riderStatus?: string | null;
  otp?: string | null;
}

// Group orders by session for unified table operations & history
function groupOrdersBySession(orderList: any[]): GroupedSession[] {
  const map = new Map<string, GroupedSession>();

  for (const order of orderList) {
    const key = order.sessionId ? `session_${order.sessionId}` : `order_${order.id}`;
    const isCancelled = order.status === OrderStatus.CANCELLED;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        sessionId: order.sessionId || null,
        sessionCode: order.session?.sessionCode || undefined,
        tableNumber:
          (order.orderSource === "DINE_IN" && order.externalOrderId)
            ? order.externalOrderId
            : order.table?.tableNumber ||
              (order.orderSource === "SWIGGY"
                ? "Swiggy Delivery"
                : order.orderSource === "ZOMATO"
                ? "Zomato Delivery"
                : order.orderSource === "TAKEAWAY"
                ? "Takeaway"
                : "Table 08"),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderSource: order.orderSource,
        externalOrderId: order.externalOrderId,
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        riderStatus: order.riderStatus,
        otp: order.otp,
        createdAt: order.createdAt,
        closedAt: order.session?.closedAt || null,
        orders: [order],
        orderCount: 1,
        orderNumbers: [order.orderNumber],
        totalAmount: isCancelled ? 0 : order.totalAmount,
        subtotal: isCancelled ? 0 : order.subtotal,
        taxAmount: isCancelled ? 0 : order.taxAmount,
        totalDishesCount: isCancelled
          ? 0
          : order.items
            .filter((i: any) => !i.isCancelled)
            .reduce((s: number, i: any) => s + i.quantity, 0),
        items: isCancelled
          ? []
          : order.items
            .filter((i: any) => !i.isCancelled)
            .map((i: any) => ({
              id: i.id,
              productName: i.productName,
              quantity: i.quantity,
              subtotal: i.subtotal,
              orderNumber: order.orderNumber,
              isVeg: i.isVeg,
            })),
        status: order.status,
        allServed: !isCancelled && (order.status === OrderStatus.SERVED || order.status === OrderStatus.COMPLETED),
        hasPending: order.status === OrderStatus.PENDING,
        paymentMethod: order.bill?.paymentMethod || null,
        billNumber: order.bill?.billNumber || null,
        primaryOrderId: order.id,
        billRequested: Boolean(order.session?.billRequested),
      });
    } else {
      const group = map.get(key)!;
      if (order.session?.billRequested) {
        group.billRequested = true;
      }
      group.orders.push(order);
      group.orderNumbers.push(order.orderNumber);

      // Only add to billable totals and items if NOT cancelled
      if (!isCancelled) {
        group.orderCount += 1;
        group.totalAmount = Number((group.totalAmount + order.totalAmount).toFixed(2));
        group.subtotal = Number((group.subtotal + order.subtotal).toFixed(2));
        group.taxAmount = Number((group.taxAmount + order.taxAmount).toFixed(2));
        group.totalDishesCount += order.items
          .filter((i: any) => !i.isCancelled)
          .reduce((s: number, i: any) => s + i.quantity, 0);
        group.items.push(
          ...order.items
            .filter((i: any) => !i.isCancelled)
            .map((i: any) => ({
              id: i.id,
              productName: i.productName,
              quantity: i.quantity,
              subtotal: i.subtotal,
              orderNumber: order.orderNumber,
              isVeg: i.isVeg,
            }))
        );
        if (group.orders[0]?.status === OrderStatus.CANCELLED) {
          group.primaryOrderId = order.id;
        }
      }

      if (order.status === OrderStatus.PENDING) {
        group.hasPending = true;
      }

      // Check allServed across non-cancelled items in this session
      const nonCancelledOrders = group.orders.filter((o) => o.status !== OrderStatus.CANCELLED);
      if (nonCancelledOrders.length > 0) {
        const allActiveItems = nonCancelledOrders.flatMap((o) => o.items.filter((i: any) => !i.isCancelled));
        group.totalDishesCount = allActiveItems.length;
        group.servedDishesCount = allActiveItems.filter((i: any) => i.isServed === true).length;
        group.allServed = allActiveItems.length > 0 && group.servedDishesCount === allActiveItems.length;
      }

      if (order.bill?.paymentMethod && !group.paymentMethod) {
        group.paymentMethod = order.bill.paymentMethod;
      }
      if (order.bill?.billNumber && !group.billNumber) {
        group.billNumber = order.bill.billNumber;
      }
      if (
        order.status !== OrderStatus.COMPLETED &&
        order.status !== OrderStatus.CANCELLED &&
        group.status === OrderStatus.COMPLETED
      ) {
        group.status = order.status;
      } else if (group.status === OrderStatus.CANCELLED && !isCancelled) {
        group.status = order.status;
      }
    }
  }

  return Array.from(map.values());
}

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"INCOMING" | "ACTIVE" | "HISTORY">("INCOMING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);

  // User auth & role permission state
  const [currentUserRole, setCurrentUserRole] = useState<string>("SUPER_ADMIN");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Modal state for notifying customer about unavailable items
  const [notifyModalOrder, setNotifyModalOrder] = useState<any | null>(null);
  const [selectedUnavailableItems, setSelectedUnavailableItems] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmittingNotification, setIsSubmittingNotification] = useState(false);

  // Payment Settlement Modal state
  const [settleModalData, setSettleModalData] = useState<{
    sessionId?: string | null;
    orderId?: string | null;
    tableNumber: string;
    sessionCode?: string;
    orderCount: number;
    orderNumbers: string[];
    totalAmount: number;
    dishesCount: number;
  } | null>(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [isSettling, setIsSettling] = useState(false);

  // Local map to track item quantity dismissals inside incoming order cards: { [orderId-itemId]: numberDismissed }
  const [itemDismissQtyMap, setItemDismissQtyMap] = useState<Record<string, number>>({});

  const currency = "₹";

  // Load current user permissions
  useEffect(() => {
    async function loadAuth() {
      try {
        const res = await fetch("/api/admin/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUserRole(data.user.role || "STAFF");
            setUserPermissions(data.user.permissions || []);
          }
        }
      } catch (err) {
        console.error("Failed to load user permissions on orders page:", err);
      } finally {
        setAuthLoaded(true);
      }
    }
    loadAuth();
  }, []);

  const isSuper = currentUserRole === "SUPER_ADMIN";
  const canViewIncoming =
    isSuper ||
    userPermissions.includes("orders") ||
    userPermissions.includes("orders_incoming");

  const canViewActive =
    isSuper ||
    userPermissions.includes("orders") ||
    userPermissions.includes("orders_active");

  const canViewHistory =
    isSuper ||
    userPermissions.includes("orders") ||
    userPermissions.includes("orders_completed");

  const allowedTabsCount = [canViewIncoming, canViewActive, canViewHistory].filter(Boolean).length;

  // Auto-switch to first permitted tab
  useEffect(() => {
    if (!authLoaded) return;
    if (activeTab === "INCOMING" && !canViewIncoming) {
      if (canViewActive) setActiveTab("ACTIVE");
      else if (canViewHistory) setActiveTab("HISTORY");
    } else if (activeTab === "ACTIVE" && !canViewActive) {
      if (canViewIncoming) setActiveTab("INCOMING");
      else if (canViewHistory) setActiveTab("HISTORY");
    } else if (activeTab === "HISTORY" && !canViewHistory) {
      if (canViewIncoming) setActiveTab("INCOMING");
      else if (canViewActive) setActiveTab("ACTIVE");
    }
  }, [authLoaded, canViewIncoming, canViewActive, canViewHistory, activeTab]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orders?channel=DINE_IN");
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time listener: automatically reload orders without manual refresh
  useEffect(() => {
    const handleUpdate = () => {
      fetchOrders();
    };
    window.addEventListener("admin:orderUpdate", handleUpdate);
    window.addEventListener("app:refresh", handleUpdate);
    return () => {
      window.removeEventListener("admin:orderUpdate", handleUpdate);
      window.removeEventListener("app:refresh", handleUpdate);
    };
  }, [fetchOrders]);

  // Real-time listener: sync with header left-corner search
  useEffect(() => {
    const handleSearch = (e: any) => {
      setSearchQuery(e.detail || "");
    };
    window.addEventListener("admin:search", handleSearch as EventListener);
    return () => window.removeEventListener("admin:search", handleSearch as EventListener);
  }, []);

  // Confirm Order: All items are available -> Advance to ACCEPTED
  const handleConfirmOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: OrderStatus.ACCEPTED,
          note: "Order confirmed! All items are available. Kitchen is cooking your food fresh.",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Error confirming order:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Open the "Item Not Available" modal
  const openUnavailableModal = (order: any, preselectedItem?: string) => {
    setNotifyModalOrder(order);
    const initialSelected = preselectedItem
      ? [preselectedItem]
      : order.items
        .filter((i: any) => !i.isCancelled && (itemDismissQtyMap[`${order.id}-${i.id}`] || 0) > 0)
        .map((i: any) => i.productName);
    setSelectedUnavailableItems(initialSelected);

    const totalActive = order.items.filter((i: any) => !i.isCancelled).length;
    const isPartial = initialSelected.length > 0 && initialSelected.length < totalActive;

    if (isPartial) {
      setCustomReason(
        `⚠️ Dish Unavailable: ${initialSelected.join(", ")} is out of stock (removed from bill). Remaining dishes confirmed & cooking fresh!`
      );
    } else if (initialSelected.length >= totalActive && totalActive > 0) {
      setCustomReason(
        `Dish Unavailable: All dishes (${initialSelected.join(", ")}) are out of stock. Order cancelled.`
      );
    } else {
      setCustomReason("One or more dishes in your order are currently unavailable.");
    }
  };

  // Toggle item selection inside the unavailable modal
  const handleToggleUnavailableItem = (productName: string) => {
    if (!notifyModalOrder) return;
    const isCurrentlySelected = selectedUnavailableItems.includes(productName);
    const nextSelected = isCurrentlySelected
      ? selectedUnavailableItems.filter((name) => name !== productName)
      : [...selectedUnavailableItems, productName];

    setSelectedUnavailableItems(nextSelected);

    const totalActive = notifyModalOrder.items.filter((i: any) => !i.isCancelled).length;
    const isPartial = nextSelected.length > 0 && nextSelected.length < totalActive;

    if (isPartial) {
      setCustomReason(
        `⚠️ Dish Unavailable: ${nextSelected.join(", ")} is out of stock (removed from bill). Remaining dishes confirmed & cooking fresh!`
      );
    } else if (nextSelected.length >= totalActive && totalActive > 0) {
      setCustomReason("Dish Unavailable: All items are out of stock. Order cancelled.");
    } else {
      setCustomReason("");
    }
  };

  // 1-Click: Confirm order and dismiss any dishes marked "இல்ல" directly on the card
  const handleConfirmOrderWithDismissals = async (order: any) => {
    const adjustments = order.items
      .filter(
        (i: any) => !i.isCancelled && (itemDismissQtyMap[`${order.id}-${i.id}`] || 0) > 0
      )
      .map((i: any) => ({
        id: i.id,
        productName: i.productName,
        dismissQty: itemDismissQtyMap[`${order.id}-${i.id}`],
        totalQty: i.quantity,
      }));

    if (adjustments.length === 0) {
      return handleConfirmOrder(order.id);
    }

    const totalActiveDishes = order.items
      .filter((i: any) => !i.isCancelled)
      .reduce((sum: number, i: any) => sum + i.quantity, 0);
    const totalDismissedDishes = adjustments.reduce(
      (sum: number, a: any) => sum + a.dismissQty,
      0
    );
    const isAll = totalDismissedDishes >= totalActiveDishes && totalActiveDishes > 0;

    const dismissalText = adjustments
      .map((a: any) =>
        a.dismissQty > 1
          ? `${a.dismissQty}x ${a.productName}`
          : a.totalQty > 1
            ? `1x ${a.productName}`
            : a.productName
      )
      .join(", ");

    try {
      setActionLoading(order.id);
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          status: isAll ? OrderStatus.CANCELLED : OrderStatus.ACCEPTED,
          unavailableItems: adjustments,
          note: isAll
            ? `Dish Unavailable: All items are out of stock. Order cancelled.`
            : `⚠️ Dish Unavailable: ${dismissalText} is out of stock (removed from bill). Remaining dishes confirmed & cooking fresh!`,
        }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Error confirming order with dismissals:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Submit the "Item Not Available" notification to the customer
  const handleSubmitUnavailableNotification = async () => {
    if (!notifyModalOrder) return;
    try {
      setIsSubmittingNotification(true);
      const totalActive = notifyModalOrder.items.filter((i: any) => !i.isCancelled).length;
      const isAllUnavailable =
        selectedUnavailableItems.length >= totalActive && totalActive > 0;

      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: notifyModalOrder.id,
          status: isAllUnavailable ? OrderStatus.CANCELLED : OrderStatus.ACCEPTED,
          unavailableItems: selectedUnavailableItems,
          note:
            customReason.trim() ||
            (isAllUnavailable
              ? `Dish Unavailable: All items are out of stock. Order cancelled.`
              : `⚠️ Dish Unavailable: ${selectedUnavailableItems.join(", ")} is out of stock (removed from bill). Remaining dishes confirmed & cooking fresh!`),
        }),
      });
      if (res.ok) {
        setNotifyModalOrder(null);
        setSelectedUnavailableItems([]);
        setCustomReason("");
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to send unavailable notification:", err);
    } finally {
      setIsSubmittingNotification(false);
    }
  };

  // Advance active status (e.g. SERVED)
  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      setActionLoading(orderId);
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const [itemActionLoading, setItemActionLoading] = useState<string | number | null>(null);

  // Toggle individual food item served status
  const handleToggleItemServed = async (
    orderId: string | number,
    itemId: string | number,
    currentServed: boolean
  ) => {
    try {
      setItemActionLoading(itemId);
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: itemId,
          isServed: !currentServed,
        }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to update item served status:", err);
    } finally {
      setItemActionLoading(null);
    }
  };

  // Open the Payment Settlement Modal
  const openSettleModal = (params: {
    sessionId?: string | null;
    orderId?: string | null;
    tableNumber: string;
    sessionCode?: string;
    orderCount: number;
    orderNumbers: string[];
    totalAmount: number;
    dishesCount: number;
  }) => {
    setSettleModalData(params);
    setSettlePaymentMethod("CASH");
  };

  // Confirm settlement with payment mode
  const handleConfirmSettle = async () => {
    if (!settleModalData) return;
    try {
      setIsSettling(true);
      if (settleModalData.sessionId) {
        // Settle entire session with payment mode
        const res = await fetch(`/api/sessions/${settleModalData.sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "close",
            paymentMethod: settlePaymentMethod,
          }),
        });
        if (!res.ok) throw new Error("Failed to close session");
      } else if (settleModalData.orderId) {
        // Settle single order with payment mode
        const res = await fetch(`/api/admin/orders`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: settleModalData.orderId,
            status: OrderStatus.COMPLETED,
            paymentMethod: settlePaymentMethod,
          }),
        });
        if (!res.ok) throw new Error("Failed to settle order");
      }

      setSettleModalData(null);
      await fetchOrders();
    } catch (err) {
      console.error("Failed to settle bill:", err);
      alert("Error completing and settling bill");
    } finally {
      setIsSettling(false);
    }
  };

  // Filter orders by search query
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.table?.tableNumber?.toLowerCase().includes(q) ||
      o.session?.sessionCode?.toLowerCase().includes(q)
    );
  });

  // Categorize orders
  const incomingOrders = filteredOrders.filter((o) => o.status === OrderStatus.PENDING);

  // Active table sessions: sessions that are actively dining (have accepted/preparing/ready/served orders)
  const activeSessionIds = new Set(
    filteredOrders
      .filter(
        (o) =>
          [
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ].includes(o.status) && o.sessionId
      )
      .map((o) => o.sessionId)
  );

  const activeOrders = filteredOrders.filter((o) => {
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status)) return false;
    if (
      [
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.SERVED,
      ].includes(o.status)
    ) {
      return true;
    }
    // If order is PENDING but belongs to an already active table session, include it in the active session card!
    if (o.status === OrderStatus.PENDING && o.sessionId && activeSessionIds.has(o.sessionId)) {
      return true;
    }
    return false;
  });

  const historyOrders = filteredOrders.filter((o) =>
    [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status)
  );

  // Grouped datasets for multi-order table sessions
  const groupedActive = groupOrdersBySession(activeOrders);
  const groupedHistory = groupOrdersBySession(historyOrders);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D9] pb-4">
        <div className="flex items-center gap-2">
          {/* Aesthetic Rounded Pill Navigation Bar */}
          <nav className="inline-flex items-center p-1 bg-stone-200/50 backdrop-blur-md rounded-full border border-[#DFDAD0] shadow-inner gap-0.5 sm:gap-1">
            {/* Live Orders Active Tab */}
            <div
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-[#12372A] via-[#164333] to-[#12372A] text-white shadow-sm ring-1 ring-[#C9A227]/40 transition-all duration-200"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="tracking-tight">Live Orders</span>
              <span className="text-[9px] font-black bg-[#C9A227]/25 text-[#E2B755] px-1.5 py-0.2 rounded-full border border-[#C9A227]/30">
                {activeOrders.length}
              </span>
            </div>

            {/* Order History Link */}
            <Link
              href="/admin/orders/history"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-stone-600 hover:text-[#12372A] hover:bg-white/90 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              title="View archived order history"
            >
              <History className="w-3 h-3 text-[#C9A227] group-hover:rotate-[-20deg] transition-transform" />
              <span className="tracking-tight">Order History</span>
            </Link>

            {/* Bills Quick Link */}
            <Link
              href="/admin/bills"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-stone-500 hover:text-[#12372A] hover:bg-white/90 hover:shadow-xs transition-all duration-200 cursor-pointer"
              title="Settled Bills and Invoices"
            >
              <Receipt className="w-3 h-3 text-stone-500" />
              <span>Bills</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table, session, phone..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#E5E2D9] rounded-xl text-xs text-[#171717] placeholder:text-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
            />
          </div>

          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#E5E2D9] text-[#12372A] hover:bg-stone-50 transition shadow-2xs"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowManualOrderModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#12372A] to-[#1e5843] hover:from-[#0d281e] hover:to-[#174635] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            title="Punch manual order for Table or Takeaway"
          >
            <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Modern 3-Step Lifecycle Tab Switcher — Filtered by User Permissions */}
      {allowedTabsCount > 0 ? (
        <div
          className={`grid grid-cols-1 ${allowedTabsCount === 3
              ? "sm:grid-cols-3"
              : allowedTabsCount === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-1"
            } gap-2.5 p-1.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl sm:rounded-3xl`}
        >
          {/* TAB 1: New Orders */}
          {canViewIncoming && (
            <button
              type="button"
              onClick={() => setActiveTab("INCOMING")}
              className={`group text-left p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all relative cursor-pointer border ${activeTab === "INCOMING"
                  ? "bg-[#12372A] text-white border-[#12372A] shadow-md ring-2 ring-[#12372A]/20"
                  : "bg-white hover:bg-stone-50/80 text-[#171717] border-[#E5E2D9]/70 hover:border-[#12372A]/30"
                }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${activeTab === "INCOMING"
                        ? "bg-[#C9A227] text-stone-950 font-black shadow-xs"
                        : "bg-red-50 text-red-600 border border-red-200"
                      }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === "INCOMING"
                        ? "bg-white/15 text-emerald-200"
                        : "bg-stone-100 text-[#6B7280]"
                      }`}
                  >
                    Step 1
                  </span>
                </div>

                {incomingOrders.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse shadow-xs">
                    {incomingOrders.length} New
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-bold ${activeTab === "INCOMING" ? "text-emerald-200/80" : "text-[#6B7280]"
                      }`}
                  >
                    0 waiting
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight">
                    🔔 New Orders
                  </span>
                </div>
                <p
                  className={`text-[11px] font-medium transition ${activeTab === "INCOMING" ? "text-emerald-200" : "text-[#6B7280]"
                    }`}
                >
                  Wait to Accept · Customer scans
                </p>
              </div>
            </button>
          )}

          {/* TAB 2: Live Dining */}
          {canViewActive && (
            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`group text-left p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all relative cursor-pointer border ${activeTab === "ACTIVE"
                  ? "bg-[#12372A] text-white border-[#12372A] shadow-md ring-2 ring-[#12372A]/20"
                  : "bg-white hover:bg-stone-50/80 text-[#171717] border-[#E5E2D9]/70 hover:border-[#12372A]/30"
                }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${activeTab === "ACTIVE"
                        ? "bg-[#C9A227] text-stone-950 font-black shadow-xs"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === "ACTIVE"
                        ? "bg-white/15 text-emerald-200"
                        : "bg-stone-100 text-[#6B7280]"
                      }`}
                  >
                    Step 2
                  </span>
                </div>

                {groupedActive.length > 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${activeTab === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
                        : "bg-emerald-100 text-emerald-900 border-emerald-300"
                      }`}
                  >
                    {groupedActive.length} {groupedActive.length === 1 ? "Table" : "Tables"} Live
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-bold ${activeTab === "ACTIVE" ? "text-emerald-200/80" : "text-[#6B7280]"
                      }`}
                  >
                    0 active
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight">
                    🍽️ Live Dining
                  </span>
                </div>
                <p
                  className={`text-[11px] font-medium transition ${activeTab === "ACTIVE" ? "text-emerald-200" : "text-[#6B7280]"
                    }`}
                >
                  Cooking & Serving · In-progress
                </p>
              </div>
            </button>
          )}

          {/* TAB 3: Completed */}
          {canViewHistory && (
            <button
              type="button"
              onClick={() => setActiveTab("HISTORY")}
              className={`group text-left p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all relative cursor-pointer border ${activeTab === "HISTORY"
                  ? "bg-[#12372A] text-white border-[#12372A] shadow-md ring-2 ring-[#12372A]/20"
                  : "bg-white hover:bg-stone-50/80 text-[#171717] border-[#E5E2D9]/70 hover:border-[#12372A]/30"
                }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${activeTab === "HISTORY"
                        ? "bg-[#C9A227] text-stone-950 font-black shadow-xs"
                        : "bg-stone-100 text-stone-700 border border-stone-200"
                      }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeTab === "HISTORY"
                        ? "bg-white/15 text-emerald-200"
                        : "bg-stone-100 text-[#6B7280]"
                      }`}
                  >
                    Step 3
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold ${activeTab === "HISTORY" ? "text-emerald-200/80" : "text-[#6B7280]"
                    }`}
                >
                  {groupedHistory.length} Settled
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight">
                    ✅ Completed
                  </span>
                </div>
                <p
                  className={`text-[11px] font-medium transition ${activeTab === "HISTORY" ? "text-emerald-200" : "text-[#6B7280]"
                    }`}
                >
                  Billed & Paid · Order history
                </p>
              </div>
            </button>
          )}
        </div>
      ) : (
        authLoaded && (
          <div className="p-8 text-center bg-white rounded-3xl border border-amber-200 shadow-2xs">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="font-bold text-sm text-[#171717]">Access Restricted</p>
            <p className="text-xs text-[#6B7280] mt-1">
              Your account has not been granted permission to access any of the Order Tabs. Please contact Super Admin.
            </p>
          </div>
        )
      )}

      {/* TAB 1: INCOMING ORDERS TO VERIFY */}
      {activeTab === "INCOMING" && canViewIncoming && (
        <div className="space-y-4">
          {incomingOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E5E2D9] text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-[#12372A] flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-[#171717]">
                All Orders Verified!
              </h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                No new incoming orders waiting. New customer scans and batches will appear here with live notifications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {incomingOrders.map((order) => {
                const orderAgeMin = Math.floor(
                  (Date.now() - new Date(order.createdAt).getTime()) / 60000
                );

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border-2 border-[#C9A227] shadow-md p-5 flex flex-col h-[520px] relative overflow-hidden transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between shrink-0 pb-3 border-b border-[#E5E2D9]/60">
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
                          />
                          <span className="text-xs font-black text-[#171717]">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#6B7280] mt-1.5 font-medium">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#12372A]" />
                            {order.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#12372A]" />
                            {order.customerPhone}
                          </span>
                          {order.customerPhone && (
                            <a
                              href={`https://wa.me/${(order.customerPhone || "").replace(/[^0-9]/g, "").length === 10 ? `91${(order.customerPhone || "").replace(/[^0-9]/g, "")}` : (order.customerPhone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${order.customerName || "Customer"}! Your Order #${order.orderNumber} (${order.table?.tableNumber || "Table"}) status: ${order.status}. View details: http://localhost:3000/orders/${order.orderNumber}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition"
                              title="Chat on WhatsApp"
                            >
                              <span>📲</span>
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                        {order.session && (
                          <div className="text-[10px] text-[#C9A227] font-bold mt-1">
                            Session: {order.session.sessionCode} (Table Session)
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-[#12372A]">
                          {currency}
                          {order.totalAmount.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-300 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                          <Clock className="w-2.5 h-2.5" />
                          {orderAgeMin <= 0 ? "Just now" : `${orderAgeMin}m ago`}
                        </span>
                      </div>
                    </div>

                    {/* Middle Section: Dishes Checklist & Note (Flex-1, Scrollable) */}
                    <div className="flex-1 min-h-0 flex flex-col my-3 space-y-2">
                      <div className="flex-1 min-h-0 flex flex-col bg-[#F7F5EF] p-3.5 rounded-2xl border border-[#E5E2D9]">
                        <div className="flex items-center justify-between text-[11px] font-black text-[#171717] pb-1.5 border-b border-[#E5E2D9]/60 shrink-0">
                          <span>
                            Dishes Ordered ({order.items.filter((i: any) => !i.isCancelled).length})
                          </span>
                          <span className="text-[#6B7280]">Item Stock Toggle</span>
                        </div>

                        {/* Scrollable dishes list */}
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-1 thin-scrollbar">
                          {order.items.map((item: any) => {
                            const itemKey = `${order.id}-${item.id}`;
                            const dismissedQty = itemDismissQtyMap[itemKey] || 0;
                            const isItemCancelled = item.isCancelled === true;
                            const isAllDismissed = dismissedQty >= item.quantity && item.quantity > 0;
                            const isPartial = dismissedQty > 0 && dismissedQty < item.quantity;
                            const availableQty = Math.max(0, item.quantity - dismissedQty);

                            return (
                              <div
                                key={item.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${isItemCancelled
                                    ? "bg-stone-100 border-stone-200 opacity-60"
                                    : isAllDismissed
                                      ? "bg-red-50 border-red-300 text-red-900"
                                      : isPartial
                                        ? "bg-amber-50/90 border-amber-300 text-amber-950"
                                        : "bg-white border-[#E5E2D9] text-[#171717]"
                                  }`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${isItemCancelled
                                        ? "bg-stone-300"
                                        : item.isVeg
                                          ? "bg-emerald-600"
                                          : "bg-red-600"
                                      }`}
                                  />
                                  <div className="flex items-center gap-1.5 flex-wrap truncate">
                                    <span
                                      className={`font-bold truncate ${isItemCancelled || isAllDismissed
                                          ? "line-through text-[#6B7280]"
                                          : "text-[#171717]"
                                        }`}
                                    >
                                      {item.quantity} × {item.productName}
                                    </span>

                                    {isItemCancelled && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 text-red-800 border border-red-200 shrink-0">
                                        Removed ({currency}0)
                                      </span>
                                    )}

                                    {isPartial && !isItemCancelled && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-400 shrink-0">
                                        {availableQty} Available · {dismissedQty} Out of Stock
                                      </span>
                                    )}

                                    {isAllDismissed && !isItemCancelled && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-600 text-white shrink-0">
                                        All {dismissedQty} Out of Stock
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-extrabold text-xs text-[#12372A]">
                                    {currency}
                                    {isItemCancelled
                                      ? "0"
                                      : (item.unitPrice * availableQty).toFixed(0)}
                                  </span>

                                  {!isItemCancelled && (
                                    item.quantity > 1 ? (
                                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-stone-200 shadow-2xs">
                                        <span className="text-[10px] font-bold text-stone-600 mr-0.5">
                                          Qty:
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (dismissedQty < item.quantity) {
                                              setItemDismissQtyMap((prev) => ({
                                                ...prev,
                                                [itemKey]: dismissedQty + 1,
                                              }));
                                            }
                                          }}
                                          disabled={dismissedQty === item.quantity}
                                          className="w-5 h-5 rounded-md bg-stone-100 hover:bg-red-50 text-red-600 font-black text-xs flex items-center justify-center border border-stone-200 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                          title="Mark 1 as Out of Stock"
                                        >
                                          -
                                        </button>
                                        <span
                                          className={`text-xs font-black min-w-4 text-center ${dismissedQty > 0
                                              ? "text-amber-800 font-extrabold"
                                              : "text-emerald-800 font-extrabold"
                                            }`}
                                        >
                                          {availableQty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (dismissedQty > 0) {
                                              setItemDismissQtyMap((prev) => ({
                                                ...prev,
                                                [itemKey]: dismissedQty - 1,
                                              }));
                                            }
                                          }}
                                          disabled={dismissedQty === 0}
                                          className="w-5 h-5 rounded-md bg-stone-100 hover:bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center border border-stone-200 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                          title="Restore 1 as Available"
                                        >
                                          +
                                        </button>
                                        {dismissedQty > 0 && (
                                          <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded ml-1">
                                            {dismissedQty} Out
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setItemDismissQtyMap((prev) => ({
                                            ...prev,
                                            [itemKey]: dismissedQty > 0 ? 0 : 1,
                                          }));
                                        }}
                                        className={`group inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-extrabold transition-all shadow-2xs border cursor-pointer select-none active:scale-95 ${dismissedQty > 0
                                            ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                                          }`}
                                        title={dismissedQty > 0 ? "Click to toggle: Available" : "Click to toggle: Out of Stock"}
                                      >
                                        {/* Mini toggle switch */}
                                        <div
                                          className={`w-6 h-3.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${dismissedQty > 0 ? "bg-stone-300 justify-start" : "bg-emerald-600 justify-end"
                                            }`}
                                        >
                                          <div className="w-2.5 h-2.5 bg-white rounded-full shadow-xs transition-transform" />
                                        </div>

                                        <span>{dismissedQty > 0 ? "Out of Stock" : "In Stock"}</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {order.specialInstructions && (
                        <div className="p-2 bg-amber-100/70 rounded-xl text-[11px] text-amber-900 border border-amber-200 shrink-0">
                          <span className="font-bold">Customer Note:</span> &ldquo;
                          {order.specialInstructions}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Verification Buttons (Pinned to bottom) */}
                    <div className="shrink-0 pt-2 border-t border-[#E5E2D9]/60">
                      {(() => {
                        const totalDismissedQty = order.items
                          .filter((item: any) => !item.isCancelled)
                          .reduce(
                            (sum: number, item: any) =>
                              sum + (itemDismissQtyMap[`${order.id}-${item.id}`] || 0),
                            0
                          );
                        const totalActiveDishes = order.items
                          .filter((item: any) => !item.isCancelled)
                          .reduce((sum: number, item: any) => sum + item.quantity, 0);
                        const isAllMarkedUnavailable =
                          totalDismissedQty >= totalActiveDishes && totalActiveDishes > 0;
                        const remainingDishes = totalActiveDishes - totalDismissedQty;

                        return (
                          <div className="space-y-2 pt-1">
                            {totalDismissedQty > 0 && !isAllMarkedUnavailable ? (
                              <button
                                onClick={() => handleConfirmOrderWithDismissals(order)}
                                disabled={actionLoading === order.id}
                                className="w-full py-3 px-4 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>
                                  {actionLoading === order.id
                                    ? "Updating..."
                                    : `Dismiss ${totalDismissedQty} Dish & Confirm Remaining (${remainingDishes})`}
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConfirmOrder(order.id)}
                                disabled={actionLoading === order.id || isAllMarkedUnavailable}
                                className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition ${isAllMarkedUnavailable
                                    ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                                    : "bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white cursor-pointer"
                                  }`}
                              >
                                <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
                                <span>
                                  {actionLoading === order.id
                                    ? "Confirming..."
                                    : "Confirm Order (All Items Available)"}
                                </span>
                              </button>
                            )}

                            <button
                              onClick={() => openUnavailableModal(order)}
                              disabled={actionLoading === order.id}
                              className={`w-full py-2.5 px-4 rounded-2xl border-2 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${isAllMarkedUnavailable
                                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                                  : totalDismissedQty > 0
                                    ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900"
                                    : "bg-white hover:bg-red-50 border-red-200 text-red-700 hover:text-red-800"
                                }`}
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>
                                {isAllMarkedUnavailable
                                  ? "Cancel Order (All Dishes Out of Stock)"
                                  : totalDismissedQty > 0
                                    ? `Review Dismissal (${totalDismissedQty} dismissed) / Custom Note`
                                    : "Item Not Available / Custom Alert"}
                              </span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE TABLES (GROUPED BY SESSION) */}
      {activeTab === "ACTIVE" && canViewActive && (
        <div className="space-y-4">
          {groupedActive.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E5E2D9] text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 text-[#6B7280] flex items-center justify-center">
                <Utensils className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-[#171717]">
                No Active Orders
              </h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Confirmed table orders being prepared or served will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupedActive.map((group) => {
                const primaryOrder = group.orders[0];

                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedOrder(primaryOrder)}
                    className={`rounded-3xl border transition-all p-5 flex flex-col h-[520px] cursor-pointer relative overflow-hidden shadow-xs hover:shadow-md ${group.billRequested
                        ? "bg-amber-50/25 border-amber-400 ring-2 ring-amber-400/40"
                        : "bg-white border-[#E5E2D9] hover:border-[#12372A]/40"
                      }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 shrink-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <OrderSourceBadge
                            source={group.orderSource}
                            externalOrderId={group.externalOrderId}
                            tableNumber={group.tableNumber}
                            riderName={group.riderName}
                            riderPhone={group.riderPhone}
                            riderStatus={group.riderStatus}
                            otp={group.otp}
                          />
                          <span className="text-xs font-black text-[#171717] truncate">
                            {group.orderCount > 1
                              ? `${group.orderCount} Batches`
                              : `#${group.orderNumbers[0]}`}
                          </span>
                        </div>
                        <div className="text-xs text-[#6B7280] mt-1 font-medium truncate">
                          <span>{group.customerName || "Customer"} · {group.customerPhone || "Dine-in"}</span>
                        </div>
                        {group.sessionCode && (
                          <div className="text-[10px] text-[#C9A227] font-bold mt-0.5 truncate">
                            Session: {group.sessionCode}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="text-sm font-black text-[#12372A] whitespace-nowrap">
                          {currency}{group.totalAmount.toFixed(2)}
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1 mt-1 shrink-0 ${group.billRequested
                              ? "bg-amber-400 text-stone-950 border border-amber-500 animate-pulse shadow-xs font-black"
                              : group.hasPending
                                ? "bg-amber-100 text-amber-900 border-2 border-amber-400 animate-pulse"
                                : group.allServed
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : "bg-stone-100 text-stone-800 border border-stone-300"
                            }`}
                        >
                          {group.billRequested
                            ? "🚶‍♂️ BILL REQUESTED"
                            : group.hasPending
                              ? "⏳ NEW BATCH WAITING"
                              : group.allServed
                                ? "✨ ALL SERVED"
                                : "🍳 IN KITCHEN"}
                        </span>
                      </div>
                    </div>

                    {/* Batches & Dishes Summary: ONLY THIS REGION SCROLLS */}
                    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F5EF] p-3 rounded-2xl border border-[#E5E2D9]/60 text-xs mt-3.5 mb-2 overflow-hidden">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#6B7280] uppercase tracking-wider pb-1.5 border-b border-[#E5E2D9] shrink-0">
                        <span>
                          {group.totalDishesCount} {group.totalDishesCount === 1 ? "Dish" : "Dishes"} Total
                        </span>
                        <span className="text-[#12372A] font-extrabold">
                          {group.orderCount} {group.orderCount === 1 ? "Batch" : "Batches"}
                        </span>
                      </div>

                      {/* Scrollable list of batches and dishes */}
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 mt-2 thin-scrollbar">

                        {group.orders.map((ord: any, oIdx: number) => {
                          const isOrderPending = ord.status === OrderStatus.PENDING;
                          const isOrderCancelled = ord.status === OrderStatus.CANCELLED;
                          const activeItems = ord.items.filter((i: any) => !i.isCancelled);
                          const servedItemsCount = activeItems.filter((i: any) => i.isServed === true).length;
                          const totalBatchItemsCount = activeItems.length;
                          const isBatchFullyServed = totalBatchItemsCount > 0 && servedItemsCount === totalBatchItemsCount;

                          return (
                            <div
                              key={ord.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(ord);
                              }}
                              className={`p-2.5 rounded-xl border transition cursor-pointer ${isOrderPending
                                  ? "bg-amber-50/80 border-2 border-amber-300 shadow-2xs hover:border-amber-400"
                                  : isBatchFullyServed
                                    ? "bg-emerald-50/60 border-emerald-300/80 shadow-2xs hover:bg-emerald-50"
                                    : isOrderCancelled
                                      ? "bg-stone-50 border-stone-200 opacity-60"
                                      : "bg-white border-amber-200/90 shadow-2xs hover:border-violet-300"
                                }`}
                            >
                              {/* Batch Header with direct Approve / Serve button */}
                              <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-black/5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-[#171717] text-xs">
                                    Batch #{oIdx + 1}
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-mono font-bold">
                                    #{ord.orderNumber}
                                  </span>
                                  <span className="text-[10px] text-[#6B7280]">
                                    {new Date(ord.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {isOrderPending && (
                                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-400 animate-pulse">
                                      Needs Approval
                                    </span>
                                  )}
                                </div>

                                {/* Direct Action / Status Pill */}
                                <div
                                  className="flex items-center gap-1.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isBatchFullyServed ? (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs flex items-center gap-1">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>All Served ✨</span>
                                    </span>
                                  ) : isOrderCancelled ? (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                      Cancelled (Not Billed)
                                    </span>
                                  ) : isOrderPending ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmOrder(ord.id)}
                                        disabled={actionLoading === ord.id}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 active:scale-95 text-white shadow-xs hover:shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                                        title={`Approve Batch #${oIdx + 1} (${ord.orderNumber})`}
                                      >
                                        {actionLoading === ord.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-3 h-3 text-[#C9A227]" />
                                        )}
                                        <span>Approve Batch</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openUnavailableModal(ord)}
                                        disabled={actionLoading === ord.id}
                                        className="p-1.5 rounded-lg bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-700 transition cursor-pointer"
                                        title="Item Unavailable / Reject"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      {servedItemsCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          {servedItemsCount}/{totalBatchItemsCount} Served
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAdvanceStatus(
                                            ord.id,
                                            OrderStatus.SERVED
                                          )
                                        }
                                        disabled={actionLoading === ord.id}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-95 text-white shadow-xs hover:shadow-sm flex items-center gap-1 transition cursor-pointer"
                                        title={`Mark entire #${ord.orderNumber} batch as Served`}
                                      >
                                        {actionLoading === ord.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Sparkles className="w-3 h-3 text-purple-200" />
                                        )}
                                        <span>{servedItemsCount > 0 ? "Serve All" : "Mark Served"}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Items list for this batch */}
                              <div className="space-y-1.5 text-xs">
                                {ord.items.map((i: any) => {
                                  const isItemDismissed = i.isCancelled === true;
                                  if (isItemDismissed && !isOrderCancelled) {
                                    return (
                                      <div
                                        key={i.id}
                                        className="flex justify-between items-center bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5 text-red-700 text-xs my-1 shadow-2xs"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                          <span className="font-bold truncate line-through text-red-950">
                                            {i.quantity}× {i.productName}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-600 text-white shrink-0 shadow-2xs">
                                            Dismissed / Out of Stock (Not Billed)
                                          </span>
                                        </div>
                                        <span className="font-bold text-red-600 line-through text-xs shrink-0">
                                          {currency}{i.subtotal.toFixed(0)}
                                        </span>
                                      </div>
                                    );
                                  }

                                  const isItemServed = Boolean(i.isServed);
                                  const isServingThisItem = itemActionLoading === i.id;

                                  return (
                                    <div
                                      key={i.id}
                                      className={`flex items-center justify-between py-1.5 px-2 rounded-xl transition-all ${isItemServed
                                          ? "bg-emerald-50/80 border border-emerald-200/80"
                                          : "hover:bg-stone-100/70"
                                        }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                        {/* Single Food Item Served Button */}
                                        {!isOrderCancelled && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleItemServed(ord.id, i.id, Boolean(i.isServed));
                                            }}
                                            disabled={isServingThisItem}
                                            className={`shrink-0 flex items-center justify-center rounded-lg transition-all active:scale-90 cursor-pointer ${isItemServed
                                                ? "w-6 h-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs hover:bg-emerald-700"
                                                : "w-6 h-6 border-2 border-stone-300 hover:border-emerald-600 hover:bg-emerald-50 text-emerald-700"
                                              }`}
                                            title={isItemServed ? "Click to unmark served" : `Click to mark ${i.productName} as Served`}
                                          >
                                            {isServingThisItem ? (
                                              <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                                            ) : isItemServed ? (
                                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            ) : (
                                              <span className="text-[10px] text-stone-400 hover:text-emerald-700 font-bold">✓</span>
                                            )}
                                          </button>
                                        )}

                                        <span className="truncate font-medium text-xs">
                                          <strong className="text-stone-900 font-bold">
                                            {i.quantity}×
                                          </strong>{" "}
                                          <span className={isItemServed ? "text-emerald-950 font-semibold" : "text-[#171717]"}>
                                            {i.productName}
                                          </span>
                                          {isItemServed && (
                                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 border border-emerald-300 shadow-2xs">
                                              Served ✨
                                            </span>
                                          )}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {isOrderCancelled ? (
                                          <span className="font-bold text-[#6B7280] line-through text-[11px]">
                                            {currency}{i.subtotal.toFixed(0)}
                                          </span>
                                        ) : (
                                          <span className="font-bold text-[#12372A] text-xs">
                                            {currency}{i.subtotal.toFixed(0)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons: Pinned at bottom */}
                    <div className="pt-2.5 border-t border-[#E5E2D9] flex items-center gap-2 shrink-0 mt-auto">
                      <Link
                        href={`/bill/${group.primaryOrderId}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="p-3 rounded-xl border border-[#E5E2D9] text-[#171717] hover:bg-stone-50 transition shrink-0"
                        title="Print / View Consolidated Bill"
                      >
                        <Printer className="w-4 h-4 text-[#12372A]" />
                      </Link>

                      {/* Batch Actions: If pending batches exist -> Approve; else if unserved batches exist -> Serve */}
                      {(() => {
                        const pendingOrders = group.orders.filter(
                          (o: any) => o.status === OrderStatus.PENDING
                        );
                        const unservedOrders = group.orders.filter(
                          (o: any) =>
                            o.status !== OrderStatus.SERVED &&
                            o.status !== OrderStatus.COMPLETED &&
                            o.status !== OrderStatus.CANCELLED &&
                            o.status !== OrderStatus.PENDING
                        );

                        if (pendingOrders.length > 0) {
                          return (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                for (const p of pendingOrders) {
                                  await handleConfirmOrder(p.id);
                                }
                              }}
                              disabled={!!actionLoading}
                              className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 active:scale-98 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                              title="Approve all pending batches for this table"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A227]" />
                              <span>
                                {pendingOrders.length > 1
                                  ? `Approve All (${pendingOrders.length})`
                                  : "Approve Batch"}
                              </span>
                            </button>
                          );
                        }

                        if (unservedOrders.length === 0) return null;

                        return (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              for (const u of unservedOrders) {
                                await handleAdvanceStatus(
                                  u.id,
                                  OrderStatus.SERVED
                                );
                              }
                            }}
                            disabled={!!actionLoading}
                            className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-98 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                            title="Serve all remaining unserved batches"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                            <span>
                              {unservedOrders.length > 1
                                ? `Serve All (${unservedOrders.length})`
                                : "Mark Served"}
                            </span>
                          </button>
                        );
                      })()}

                      {/* Complete & Settle Bill with Payment Mode */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSettleModal({
                            sessionId: group.sessionId,
                            orderId: group.primaryOrderId,
                            tableNumber: group.tableNumber,
                            sessionCode: group.sessionCode,
                            orderCount: group.orderCount,
                            orderNumbers: group.orderNumbers,
                            totalAmount: group.totalAmount,
                            dishesCount: group.totalDishesCount,
                          });
                        }}
                        className={`flex-1 py-3 px-3 rounded-xl active:scale-98 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${group.billRequested
                            ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 ring-2 ring-amber-400/60 shadow-md"
                            : "bg-[#12372A] hover:bg-[#0e2b21]"
                          }`}
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                        <span className="truncate">
                          {group.billRequested ? "Settle Counter Bill" : "Settle Bill"} ({currency}
                          {group.totalAmount.toFixed(0)})
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORY & COMPLETED (GROUPED BY SESSION) */}
      {activeTab === "HISTORY" && canViewHistory && (
        <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#6B7280] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Table & Session</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Dishes Ordered</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment Mode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {groupedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#6B7280]">
                      No historical sessions or completed orders found
                    </td>
                  </tr>
                ) : (
                  groupedHistory.map((group) => {
                    const primaryOrder = group.orders[0];

                    return (
                      <tr
                        key={group.id}
                        onClick={() => setSelectedOrder(primaryOrder)}
                        className="hover:bg-stone-50/60 transition cursor-pointer"
                      >
                        {/* Table & Session */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#12372A] text-white text-[11px] font-black">
                              {group.tableNumber}
                            </span>
                            {group.sessionCode && (
                              <span className="text-[10px] font-bold text-[#C9A227] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                {group.sessionCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#6B7280] mt-1 font-semibold">
                            {group.orderCount} {group.orderCount === 1 ? "Batch" : "Batches"} (#{group.orderNumbers.join(", #")})
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="p-4">
                          <div className="font-semibold text-[#171717]">
                            {group.customerName}
                          </div>
                          <div className="text-[11px] text-[#6B7280]">
                            {group.customerPhone}
                          </div>
                        </td>

                        {/* Dishes */}
                        <td className="p-4">
                          <div className="text-[#171717] font-medium line-clamp-1 max-w-xs">
                            {group.items.map((i: any) => `${i.quantity}× ${i.productName}`).join(", ")}
                          </div>
                          <div className="text-[10px] text-[#6B7280]">
                            {group.totalDishesCount} dishes · {new Date(group.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="p-4 font-black text-[#12372A] text-sm">
                          {currency}{group.totalAmount.toFixed(2)}
                        </td>

                        {/* Payment Mode Badge */}
                        <td className="p-4">
                          {group.paymentMethod === "UPI" ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-emerald-700" />
                              <span>UPI / GPay</span>
                            </span>
                          ) : group.paymentMethod === "CARD" ? (
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-blue-700" />
                              <span>Card / POS</span>
                            </span>
                          ) : group.paymentMethod === "CASH" ? (
                            <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-stone-600" />
                              <span>Cash</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-stone-50 text-[#6B7280] border border-black/10 text-[10px] font-semibold">
                              Settled
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${group.status === OrderStatus.COMPLETED
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                : "bg-red-100 text-red-900 border border-red-200"
                              }`}
                          >
                            {group.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <Link
                            href={`/bill/${group.primaryOrderId}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 rounded-xl border border-[#E5E2D9] text-[#12372A] hover:bg-stone-100 font-bold inline-flex items-center gap-1 transition"
                            title="Print / View Consolidated Bill"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Bill</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENT SETTLEMENT MODAL (CHOOSE CASH / GPAY / CARD) */}
      {settleModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E5E2D9] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-[#E5E2D9] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#171717]">
                  Settle & Complete Bill
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {settleModalData.tableNumber} · Session {settleModalData.sessionCode || "Standard"}
                </p>
              </div>

              <button
                onClick={() => setSettleModalData(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-[#6B7280] hover:bg-stone-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Info */}
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5E2D9] space-y-2 text-xs">
              <div className="flex justify-between text-[#6B7280]">
                <span>Orders Included</span>
                <span className="font-bold text-[#171717]">
                  {settleModalData.orderCount} {settleModalData.orderCount === 1 ? "Batch" : "Batches"} (#{settleModalData.orderNumbers.join(", #")})
                </span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Total Dishes</span>
                <span className="font-bold text-[#171717]">{settleModalData.dishesCount} Items</span>
              </div>
              <div className="pt-2 border-t border-[#E5E2D9] flex justify-between text-base font-extrabold text-[#12372A]">
                <span>Final Bill Amount</span>
                <span>{currency}{settleModalData.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">
                Select Customer Payment Mode:
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod("CASH")}
                  className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-1 ${settlePaymentMethod === "CASH"
                      ? "border-[#12372A] bg-emerald-50 text-[#12372A]"
                      : "border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50"
                    }`}
                >
                  <Banknote className="w-4 h-4 text-[#12372A]" />
                  <div>
                    <div className="font-extrabold text-xs text-[#171717]">Cash</div>
                    <div className="text-[9px] text-[#6B7280]">Counter</div>
                  </div>
                </button>

                {/* UPI / GPay */}
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod("UPI")}
                  className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-1 ${settlePaymentMethod === "UPI"
                      ? "border-[#12372A] bg-emerald-50 text-[#12372A]"
                      : "border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50"
                    }`}
                >
                  <QrCode className="w-4 h-4 text-[#12372A]" />
                  <div>
                    <div className="font-extrabold text-xs text-[#171717]">UPI / GPay</div>
                    <div className="text-[9px] text-[#6B7280]">QR / Online</div>
                  </div>
                </button>

                {/* Card / POS */}
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod("CARD")}
                  className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-1 ${settlePaymentMethod === "CARD"
                      ? "border-[#12372A] bg-emerald-50 text-[#12372A]"
                      : "border-[#E5E2D9] bg-white text-[#6B7280] hover:bg-stone-50"
                    }`}
                >
                  <CreditCard className="w-4 h-4 text-[#12372A]" />
                  <div>
                    <div className="font-extrabold text-xs text-[#171717]">Card</div>
                    <div className="text-[9px] text-[#6B7280]">POS Swipe</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#E5E2D9]">
              <button
                type="button"
                onClick={() => setSettleModalData(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={isSettling}
                className="flex-2 py-3 px-5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
                <span>
                  {isSettling
                    ? "Settling..."
                    : `Confirm Payment (${currency}${settleModalData.totalAmount.toFixed(0)})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ITEM NOT AVAILABLE / NOTIFY CUSTOMER */}
      {notifyModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E2D9] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-[#E5E2D9] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <h3 className="text-lg font-black text-[#171717]">
                    Notify Customer: Item Not Available
                  </h3>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Order #{notifyModalOrder.orderNumber} · {notifyModalOrder.table?.tableNumber || "Table 08"}
                </p>
              </div>

              <button
                onClick={() => setNotifyModalOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-[#6B7280] hover:bg-stone-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compute active/partial counts */}
            {(() => {
              const activeDishes = notifyModalOrder.items.filter((i: any) => !i.isCancelled);
              const totalActive = activeDishes.length;
              const selectedCount = selectedUnavailableItems.length;
              const isAllUnavailable = selectedCount >= totalActive && totalActive > 0;
              const isPartial = selectedCount > 0 && selectedCount < totalActive;
              const remainingCount = totalActive - selectedCount;

              return (
                <>
                  {/* Partial Dismissal vs Full Cancellation explanatory banner */}
                  {isPartial && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950">
                      <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block text-emerald-900">
                          Partial Dismissal ({selectedCount} Dish Out of Stock)
                        </span>
                        <span className="text-emerald-800">
                          The selected dish will be dismissed & removed from the bill ({currency}0). The remaining{" "}
                          <strong>{remainingCount} dish</strong> will be <strong>CONFIRMED</strong> and sent to the kitchen for cooking!
                        </span>
                      </div>
                    </div>
                  )}

                  {isAllUnavailable && (
                    <div className="p-3.5 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-2.5 text-xs text-red-950">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block text-red-900">
                          Entire Order Cancellation (All Dishes Out of Stock)
                        </span>
                        <span className="text-red-800">
                          All dishes in this order are unavailable. The entire order #{notifyModalOrder.orderNumber} will be cancelled.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Checklist of Dishes to mark unavailable */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#171717] block">
                      Select which dish is out of stock / unavailable:
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {notifyModalOrder.items.map((item: any) => {
                        const isChecked = selectedUnavailableItems.includes(item.productName);
                        const isAlreadyCancelled = item.isCancelled === true;

                        return (
                          <label
                            key={item.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${isAlreadyCancelled
                                ? "bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed"
                                : isChecked
                                  ? "bg-red-50 border-red-300 text-red-950 font-bold"
                                  : "bg-stone-50 border-[#E5E2D9] text-[#171717]"
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked || isAlreadyCancelled}
                                disabled={isAlreadyCancelled}
                                onChange={() => handleToggleUnavailableItem(item.productName)}
                                className="w-4 h-4 accent-red-600 rounded"
                              />
                              <span className={`text-xs ${isAlreadyCancelled ? "line-through" : ""}`}>
                                {item.quantity} × {item.productName}
                              </span>
                              {isAlreadyCancelled && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 text-red-800 border border-red-200">
                                  Already Removed
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#6B7280]">
                              {currency}{item.subtotal.toFixed(0)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick pre-made Tamil & English reason chips */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6B7280] block">
                      Quick Reason Shortcuts:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Out of Stock",
                        "Dish finished for lunch",
                        "Preparation delay",
                        "Fresh batch in 30 mins",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const prefix =
                              selectedUnavailableItems.length > 0
                                ? `Dish Unavailable: ${selectedUnavailableItems.join(", ")} - `
                                : "";
                            setCustomReason(
                              isPartial
                                ? `⚠️ Dish Unavailable: ${selectedUnavailableItems.join(", ")} is out of stock (${chip}). Remaining dishes confirmed & cooking fresh!`
                                : `${prefix}${chip}. Please order other items.`
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#171717] text-[11px] font-semibold transition"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification message sent to customer */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#171717] block">
                      Notification Message for Customer (Phone & Screen Alert):
                    </label>
                    <textarea
                      rows={3}
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Type reason or details for customer..."
                      className="w-full p-3 bg-stone-50 border border-[#E5E2D9] rounded-2xl text-xs text-[#171717] focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-[#6B7280]"
                    />
                    <p className="text-[11px] text-[#6B7280]">
                      This message will pop up directly on the customer&apos;s phone screen via live updates.
                    </p>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2D9]">
                    <button
                      type="button"
                      onClick={() => setNotifyModalOrder(null)}
                      className="px-4 py-2.5 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-50 transition"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitUnavailableNotification}
                      disabled={isSubmittingNotification || selectedCount === 0}
                      className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-2 shadow-xs ${isAllUnavailable
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-[#12372A] hover:bg-[#0e2b21] active:scale-98"
                        }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {isSubmittingNotification
                          ? "Sending..."
                          : isAllUnavailable
                            ? "Cancel Entire Order (All Dishes Unavailable)"
                            : `Dismiss ${selectedCount} Dish & Confirm Remaining (${remainingCount})`}
                      </span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Slide-over order detail drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAdvanceStatus={handleAdvanceStatus}
        onOpenUnavailableModal={openUnavailableModal}
        onOpenSettleModal={(ord) => {
          setSelectedOrder(null);
          openSettleModal({
            sessionId: ord.session?.id || ord.sessionId || null,
            orderId: ord.id,
            tableNumber: ord.table?.tableNumber || "Table 08",
            sessionCode: ord.session?.sessionCode,
            orderCount: 1,
            orderNumbers: [ord.orderNumber],
            totalAmount: ord.totalAmount,
            dishesCount: ord.items?.length || 0,
          });
        }}
        onToggleItemServed={handleToggleItemServed}
      />

      {/* Manual Order Modal */}
      <ManualOrderModal
        isOpen={showManualOrderModal}
        onClose={() => setShowManualOrderModal(false)}
        onOrderCreated={(order) => {
          fetchOrders();
          if (order.status === "ACCEPTED") {
            setActiveTab("ACTIVE");
          } else {
            setActiveTab("INCOMING");
          }
        }}
      />
    </div>
  );
}

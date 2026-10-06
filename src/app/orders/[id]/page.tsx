"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderData, OrderStatus } from "@/types";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import { OrderDetailSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/EmptyState";
import { useCart } from "@/context/CartContext";
import CustomerFeedbackCard from "@/components/orders/CustomerFeedbackCard";
import {
  ArrowLeft,
  ArrowRight,
  Receipt,
  Plus,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Sparkles,
  Utensils,
  Clock,
  Check,
  Loader2,
  X,
  RotateCcw,
  Star,
} from "lucide-react";
import confetti from "canvas-confetti";
import Swal from "sweetalert2";

const FEEDBACK_TAGS = [
  "Delicious Food 😋",
  "Super Fast ⚡",
  "Friendly Staff 👨‍🍳",
  "Clean Ambience ✨",
  "Great Taste 🍲",
];

interface SessionOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    isVeg: boolean;
    imageUrl?: string;
    isCancelled?: boolean;
  }>;
  statusHistory: Array<{
    id: string;
    status: OrderStatus;
    note?: string | null;
    changedAt: string;
    orderId: string;
  }>;
  notifications?: Array<{
    id: string;
    title: string;
    body: string;
    isRead: boolean;
    sentAt: string;
    orderId?: string | null;
  }>;
}

interface SessionData {
  session: {
    id: string;
    sessionCode: string;
    isActive: boolean;
    billRequested?: boolean;
    billRequestedAt?: string | null;
    startedAt: string;
    closedAt?: string | null;
    hotel: OrderData["hotel"];
    table: OrderData["table"];
    orders: SessionOrder[];
  };
  combined: {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    itemCount: number;
    orderCount: number;
  };
  allItems: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    isVeg: boolean;
    orderNumber: string;
  }>;
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("session");
  const { clearSession } = useCart();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Customer bill settlement modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCompleteBillModal, setShowCompleteBillModal] = useState(false);
  const [showSuccessBillModal, setShowSuccessBillModal] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("UPI");
  const [settlingBill, setSettlingBill] = useState(false);

  // Optional feedback states during complete bill
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbHoverRating, setFbHoverRating] = useState<number | null>(null);
  const [fbTags, setFbTags] = useState<string[]>([]);
  const [fbComment, setFbComment] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if bill payment is completed across order / session (declared at top level)
  const isBillPaid = Boolean(
    order?.bill?.paymentStatus === "PAID" ||
    (sessionData as any)?.bill?.paymentStatus === "PAID" ||
    order?.status === OrderStatus.COMPLETED ||
    (sessionData?.session && sessionData.session.isActive === false) ||
    Boolean(sessionData?.session?.closedAt)
  );

  // When bill payment is completed, automatically clear active order from localStorage & CartContext
  useEffect(() => {
    if (isBillPaid) {
      clearSession();
      try {
        localStorage.removeItem("annapoorna_active_order");
        localStorage.removeItem("annapoorna_session_id");
        localStorage.removeItem("annapoorna_order_id");
      } catch { }
    }
  }, [isBillPaid, clearSession]);

  // Fetch initial order data with cache-busting to ensure fresh updates on refresh
  const fetchOrder = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      const res = await fetch(`/api/orders/${id}?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order not found");
      setOrder(data.order);

      if (data.sessionData) {
        setSessionData(data.sessionData);
      } else if (data.order?.sessionId) {
        await fetchSession(data.order.sessionId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load order";
      setError(msg);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  // Fetch session data if sessionId is available
  const fetchSession = async (sid?: string | number) => {
    const targetSessionId = sid ? String(sid) : sessionIdParam || order?.sessionId;
    if (!targetSessionId) return;
    try {
      const res = await fetch(`/api/sessions/${targetSessionId}?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSessionData(data);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Listen to mobile pull-to-refresh
  useEffect(() => {
    const handleRefresh = async () => {
      await fetchOrder(true);
    };
    window.addEventListener("app:refresh", handleRefresh);
    return () => window.removeEventListener("app:refresh", handleRefresh);
  }, [id]);

  // Re-fetch when tab becomes visible or user returns to browser
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrder();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [id]);

  // Smart polling fallback for reliable live updates on mobile
  useEffect(() => {
    if (order?.status === OrderStatus.COMPLETED || order?.status === OrderStatus.CANCELLED || isBillPaid) {
      return;
    }
    const timer = setInterval(() => {
      fetchOrder();
    }, 5000);
    return () => clearInterval(timer);
  }, [id, order?.status, isBillPaid]);

  // Connect to Server-Sent Events (SSE) for Real-Time Status Updates
  useEffect(() => {
    if (!id) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`/api/orders/${id}/events`);

      eventSource.addEventListener("open", () => {
        setIsLiveConnected(true);
      });

      eventSource.addEventListener("orderUpdate", (e: MessageEvent) => {
        try {
          const update = JSON.parse(e.data);
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: update.status as OrderStatus,
              statusHistory: [
                ...prev.statusHistory,
                {
                  id: `evt-${Date.now()}`,
                  orderId: prev.id,
                  status: update.status as OrderStatus,
                  note: update.note || `Status changed to ${update.status}`,
                  changedAt: update.timestamp,
                },
              ],
              notifications: update.note
                ? [
                  {
                    id: `notif-${Date.now()}`,
                    orderId: prev.id,
                    title: update.status === "CANCELLED" ? "Dish Unavailable" : "Order Update",
                    body: update.note,
                    isRead: false,
                    sentAt: update.timestamp,
                  },
                  ...(prev.notifications || []),
                ]
                : prev.notifications,
            };
          });
          // Refresh session data on status update
          fetchSession();
        } catch (err) {
          console.error("Error parsing order SSE event:", err);
        }
      });

      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch (err) {
      console.error("SSE connection error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [id]);

  // Customer requests to complete bill and proceed to counter (with optional skippable feedback)
  const handleRequestCompleteBill = async (feedbackData?: {
    rating: number;
    tags: string[];
    comment?: string;
  }) => {
    const targetSessionId = sessionData?.session?.id || order?.sessionId;
    if (!targetSessionId) return;

    try {
      setIsRequestingBill(true);

      // If feedback was provided (optional / skippable), submit it
      if (feedbackData && feedbackData.rating > 0) {
        try {
          await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hotelId: order?.hotelId,
              orderId: order?.id,
              orderNumber: activeTrackOrder.orderNumber,
              tableNumber: order?.table?.tableNumber,
              customerName: order?.customerName,
              customerPhone: order?.customerPhone,
              rating: feedbackData.rating,
              tags: feedbackData.tags.join(", "),
              comment: feedbackData.comment?.trim() || undefined,
            }),
          });
        } catch (fErr) {
          console.error("Feedback submit error:", fErr);
        }
      }

      const res = await fetch(`/api/sessions/${targetSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_bill",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete bill request.");
      }

      // Record in localStorage
      try {
        localStorage.setItem(`annapoorna_bill_requested_${targetSessionId}`, "true");
      } catch {
        // ignore
      }

      // Celebrate
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#12372A", "#C9A227", "#10B981"],
        });
      } catch {
        // ignore
      }

      setShowCompleteBillModal(false);
      setFeedbackSaved(Boolean(feedbackData && feedbackData.rating > 0));
      setShowSuccessBillModal(true);
      await fetchSession(targetSessionId);
      await fetchOrder();
    } catch (err: any) {
      Swal.fire({
        title: "Cannot Complete Bill",
        text: err.message || "All active dishes must be marked as Served before completing bill.",
        icon: "warning",
        confirmButtonText: "Okay",
        customClass: {
          popup: "hotel-swal-popup",
          title: "hotel-swal-title",
          htmlContainer: "hotel-swal-html",
          confirmButton: "hotel-swal-btn",
          actions: "hotel-swal-actions",
          closeButton: "hotel-swal-close",
        },
        buttonsStyling: false,
      });
    } finally {
      setIsRequestingBill(false);
    }
  };

  // Customer settles and completes bill
  const handleCustomerCloseBill = async () => {
    const targetSessionId = sessionData?.session?.id || order?.sessionId;
    if (!targetSessionId) return;

    try {
      setSettlingBill(true);
      const res = await fetch(`/api/sessions/${targetSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete bill.");
      }

      // Celebrate bill completion!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#12372A", "#C9A227", "#10B981"],
        });
      } catch {
        // ignore
      }

      // Clear local session storage
      try {
        localStorage.removeItem("annapoorna_session_id");
        localStorage.removeItem("annapoorna_active_order");
        localStorage.removeItem("annapoorna_order_id");
      } catch {
        // ignore
      }

      setShowPayModal(false);

      // Refresh order & session data to show completed state
      await fetchOrder();
      if (sessionData?.session?.id) {
        await fetchSession(sessionData.session.id);
      }

      // Redirect to digital invoice
      router.push(`/bill/${order?.id || id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to settle bill";
      alert(msg);
    } finally {
      setSettlingBill(false);
    }
  };

  if (loading) {
    return <OrderDetailSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C9A227]">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#171717]">Order Not Found</h2>
          <p className="text-xs text-[#6B7280] max-w-xs mx-auto">
            {error || "Could not retrieve details for this order. It may have been cleared or belongs to a completed dining session."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            onClick={() => {
              try {
                localStorage.removeItem("annapoorna_active_order");
              } catch { }
              router.push("/menu");
            }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#12372A] text-white text-xs font-bold hover:bg-[#0e2b21] transition shadow-xs cursor-pointer"
          >
            <span>Back to Menu / New Order</span>
          </button>
          <button
            onClick={() => fetchOrder(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-[#171717] text-xs font-bold hover:bg-black/5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const currency = order.hotel?.currency || "₹";
  const hasSession = !!sessionData && sessionData.combined.orderCount > 0;
  const sessionOrders = sessionData?.session?.orders || [];
  const isSessionActive = sessionData?.session?.isActive ?? (order.status !== OrderStatus.COMPLETED);
  const targetSessionId = sessionData?.session?.id || order.sessionId;
  const isBillRequested = Boolean(
    sessionData?.session?.billRequested ||
    (typeof window !== "undefined" && targetSessionId && localStorage.getItem(`annapoorna_bill_requested_${targetSessionId}`) === "true")
  );

  // Determine active order to display in stepper
  const activeTrackOrder =
    (selectedOrderId && sessionOrders.find((o) => o.id === selectedOrderId)) ||
    (order as unknown as SessionOrder);

  const isCancelled = activeTrackOrder.status === OrderStatus.CANCELLED;
  const isPending = activeTrackOrder.status === OrderStatus.PENDING;
  const isCompleted = activeTrackOrder.status === OrderStatus.COMPLETED || !isSessionActive;

  const isThisOrderCancelled = order.status === OrderStatus.CANCELLED;
  const displaySubtotal = hasSession
    ? sessionData!.combined.subtotal
    : isThisOrderCancelled
      ? 0
      : order.subtotal;
  const displayTaxAmount = hasSession
    ? sessionData!.combined.taxAmount
    : isThisOrderCancelled
      ? 0
      : order.taxAmount;
  const displayTotal = hasSession
    ? sessionData!.combined.totalAmount
    : isThisOrderCancelled
      ? 0
      : order.totalAmount;
  const orderCount = hasSession
    ? sessionData!.combined.orderCount
    : isThisOrderCancelled
      ? 0
      : 1;
  const totalItemCount = hasSession
    ? sessionOrders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce(
        (sum, o) =>
          sum +
          o.items
            .filter((i) => !i.isCancelled)
            .reduce((isum, i) => isum + i.quantity, 0),
        0
      )
    : isThisOrderCancelled
      ? 0
      : order.items
        .filter((i) => !i.isCancelled)
        .reduce((sum, i) => sum + i.quantity, 0);

  // Check if all non-cancelled orders in session/order have been marked as SERVED
  const validSessionOrders = sessionOrders.filter(
    (o) => o.status !== OrderStatus.CANCELLED
  );
  const isOrderFullyServed =
    hasSession && validSessionOrders.length > 0
      ? validSessionOrders.every(
        (o) =>
          o.status === OrderStatus.SERVED ||
          o.status === OrderStatus.COMPLETED
      )
      : order.status === OrderStatus.SERVED ||
      order.status === OrderStatus.COMPLETED;

  const handleCompleteBillClick = () => {
    if (!isOrderFullyServed) {
      Swal.fire({
        html: `
          <div style="text-align: center; padding: 6px 0 2px 0;">
            <!-- Clean Luxury Food Cloche Icon Badge -->
            <div style="width: 58px; height: 58px; margin: 0 auto 14px auto; border-radius: 20px; background: #FAF9F6; border: 1.5px solid rgba(201, 162, 39, 0.35); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <!-- Steam wisps -->
                <path d="M8.5 3c.4.8-.4 1.6 0 2.4" stroke="#C9A227" stroke-width="1.8" class="animate-steam-1"></path>
                <path d="M12 2c.4.8-.4 1.6 0 2.4" stroke="#C9A227" stroke-width="1.8" class="animate-steam-2"></path>
                <path d="M15.5 3c.4.8-.4 1.6 0 2.4" stroke="#C9A227" stroke-width="1.8" class="animate-steam-3"></path>
                <!-- Cloche Dome & Handle -->
                <circle cx="12" cy="7.5" r="1.3" fill="#C9A227"></circle>
                <path d="M4 17a8 8 0 0 1 16 0" stroke="#12372A" stroke-width="2"></path>
                <line x1="2.5" y1="18.5" x2="21.5" y2="18.5" stroke="#12372A" stroke-width="2"></line>
              </svg>
            </div>

            <!-- Status Pill -->
            <div style="margin-bottom: 10px;">
              <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 9999px; background: #FAF9F6; border: 1px solid rgba(201, 162, 39, 0.25); color: #12372A; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #C9A227; display: inline-block;"></span>
                Kitchen in Progress
              </span>
            </div>

            <!-- Title -->
            <h3 style="margin: 0 0 6px 0; font-size: 19px; font-weight: 900; color: #171717; letter-spacing: -0.02em;">
              Dishes Not Yet Served
            </h3>

            <!-- Message -->
            <p style="margin: 0 0 2px 0; font-size: 12.5px; color: #6B7280; line-height: 1.5; padding: 0 6px;">
              Please wait until all ordered dishes are delivered to your table before requesting your bill.
            </p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: "Okay, Got it",
        customClass: {
          popup: "hotel-swal-popup",
          htmlContainer: "hotel-swal-html",
          confirmButton: "hotel-swal-btn",
          actions: "hotel-swal-actions",
        },
        buttonsStyling: false,
      });
      return;
    }

    setShowCompleteBillModal(true);
  };

  // If bill payment is completed, DO NOT show the last order stepper or batches. Show clean payment completion view!
  if (isBillPaid) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-20 text-center space-y-6 animate-in fade-in duration-300">
        {/* Celebration / Success Badge */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-emerald-50 border-2 border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-sm">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2 max-w-md mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bill Payment Completed</span>
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Thank You for Dining With Us!
          </h1>

          <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
            Your bill for <strong className="text-[#12372A] font-bold">{order.table?.tableNumber || "your table"}</strong> has been settled and the dining session is now closed.
          </p>
        </div>

        {/* Compact Settled Summary Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/8 shadow-xs max-w-md mx-auto space-y-3 text-xs">
          <div className="flex justify-between items-center text-[#6B7280]">
            <span>Table & Session</span>
            <span className="font-bold text-[#171717]">
              {order.table?.tableNumber || "Table"} · {sessionData?.session?.sessionCode || order.orderNumber}
            </span>
          </div>

          <div className="flex justify-between items-center text-[#6B7280]">
            <span>Payment Status</span>
            <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px]">
              ✓ Paid in Full
            </span>
          </div>

          <div className="pt-2.5 border-t border-black/5 flex justify-between items-center text-base font-extrabold text-[#12372A]">
            <span>Total Amount Settled</span>
            <span>{currency}{displayTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Customer Feedback Card */}
        <div className="max-w-md mx-auto w-full">
          <CustomerFeedbackCard
            hotelId={order.hotelId}
            orderId={order.id}
            orderNumber={activeTrackOrder.orderNumber}
            tableNumber={order.table?.tableNumber}
          />
        </div>

        {/* Action CTAs: Receipt & New Order */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
          <Link
            href={`/bill/${order.id}`}
            className="w-full sm:w-auto flex-1 py-3.5 px-5 rounded-2xl bg-white hover:bg-stone-50 border border-black/15 text-[#12372A] font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-[#C9A227]" />
            <span>View Paid Bill Receipt</span>
          </Link>

          <Link
            href="/menu"
            onClick={() => clearSession()}
            className="w-full sm:w-auto flex-1 py-3.5 px-5 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Utensils className="w-4 h-4 text-[#C9A227]" />
            <span>New Order / Menu</span>
          </Link>
        </div>

        {/* Order History Link */}
        <div className="pt-2">
          <Link
            href="/history"
            className="text-xs font-bold text-[#6B7280] hover:text-[#12372A] transition underline underline-offset-4"
          >
            View Past Order History
          </Link>
        </div>
      </div>
    );
  }

  const menuLink = order.table?.qrCodeToken
    ? `/menu?hotel=${encodeURIComponent(order.hotel?.slug || "hotel-annapoorna")}&table=${encodeURIComponent(order.table.qrCodeToken)}`
    : "/menu";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 pb-32">
      {/* Top Navbar */}
      <div className="flex items-center justify-between pb-4 border-b border-black/8 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={menuLink}
            aria-label="Back to menu"
            className="w-10 h-10 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-[#12372A] hover:bg-stone-50 shadow-2xs transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
                Track Order
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#12372A] text-white text-[11px] font-black shadow-xs">
                {activeTrackOrder.orderNumber}
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] font-semibold flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[#12372A] font-bold">{order.table?.tableNumber || "Table 08"}</span>
              <span className="text-black/30">·</span>
              <span className="truncate">{order.hotel?.name || "Hotel Annapoorna"}</span>
              {sessionData?.session?.sessionCode && (
                <>
                  <span className="text-black/30">·</span>
                  <span className="text-[#C9A227] font-bold">{sessionData.session.sessionCode}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 1-Tap Refresh Button */}
          <button
            onClick={() => fetchOrder(true)}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-[#12372A] hover:bg-stone-50 shadow-2xs transition-all active:scale-90 cursor-pointer shrink-0"
            title="Refresh order status"
            aria-label="Refresh status"
          >
            <RotateCcw
              className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? "animate-spin text-[#C9A227]" : "text-[#12372A]"
                }`}
            />
          </button>

          <Link
            href={`/bill/${order.id}`}
            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-[#12372A] bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 rounded-2xl shadow-2xs hover:bg-amber-100 transition active:scale-95"
          >
            <Receipt className="w-4 h-4 text-[#C9A227]" />
            <span className="hidden sm:inline">View Bill</span>
            <span className="sm:hidden">Bill</span>
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-5">
        {/* PROMINENT LUXURY "WAY TO COUNTER" BANNER */}
        {isSessionActive && isBillRequested && (
          <div className="bg-gradient-to-br from-[#12372A] via-[#164535] to-[#0e2c21] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-[#C9A227]/35 relative overflow-hidden animate-in fade-in duration-300">
            {/* Ambient Top Gold Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9A227] to-transparent opacity-80" />
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#C9A227]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              {/* Left: 3D Counter Visual & Text */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-[#C9A227]/20 blur-md pointer-events-none" />
                  <img
                    src="/images/billing-counter-3d.gif"
                    alt="3D Billing Counter"
                    className="w-full h-full object-contain relative z-10 drop-shadow-md"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 text-[#FDE68A] text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-pulse" />
                    <span>Way to Counter</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                    Please Proceed to Billing Counter
                  </h3>
                  <p className="text-xs text-stone-200/90 leading-normal font-medium">
                    Your bill of <span className="text-[#C9A227] font-bold">{currency}{displayTotal.toFixed(2)}</span> is ready. Settle with Cash, UPI, or Card.
                  </p>
                </div>
              </div>

              {/* Right: Quick Action & Total Amount */}
              <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
                <div className="sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-300 block">Total Due</span>
                  <span className="text-xl sm:text-2xl font-black text-white">{currency}{displayTotal.toFixed(2)}</span>
                </div>
                <Link
                  href={`/bill/${order.id}`}
                  className="px-4 py-2 rounded-xl bg-[#C9A227] hover:bg-[#b8911f] active:scale-95 text-[#12372A] text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#12372A]" />
                  <span>View Bill</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#12372A]" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2. ORDER BATCHES SELECTOR TABS (IF MULTIPLE ORDERS IN SESSION) */}
        {hasSession && orderCount > 1 && (
          <div className="bg-white rounded-2xl p-3 border border-black/8 shadow-xs">
            <div className="text-xs font-bold text-[#6B7280] mb-2 px-1 flex items-center justify-between">
              <span>Ordered Batches in this Session:</span>
              <span className="text-[11px] text-[#12372A] font-extrabold">{orderCount} Batches Total</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {sessionOrders.map((sOrder, idx) => {
                const isSelected = (selectedOrderId || order.id) === sOrder.id;
                const isBatchServed = sOrder.status === OrderStatus.SERVED || sOrder.status === OrderStatus.COMPLETED;

                return (
                  <button
                    key={sOrder.id}
                    onClick={() => setSelectedOrderId(sOrder.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${isSelected
                      ? "bg-[#12372A] text-white shadow-xs"
                      : "bg-[#F7F5EF] text-[#171717] hover:bg-stone-200/70 border border-black/5"
                      }`}
                  >
                    <ShoppingBag className={`w-3.5 h-3.5 ${isSelected ? "text-[#C9A227]" : "text-[#6B7280]"}`} />
                    <span>Batch #{idx + 1} ({sOrder.orderNumber})</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isSelected
                        ? "bg-white/20 text-white"
                        : isBatchServed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                        }`}
                    >
                      {sOrder.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TWO-COLUMN LAYOUT: TRACKER ON LEFT, ALL ITEMS ON RIGHT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Active Order Stepper Tracker */}
          <div className="md:col-span-6 space-y-4">
            <PushNotificationPrompt
              orderNumber={activeTrackOrder.orderNumber}
              tableId={order.tableId}
              hotelId={order.hotelId}
              customerPhone={order.customerPhone}
            />

            <OrderStatusTracker
              order={{
                ...order,
                id: activeTrackOrder.id,
                orderNumber: activeTrackOrder.orderNumber,
                status: activeTrackOrder.status,
                statusHistory: (activeTrackOrder.statusHistory as any) || order.statusHistory,
                notifications: (activeTrackOrder.notifications as any) || order.notifications,
              }}
              isLiveConnected={isLiveConnected}
              isBillRequested={isBillRequested}
              isSessionActive={isSessionActive}
              isOrderFullyServed={isOrderFullyServed}
              onRequestCompleteBill={handleCompleteBillClick}
            />
          </div>

          {/* Right Column: ALL ITEMS ACROSS ALL SESSIONS */}
          <div className="md:col-span-6 space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/8 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <div>
                  <h4 className="font-extrabold text-sm text-[#171717]">
                    All Dishes Ordered ({totalItemCount})
                  </h4>
                  <p className="text-[11px] text-[#6B7280]">
                    Combined across {orderCount} {orderCount === 1 ? "order batch" : "order batches"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-[#12372A]">
                    {currency}{displayTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Grouped Batches List */}
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {(hasSession && sessionOrders.length > 0 ? sessionOrders : [order as unknown as SessionOrder]).map(
                  (bOrder, bIdx) => (
                    <div key={bOrder.id} className="bg-[#FAF9F6] p-4 rounded-2xl border border-black/5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-black/5">
                        <div className="flex items-center gap-1.5 font-bold text-[#171717]">
                          <ShoppingBag className="w-3.5 h-3.5 text-[#12372A]" />
                          <span>Batch #{bIdx + 1} ({bOrder.orderNumber})</span>
                          <span className="text-[10px] text-[#6B7280] font-normal">
                            {new Date(bOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${bOrder.status === OrderStatus.COMPLETED
                            ? "bg-emerald-100 text-emerald-800"
                            : bOrder.status === OrderStatus.CANCELLED
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-amber-100 text-amber-800"
                            }`}
                        >
                          {bOrder.status === OrderStatus.CANCELLED ? "Cancelled (Not Billed)" : bOrder.status}
                        </span>
                      </div>

                      {/* Items in this batch */}
                      <div className="space-y-2">
                        {bOrder.items.map((item) => {
                          const isItemCancelled =
                            item.isCancelled === true || bOrder.status === OrderStatus.CANCELLED;

                          return (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${isItemCancelled
                                    ? "bg-stone-300"
                                    : item.isVeg
                                      ? "bg-emerald-600"
                                      : "bg-red-600"
                                    }`}
                                />
                                <span
                                  className={`font-semibold truncate ${isItemCancelled
                                    ? "line-through text-[#6B7280]"
                                    : "text-[#171717]"
                                    }`}
                                >
                                  {item.productName}
                                </span>
                                <span className="text-[#6B7280] font-bold text-[11px]">
                                  × {item.quantity}
                                </span>
                                {item.isCancelled && bOrder.status !== OrderStatus.CANCELLED && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-100 text-red-800 border border-red-200 shrink-0">
                                    Unavailable (Removed · {currency}0)
                                  </span>
                                )}
                              </div>
                              {isItemCancelled ? (
                                <span className="font-bold text-[#6B7280] line-through shrink-0 ml-2">
                                  {currency}0.00
                                </span>
                              ) : (
                                <span className="font-extrabold text-[#171717] shrink-0 ml-2">
                                  {currency}{item.subtotal.toFixed(2)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-black/5 space-y-1.5 text-xs text-[#6B7280]">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-[#171717]">{currency}{displaySubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({order.taxRate}%)</span>
                  <span className="font-semibold text-[#171717]">{currency}{displayTaxAmount.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-black/5 flex justify-between text-base font-extrabold text-[#12372A]">
                  <span>Grand Total</span>
                  <span>{currency}{displayTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer Pay / Complete Bill Button */}
              {isSessionActive && !isBillRequested && (
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={menuLink}
                    className="flex-1 py-3.5 px-3 rounded-2xl bg-[#FAF9F6] hover:bg-stone-200/60 border border-black/8 text-[#12372A] font-extrabold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-95 text-center"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>Order More</span>
                  </Link>

                  <button
                    onClick={handleCompleteBillClick}
                    className="flex-1 py-3.5 px-3 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span>Complete Bill</span>
                  </button>
                </div>
              )}

              {isSessionActive && isBillRequested && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100/40 to-amber-50 border border-amber-300/80 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src="/images/billing-counter-3d.gif"
                      alt="Billing Counter"
                      className="w-8 h-8 object-contain drop-shadow-xs"
                    />
                    <span className="text-xs font-black text-[#12372A] uppercase tracking-wider">
                      Way to Counter
                    </span>
                  </div>
                  <p className="text-[11px] text-[#12372A]/85 font-medium">
                    Your bill of <span className="font-bold text-[#12372A]">{currency}{displayTotal.toFixed(2)}</span> is ready. Please settle at the counter.
                  </p>
                </div>
              )}

              {!isSessionActive && (
                <Link
                  href={`/bill/${order.id}`}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View Final Settled Bill</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COMPLETE BILL CONFIRMATION & OPTIONAL FEEDBACK MODAL */}
      {showCompleteBillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-black/10 space-y-4 animate-in zoom-in-95 duration-200 text-center relative max-h-[90vh] overflow-y-auto">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setShowCompleteBillModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-20 h-20 mx-auto flex items-center justify-center">
              <img
                src="/images/billing-counter-3d.gif"
                alt="3D Billing Counter"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-[#171717]">
                Complete Dining & Request Bill
              </h3>
              <p className="text-[11px] text-[#6B7280] mt-1 leading-snug">
                Your meals are served. Ready to complete dining and settle at the billing counter?
              </p>
            </div>

            {/* Bill Summary */}
            <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-black/5 text-xs text-left space-y-1.5">
              <div className="flex justify-between text-[#6B7280]">
                <span>Table & Session:</span>
                <span className="font-bold text-[#171717]">
                  {order.table?.tableNumber} ({sessionData?.session?.sessionCode || "Session"})
                </span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Dishes Served:</span>
                <span className="font-bold text-[#171717]">{totalItemCount} items</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-extrabold text-[#12372A] pt-1.5 border-t border-black/5">
                <span>Total to Pay:</span>
                <span>{currency}{displayTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* OPTIONAL & SKIPPABLE FEEDBACK SECTION */}
            <div className="pt-3 border-t border-black/8 text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black text-[#171717]">
                    Rate Your Experience
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[10px] font-bold">
                  Optional
                </span>
              </div>

              {/* 5-Star Rating */}
              <div className="flex items-center justify-center gap-1 py-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active =
                    (fbHoverRating !== null ? fbHoverRating : fbRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setFbHoverRating(star)}
                      onMouseLeave={() => setFbHoverRating(null)}
                      onClick={() => setFbRating(star)}
                      className="p-1 transition hover:scale-125 active:scale-95 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${active
                            ? "text-amber-400 fill-amber-400 drop-shadow-xs"
                            : "text-stone-300 fill-stone-100"
                          }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Rating Text */}
              <p className="text-center text-[10px] sm:text-[11px] font-bold text-amber-700">
                {fbRating === 5 && "Awesome & Delicious! ⭐"}
                {fbRating === 4 && "Very Good 😊"}
                {fbRating === 3 && "Good 🙂"}
                {fbRating === 2 && "Fair 😐"}
                {fbRating === 1 && "Needs Improvement 😕"}
                {fbRating === 0 && "Tap stars to rate"}
              </p>

              {/* Compliment Tags */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {FEEDBACK_TAGS.map((tag) => {
                  const isSelected = fbTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setFbTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${isSelected
                          ? "bg-[#12372A] text-white border-[#12372A] shadow-xs"
                          : "bg-[#FAF9F6] text-[#4B5563] border-stone-200 hover:bg-stone-100"
                        }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Optional Comment */}
              <textarea
                value={fbComment}
                onChange={(e) => setFbComment(e.target.value)}
                placeholder="Any compliments or suggestions for the chef? (Optional)"
                rows={2}
                className="w-full p-2.5 text-xs bg-[#FAF9F6] border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:bg-white resize-none text-[#171717]"
              />
            </div>

            {/* ACTION BUTTONS (SUBMIT WITH FEEDBACK OR SKIP) */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleRequestCompleteBill({
                    rating: fbRating || 5,
                    tags: fbTags,
                    comment: fbComment,
                  })
                }
                disabled={isRequestingBill}
                className="w-full py-3.5 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-xs font-black text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isRequestingBill ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                ) : (
                  <>
                    <span>Submit Feedback & Complete Bill</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
                  </>
                )}
              </button>

              {/* Skip Feedback button - NOT MANDATORY */}
              <button
                type="button"
                onClick={() => handleRequestCompleteBill()}
                disabled={isRequestingBill}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-98 text-xs font-bold text-stone-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Skip Feedback & Complete Bill</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCompleteBillModal(false)}
                className="w-full py-1 text-[11px] font-semibold text-stone-400 hover:text-stone-600 transition cursor-pointer"
              >
                Not Yet, Continue Dining
              </button>
            </div>
          </div>
        </div>
      )}



      {/* LUXURY SUCCESS MODAL: BILL REQUESTED */}
      {showSuccessBillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-white via-[#FAF9F6] to-[#F5F2EB] rounded-[32px] max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-emerald-500/20 text-center relative overflow-hidden animate-in zoom-in-95 duration-200 space-y-4">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#C9A227] to-emerald-600" />

            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 stroke-[2.5]" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider mb-2">
                <span>✓ Settle at Counter</span>
              </div>
              <h3 className="text-xl font-black text-[#171717] tracking-tight">
                Bill Requested Successfully!
              </h3>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                Your dining session bill has been finalized and notified to the cashier counter.
              </p>
            </div>

            {/* Amount Spotlight Box */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                Total Payable Amount
              </span>
              <p className="text-2xl sm:text-3xl font-black text-[#12372A] tracking-tight">
                {currency}{displayTotal.toFixed(2)}
              </p>
              <p className="text-[11px] font-medium text-stone-500">
                {order.table?.tableNumber || "Table"} · {totalItemCount} Dishes Served
              </p>
            </div>

            <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-200/80 text-xs text-emerald-950">
              <p className="font-bold">
                Please proceed to the billing counter
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                You can settle payment via Cash, UPI QR, or Card.
                {feedbackSaved && " Thank you for your feedback! ⭐"}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href={`/bill/${order.id}`}
                onClick={() => setShowSuccessBillModal(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-xs font-black text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-[#C9A227]" />
                <span>View Digital Bill Receipt</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C9A227]" />
              </Link>

              <button
                type="button"
                onClick={() => setShowSuccessBillModal(false)}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-98 text-xs font-bold text-stone-700 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER BILL SETTLEMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-black/5 pb-3">
              <div>
                <h3 className="text-lg font-black text-[#171717]">
                  Complete & Settle Bill
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {order.table?.tableNumber || "Table 08"} · Session {sessionData?.session?.sessionCode}
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-[#6B7280] hover:bg-stone-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-black/5 space-y-2 text-xs">
              <div className="flex justify-between text-[#6B7280]">
                <span>Total Batches</span>
                <span className="font-bold text-[#171717]">{orderCount} Orders</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Total Dishes</span>
                <span className="font-bold text-[#171717]">{totalItemCount} Items</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#171717]">{currency}{displaySubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>GST ({order.taxRate}%)</span>
                <span className="font-semibold text-[#171717]">{currency}{displayTaxAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-black/5 flex justify-between text-base font-extrabold text-[#12372A]">
                <span>Total Amount to Pay</span>
                <span>{currency}{displayTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">
                Select Payment Mode:
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("UPI")}
                  className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-1.5 ${paymentMethod === "UPI"
                    ? "border-[#12372A] bg-emerald-50/60 text-[#12372A]"
                    : "border-black/10 bg-white text-[#6B7280] hover:bg-stone-50"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <QrCode className="w-5 h-5 text-[#12372A]" />
                    {paymentMethod === "UPI" && <CheckCircle2 className="w-4 h-4 text-[#12372A]" />}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-[#171717]">UPI / QR</div>
                    <div className="text-[10px] text-[#6B7280]">GPay, PhonePe, Paytm</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-1.5 ${paymentMethod === "CASH"
                    ? "border-[#12372A] bg-emerald-50/60 text-[#12372A]"
                    : "border-black/10 bg-white text-[#6B7280] hover:bg-stone-50"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <Banknote className="w-5 h-5 text-[#12372A]" />
                    {paymentMethod === "CASH" && <CheckCircle2 className="w-4 h-4 text-[#12372A]" />}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-[#171717]">Cash</div>
                    <div className="text-[10px] text-[#6B7280]">Pay at Billing Counter</div>
                  </div>
                </button>
              </div>
            </div>

            {/* UPI QR preview if UPI selected */}
            {paymentMethod === "UPI" && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-1">
                <div className="text-xs font-bold text-[#12372A]">UPI ID: annapoorna@upi</div>
                <div className="text-[11px] text-[#6B7280]">
                  Scan QR at table or pay at counter via any UPI app.
                </div>
              </div>
            )}

            {/* Confirmation Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-black/10 text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCustomerCloseBill}
                disabled={settlingBill}
                className="flex-2 py-3 px-5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
                <span>
                  {settlingBill
                    ? "Completing Bill..."
                    : `Confirm & Pay ${currency}${displayTotal.toFixed(2)}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

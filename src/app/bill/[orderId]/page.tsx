"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { BillData, SessionData } from "@/types";
import BillCard from "@/components/BillCard";
import { OrderDetailSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/EmptyState";
import {
  ArrowLeft,
  CheckCircle2,
  Store,
} from "lucide-react";

export default function BillPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);

  const [bill, setBill] = useState<BillData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBill = async () => {
    try {
      const res = await fetch(`/api/bills/${orderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bill not found");
      setBill(data.bill);
      if (data.session) setSession(data.session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load bill";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [orderId]);

  if (loading) {
    return <OrderDetailSkeleton />;
  }

  if (error || !bill) {
    return (
      <ErrorState
        title="Bill Not Available"
        message={error || "Could not retrieve the digital bill invoice."}
        onRetry={fetchBill}
      />
    );
  }

  const isPending = bill.paymentStatus === "PENDING";
  const currency = bill.order?.hotel?.currency || "₹";

  return (
    <div className="flex-1 flex flex-col p-4 pb-20 space-y-4 max-w-xl mx-auto w-full">
      {/* Top Navigation */}
      <div className="flex items-center gap-3 pt-2 pb-1 no-print">
        <Link
          href={`/orders/${orderId}`}
          aria-label="Back"
          className="w-10 h-10 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-[#12372A] hover:bg-stone-50 shadow-2xs transition-all active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>

        <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
          Invoice
        </h1>
      </div>

      {/* Bill Card Component with Print / PDF Download */}
      <BillCard bill={bill} />

      {/* Customer Status Banner (View-Only, Payment Handled by Admin) */}
      <div className="no-print pt-2">
        {isPending ? (
          <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start sm:items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <span>Payment Pending · Total: {currency}{bill.grandTotal.toFixed(2)}</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Please proceed to the billing counter or inform staff at your table to complete payment. Only admin/cashier can settle bills.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-start sm:items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-extrabold text-emerald-950">
                Payment Completed · {currency}{bill.grandTotal.toFixed(2)}
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Settled via {bill.paymentMethod || "Billing Counter"} on{" "}
                {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "today"}. Thank you for visiting!
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

"use client";

import React from "react";
import { Bike, Utensils, ShoppingBag, ShieldCheck } from "lucide-react";

interface OrderSourceBadgeProps {
  source?: string;
  externalOrderId?: string | null;
  tableNumber?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  riderStatus?: string | null;
  otp?: string | null;
  compact?: boolean;
}

export default function OrderSourceBadge({
  source = "DINE_IN",
  externalOrderId,
  tableNumber,
  riderName,
  riderPhone,
  riderStatus,
  otp,
  compact = false,
}: OrderSourceBadgeProps) {
  const normSource = (source || "DINE_IN").toUpperCase();

  if (normSource === "SWIGGY") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-[#FC8019] text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            SWIGGY
            {externalOrderId && (
              <span className="font-mono text-[11px] opacity-90">
                #{externalOrderId}
              </span>
            )}
          </span>

          {otp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <ShieldCheck className="w-3 h-3 text-amber-600" />
              OTP: <span className="font-mono">{otp}</span>
            </span>
          )}
        </div>

        {!compact && (riderName || riderPhone) && (
          <div className="inline-flex items-center gap-1.5 text-xs text-stone-600 bg-orange-50/80 px-2 py-1 rounded-lg border border-orange-100">
            <Bike className="w-3.5 h-3.5 text-[#FC8019]" />
            <span className="font-semibold text-stone-800 truncate">
              {riderName || "Delivery Partner"}
            </span>
            {riderStatus && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-200 text-orange-900">
                {riderStatus}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (normSource === "ZOMATO") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-[#E23744] text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            ZOMATO
            {externalOrderId && (
              <span className="font-mono text-[11px] opacity-90">
                #{externalOrderId}
              </span>
            )}
          </span>

          {otp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
              <ShieldCheck className="w-3 h-3 text-red-600" />
              OTP: <span className="font-mono">{otp}</span>
            </span>
          )}
        </div>

        {!compact && (riderName || riderPhone) && (
          <div className="inline-flex items-center gap-1.5 text-xs text-stone-600 bg-red-50/80 px-2 py-1 rounded-lg border border-red-100">
            <Bike className="w-3.5 h-3.5 text-[#E23744]" />
            <span className="font-semibold text-stone-800 truncate">
              {riderName || "Valet Assigned"}
            </span>
            {riderStatus && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-200 text-red-900">
                {riderStatus}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (normSource === "TAKEAWAY") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
          TAKEAWAY PARCEL
        </span>
      </div>
    );
  }

  // DINE_IN default
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
        <Utensils className="w-3.5 h-3.5 text-emerald-700" />
        {tableNumber || "Dine-In Table"}
      </span>
    </div>
  );
}

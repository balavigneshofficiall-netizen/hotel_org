"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  Calendar,
  Receipt,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Clock,
  Sparkles,
  Utensils,
  Award,
} from "lucide-react";

interface CustomerDetailDrawerProps {
  customer: any | null;
  onClose: () => void;
  currency?: string;
}

export default function CustomerDetailDrawer({
  customer,
  onClose,
  currency = "₹",
}: CustomerDetailDrawerProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!customer) return null;

  const avgSpend =
    customer.ordersCount > 0 ? customer.totalSpent / customer.ordersCount : 0;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(customer.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Clean phone number for WhatsApp
  const cleanPhone = customer.phone.replace(/[^0-9]/g, "");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-[#E5E2D9] animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0E2B20] via-[#12372A] to-[#0A2118] text-white border-b border-[#C9A227]/30 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-[#E2B755] border-2 border-[#C9A227]/40 font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight truncate text-white">
                  {customer.name}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-300 mt-0.5">
                <span className="font-mono text-stone-200">{customer.phone}</span>
                <button
                  onClick={handleCopyPhone}
                  className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-stone-300 transition"
                  title="Copy Phone"
                >
                  {copiedPhone ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="p-3 bg-[#FAF9F6] border-b border-[#E5E2D9] flex items-center justify-between gap-2">
          <a
            href={`tel:${customer.phone}`}
            className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
          >
            <Phone className="w-3.5 h-3.5 text-[#12372A]" />
            <span>Call Customer</span>
          </a>

          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* Bento Stats Strip */}
        <div className="p-4 bg-[#FAF9F6] border-b border-[#E5E2D9] grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Total Spent
            </span>
            <span className="text-base font-black text-[#12372A] block mt-0.5">
              {currency}
              {customer.totalSpent.toFixed(0)}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Total Visits
            </span>
            <span className="text-base font-black text-stone-900 block mt-0.5">
              {customer.ordersCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Avg / Order
            </span>
            <span className="text-base font-black text-[#C9A227] block mt-0.5">
              {currency}
              {avgSpend.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#12372A]" />
              <span>Dining History ({customer.orders.length})</span>
            </h4>
            <span className="text-[11px] text-stone-500 font-medium">
              Last seated at {customer.lastTable}
            </span>
          </div>

          <div className="space-y-2.5">
            {customer.orders.map((o: any) => {
              const statusColors: Record<string, string> = {
                COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
                SERVED: "bg-blue-50 text-blue-800 border-blue-200",
                PREPARING: "bg-amber-50 text-amber-800 border-amber-200",
                CANCELLED: "bg-red-50 text-red-700 border-red-200",
              };

              return (
                <div
                  key={o.id}
                  className="p-3.5 bg-white rounded-2xl border border-[#E5E2D9] space-y-2 shadow-2xs hover:border-[#12372A]/30 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#171717]">
                        #{o.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
                        {o.tableNumber || "Table"}
                      </span>
                    </div>
                    <span className="font-black text-sm text-[#12372A]">
                      {currency}
                      {o.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      <span>{new Date(o.createdAt).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <span
                      className={`font-black text-[10px] uppercase px-2 py-0.5 rounded-md border ${
                        statusColors[o.status] || "bg-stone-50 text-stone-700 border-stone-200"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF9F6] border-t border-[#E5E2D9] text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] text-white text-xs font-black hover:from-[#0e2b21] hover:to-[#173e30] transition cursor-pointer shadow-xs border border-[#C9A227]/30"
          >
            Close Customer Profile
          </button>
        </div>
      </div>
    </div>
  );
}

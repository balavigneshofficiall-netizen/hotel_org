import React from "react";
import { Utensils, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = "No dishes found",
  description = "Try adjusting your search or category filter to discover more chef specials.",
  actionText = "Clear Search",
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-12 px-6 text-center space-y-3">
      <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#C9A227]">
        <Utensils className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-base text-[#171717]">{title}</h3>
      <p className="text-xs text-[#6B7280] max-w-xs mx-auto leading-relaxed">
        {description}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#12372A] text-white text-xs font-semibold shadow-xs hover:bg-[#0e2b21] transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Unable to load restaurant menu",
  message = "Please check your network connection or verify the table QR code.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-[#171717]">{title}</h2>
        <p className="text-xs text-[#6B7280] max-w-xs mx-auto">{message}</p>
      </div>
      <div className="flex gap-2">
        {onRetry ? (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#12372A] text-white text-xs font-bold hover:bg-[#0e2b21] transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        ) : (
          <Link
            href="/menu?hotel=hotel-annapoorna&table=tbl_annapoorna_08"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#12372A] text-white text-xs font-bold hover:bg-[#0e2b21] transition shadow-xs"
          >
            <span>Scan Demo Table</span>
          </Link>
        )}
      </div>
    </div>
  );
}

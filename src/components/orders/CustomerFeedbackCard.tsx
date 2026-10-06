"use client";

import React, { useState, useEffect } from "react";
import { Star, Check, Loader2, X } from "lucide-react";

interface CustomerFeedbackCardProps {
  hotelId: number | string;
  orderId?: number | string;
  orderNumber?: string;
  tableNumber?: string;
}

const QUICK_TAGS = [
  "Delicious Food",
  "Quick Service",
  "Good Ambience",
  "Friendly Staff",
];

export default function CustomerFeedbackCard({
  hotelId,
  orderId,
  orderNumber,
  tableNumber,
}: CustomerFeedbackCardProps) {
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Check if previously skipped/submitted for this order
  const storageKey = `feedback_dismissed_${orderNumber || tableNumber || hotelId}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem(storageKey);
      if (isDismissed) {
        setSkipped(true);
      }
    }
  }, [storageKey]);

  const handleSkip = () => {
    setSkipped(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, "skipped");
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          orderId,
          orderNumber,
          tableNumber,
          rating,
          tags: selectedTags.join(", "),
          comment: comment.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(storageKey, "submitted");
        }
        // Auto-collapse after 2.5 seconds
        setTimeout(() => {
          setSkipped(true);
        }, 2500);
      }
    } catch (err) {
      console.error("Feedback submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // If skipped or closed, hide completely
  if (skipped) return null;

  // After successful submission
  if (submitted) {
    return (
      <div className="w-full p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-center animate-in fade-in duration-200">
        <div className="flex items-center justify-center gap-2 text-emerald-800 font-extrabold text-sm">
          <Check className="w-4 h-4 stroke-[3] text-emerald-600" />
          <span>Thank you for your feedback!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-5 rounded-3xl bg-white border border-[#E5E2D9] shadow-xs text-left space-y-4 animate-in fade-in duration-200 relative">
      {/* Header & Skip Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-[#171717] tracking-tight">
          Rate Your Experience
        </h3>
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-bold text-[#6B7280] hover:text-[#171717] px-2.5 py-1 rounded-lg hover:bg-stone-100 transition cursor-pointer flex items-center gap-1"
        >
          <span>Skip</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5-Star Rating Selector */}
      <div className="flex items-center gap-2 pt-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-1.5 rounded-xl hover:bg-amber-50 transition active:scale-90 cursor-pointer"
            aria-label={`${star} star rating`}
          >
            <Star
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                star <= rating
                  ? "fill-[#C9A227] text-[#C9A227]"
                  : "text-stone-300 hover:text-amber-300"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Quick Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleToggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                isSelected
                  ? "bg-[#12372A] text-white shadow-2xs"
                  : "bg-[#FAF9F6] text-[#4B5563] border border-[#E5E2D9] hover:bg-stone-100"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Optional short 1-line note */}
      <div>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any quick suggestions? (optional)"
          className="w-full px-3.5 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:border-[#12372A] focus:bg-white transition"
          maxLength={150}
        />
      </div>

      {/* Actions: Submit & Skip */}
      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:text-[#171717] transition cursor-pointer"
        >
          Skip
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
          ) : (
            <Check className="w-3.5 h-3.5 text-[#C9A227]" />
          )}
          <span>Submit Feedback</span>
        </button>
      </div>
    </div>
  );
}

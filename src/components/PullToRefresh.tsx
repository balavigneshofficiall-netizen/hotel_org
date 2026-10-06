"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RotateCcw, Loader2, Check, ArrowDown } from "lucide-react";

interface PullToRefreshProps {
  children?: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
}

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(false);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  onRefreshRef.current = onRefresh;

  const THRESHOLD = 52; // Pull distance in px to trigger refresh
  const MAX_PULL = 90; // Maximum visual pull distance

  // Disable on admin and kitchen pages
  const isAdminOrKitchen = pathname?.startsWith("/admin") || pathname?.startsWith("/kitchen");

  const getScrollTop = () => {
    if (typeof window === "undefined") return 0;
    return (
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isAdminOrKitchen || isRefreshingRef.current) return;
    const st = getScrollTop();
    if (st <= 4) {
      isAtTop.current = true;
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
    } else {
      isAtTop.current = false;
    }
  }, [isAdminOrKitchen]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isAdminOrKitchen || isRefreshingRef.current) return;

    const st = getScrollTop();
    if (st > 6) {
      isAtTop.current = false;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    if (!isAtTop.current && st <= 4) {
      isAtTop.current = true;
      startY.current = e.touches[0].clientY;
    }

    if (!isAtTop.current) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // User is dragging downwards while at top
      const damping = Math.min(MAX_PULL, Math.pow(diff, 0.82));
      const prevDist = pullDistanceRef.current;
      pullDistanceRef.current = damping;
      setPullDistance(damping);
      setIsPulling(true);

      // Light haptic tap when crossing the threshold
      if (damping >= THRESHOLD && prevDist < THRESHOLD) {
        try {
          if (navigator.vibrate) navigator.vibrate(12);
        } catch {}
      }

      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isAdminOrKitchen]);

  const handleTouchEnd = useCallback(async () => {
    if (isAdminOrKitchen || !isAtTop.current || isRefreshingRef.current) return;

    const currentDist = pullDistanceRef.current;

    if (currentDist >= THRESHOLD) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      setIsPulling(false);
      setPullDistance(55);

      try {
        window.dispatchEvent(new CustomEvent("app:refresh"));

        if (onRefreshRef.current) {
          await onRefreshRef.current();
        }

        router.refresh();

        await new Promise((resolve) => setTimeout(resolve, 600));

        setIsSuccess(true);
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (err) {
        console.error("Pull to refresh error:", err);
      } finally {
        setIsSuccess(false);
        setIsRefreshing(false);
        isRefreshingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    } else {
      setIsPulling(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }

    isAtTop.current = false;
  }, [isAdminOrKitchen, router]);

  useEffect(() => {
    if (isAdminOrKitchen) return;

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isAdminOrKitchen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // If admin or kitchen, simply render children with zero overhead
  if (isAdminOrKitchen) {
    return <>{children}</>;
  }

  const rotation = Math.min(180, (pullDistance / THRESHOLD) * 180);
  const isReady = pullDistance >= THRESHOLD;

  return (
    <>
      {/* Floating Pull-to-Refresh Pill Indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none flex justify-center no-print"
        style={{
          transform: `translateY(${
            isRefreshing || isSuccess
              ? "16px"
              : pullDistance > 0
              ? `${Math.max(-56, pullDistance - 56)}px`
              : "-60px"
          })`,
          transition: isPulling ? "none" : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s",
          opacity: pullDistance > 8 || isRefreshing || isSuccess ? 1 : 0,
        }}
      >
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md text-xs font-black transition-all ${
            isSuccess
              ? "bg-emerald-600 text-white border-emerald-500 scale-102"
              : isRefreshing
              ? "bg-[#12372A] text-white border-[#12372A]/30 shadow-emerald-950/20"
              : isReady
              ? "bg-[#12372A] text-[#C9A227] border-[#C9A227]/40 shadow-md scale-105"
              : "bg-white/95 text-[#171717] border-black/10"
          }`}
        >
          {isSuccess ? (
            <>
              <Check className="w-4 h-4 text-white stroke-[3] animate-in zoom-in-50" />
              <span>Updated!</span>
            </>
          ) : isRefreshing ? (
            <>
              <Loader2 className="w-4 h-4 text-[#C9A227] animate-spin" />
              <span className="tracking-tight">Refreshing...</span>
            </>
          ) : isReady ? (
            <>
              <RotateCcw
                className="w-4 h-4 text-[#C9A227] transition-transform duration-200"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <span className="tracking-tight">Release to refresh</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-4 h-4 text-[#6B7280] transition-transform duration-150"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <span className="text-[#6B7280] font-bold">Pull to refresh</span>
            </>
          )}
        </div>
      </div>

      {/* Main page content without disruptive transform container */}
      {children}
    </>
  );
}

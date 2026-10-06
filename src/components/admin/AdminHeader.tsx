"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  Volume2,
  VolumeX,
  Menu,
  ChevronDown,
  X,
  LogOut,
  ShieldCheck,
  Building2,
} from "lucide-react";

export interface AdminUser {
  id: number | string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  hotel?: {
    id: number | string;
    name: string;
    slug: string;
    currency?: string;
  };
}

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
  isLiveConnected: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  recentNotifications?: {
    id: string;
    title: string;
    desc: string;
    time: string;
    type: "new" | "ready" | "alert";
  }[];
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  currentUser?: AdminUser | null;
  onLogout?: () => void;
}

export default function AdminHeader({
  onOpenMobileMenu,
  isLiveConnected,
  soundEnabled,
  setSoundEnabled,
  recentNotifications = [],
  searchQuery,
  setSearchQuery,
  currentUser,
  onLogout,
}: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    window.location.href = "/admin/login";
  };

  const handleSearchChange = (val: string) => {
    if (setSearchQuery) {
      setSearchQuery(val);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("admin:search", { detail: val }));
    }
  };

  // Strictly first letter only (e.g. 'Vignesh' -> 'V')
  const userFirstLetter = currentUser?.name?.trim()
    ? currentUser.name.trim().charAt(0).toUpperCase()
    : "A";

  return (
    <header className="h-16 bg-white border-b border-[#EAE6DF] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Left: Mobile hamburger menu toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-stone-800 bg-stone-100 hover:bg-stone-200 active:scale-95 border border-stone-200/80 transition shrink-0 cursor-pointer shadow-2xs flex items-center justify-center"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5 text-stone-800" />
        </button>
        <span className="md:hidden font-black text-xs text-stone-900 tracking-tight truncate max-w-[130px]">
          {currentUser?.hotel?.name || "Annapoorna"}
        </span>
      </div>

      {/* Right: Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
        {/* Notification Sound ON/OFF Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-300 active:scale-95 cursor-pointer select-none ${
            soundEnabled
              ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs"
              : "bg-[#F5F3EF] hover:bg-stone-200/60 border-[#E5E2D9] text-[#6B7280]"
          }`}
          title={
            soundEnabled
              ? "Notification sound is ON — click to mute"
              : "Notification sound is OFF — click to enable"
          }
          aria-label="Toggle notification sound"
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
              soundEnabled
                ? "bg-emerald-600 text-white"
                : "bg-stone-200 text-stone-500"
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-3 h-3" />
            ) : (
              <VolumeX className="w-3 h-3" />
            )}
          </div>
          <span
            className={`hidden sm:inline text-[11px] font-bold ${
              soundEnabled ? "text-emerald-900" : "text-stone-600"
            }`}
          >
            {soundEnabled ? "Sound ON" : "Sound OFF"}
          </span>
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative p-2 rounded-full border border-[#E5E2D9] bg-[#F5F3EF] hover:bg-[#EFECE5] text-[#171717] transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-stone-600" />
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#D4AF37] text-black text-[10px] font-black flex items-center justify-center shadow-xs">
              {recentNotifications.length > 0 ? recentNotifications.length : "5"}
            </span>
          </button>

          {/* Notification Menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E5E2D9] overflow-hidden z-50 animate-in fade-in zoom-in-95">
              <div className="p-3.5 bg-[#FAF9F6] border-b border-[#E5E2D9] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#171717]">
                  <Bell className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Activity & Notifications</span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-6 h-6 rounded-lg hover:bg-black/5 flex items-center justify-center text-[#6B7280]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-[#6B7280]">
                  <Bell className="w-6 h-6 mx-auto text-stone-300 mb-2" />
                  <p className="text-xs font-bold text-[#171717]">No new notifications</p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">Real-time table updates will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-black/5 max-h-80 overflow-y-auto">
                  {Array.from(
                    new Map(recentNotifications.map((n) => [n.id, n])).values()
                  ).map((n) => (
                    <div key={n.id} className="p-3 hover:bg-[#F7F5EF] transition flex items-start gap-3 text-xs">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-[#12372A] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {n.type === "new" ? "🛎" : "✓"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#171717]">{n.title}</h4>
                        <p className="text-[#6B7280] text-[11px] leading-snug">{n.desc}</p>
                        <span className="text-[10px] text-[#C9A227] font-semibold mt-1 block">
                          {n.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-2.5 bg-[#FAF9F6] border-t border-[#E5E2D9] text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-bold text-[#12372A] hover:underline"
                >
                  Close notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hotel Selector Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F5F3EF] border border-[#E5E2D9] text-xs font-semibold text-slate-800 select-none">
          <Building2 className="w-3.5 h-3.5 text-stone-500" />
          <span>{currentUser?.hotel?.name || "Hotel Annapoorna"}</span>
          <ChevronDown className="w-3 h-3 text-stone-400" />
        </div>

        {/* Admin Avatar & Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-stone-100 transition focus:outline-none"
            title="Admin account & sign out"
          >
            {/* Avatar matching screenshot */}
            <div className="w-9 h-9 rounded-full bg-[#0D382B] text-white font-black flex items-center justify-center text-sm shadow-xs ring-2 ring-emerald-600/20 shrink-0">
              {userFirstLetter}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                {currentUser?.name || "Vignesh (General Manager)"}
              </p>
              <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider leading-none mt-0.5 truncate max-w-[140px]">
                {currentUser?.role || "ADMIN"}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-stone-400 hidden md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E5E2D9] overflow-hidden z-50 animate-in fade-in zoom-in-95">
              <div className="p-4 bg-[#FAF9F6] border-b border-[#E5E2D9]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#C9A227] font-black flex items-center justify-center text-base shadow-xs ring-2 ring-[#C9A227]/20 shrink-0">
                    {userFirstLetter}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#171717] truncate">
                      {currentUser?.name || "Admin"}
                    </p>
                    <p className="text-[11px] text-[#6B7280] truncate">
                      {currentUser?.email || "admin@hotelannapoorna.com"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#12372A] text-[#C9A227] font-bold text-[9px] tracking-wider uppercase">
                        <ShieldCheck className="w-2.5 h-2.5 text-[#C9A227]" />
                        {currentUser?.role || "ADMIN"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hotel and Session rows removed as requested */}

              <div className="p-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoggingOut ? "Signing Out..." : "Sign Out of Admin"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

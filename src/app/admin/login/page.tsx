"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please verify your credentials.");
      }

      // Successful login! Redirect to intended page or dashboard
      const params = new URLSearchParams(window.location.search);
      const target = params.get("from") || "/admin/dashboard";
      window.location.href = target;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error signing in";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail("admin@hotelannapoorna.com");
    setPassword("admin123");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B241B] via-[#12372A] to-[#071711] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle luxury ambient glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Crest */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-[#C9A227] text-black font-black text-2xl flex items-center justify-center mx-auto shadow-xl border-2 border-white/20">
            A
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Hotel Annapoorna
            </h1>
            <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
              Management & Operations Portal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 space-y-5">
          <div>
            <h2 className="text-lg font-black text-[#171717]">
              Admin Sign In
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Enter your authorized staff credentials to continue
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#171717] block">
                Official Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hotelannapoorna.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#F7F5EF] border border-[#E5E2D9] rounded-2xl text-xs sm:text-sm text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#171717] block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 bg-[#F7F5EF] border border-[#E5E2D9] rounded-2xl text-xs sm:text-sm text-[#171717] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:border-[#12372A] transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#171717]"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-[#C9A227]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Helper for 3 Roles */}
          <div className="pt-3 border-t border-[#E5E2D9] space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#12372A]">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Quick Fill Seeded Roles:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail("superadmin@hotelannapoorna.com");
                  setPassword("super123");
                  setError("");
                }}
                className="py-1.5 px-2 rounded-xl bg-[#FAF9F6] border border-[#C9A227]/40 hover:bg-[#C9A227]/10 text-[10px] font-bold text-[#8c6f14] transition text-center"
              >
                👑 Super Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@hotelannapoorna.com");
                  setPassword("admin123");
                  setError("");
                }}
                className="py-1.5 px-2 rounded-xl bg-[#FAF9F6] border border-emerald-300 hover:bg-emerald-50 text-[10px] font-bold text-[#12372A] transition text-center"
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("staff@hotelannapoorna.com");
                  setPassword("staff123");
                  setError("");
                }}
                className="py-1.5 px-2 rounded-xl bg-[#FAF9F6] border border-amber-300 hover:bg-amber-50 text-[10px] font-bold text-amber-900 transition text-center"
              >
                👤 Staff
              </button>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-white/60">
          <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
          <span>Encrypted Session · Restricted to Authorized Staff</span>
        </div>
      </div>
    </div>
  );
}

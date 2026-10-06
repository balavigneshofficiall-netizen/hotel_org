"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Store,
  Check,
  Loader2,
  Receipt,
  Volume2,
  Play,
  BellRing,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Percent,
  Coins,
  Shield,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Info,
  Layers,
  HelpCircle,
  RotateCcw,
  Save,
  MessageSquare,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import {
  NOTIFICATION_SOUNDS,
  NotificationSoundTone,
  playNotificationTone,
  triggerBrowserWebNotification,
  requestWebNotificationPermission,
} from "@/lib/audioNotification";

type SettingsTab = "all" | "profile" | "billing" | "whatsapp" | "sounds";

export default function SettingsPage() {
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("all");

  // Form fields
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMode, setWhatsappMode] = useState<"PAID" | "DISABLED">("PAID");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
  const [whatsappBusinessId, setWhatsappBusinessId] = useState("");
  const [email, setEmail] = useState("");
  const [taxRate, setTaxRate] = useState("5.0");
  const [currency, setCurrency] = useState("₹");
  const [primaryColor, setPrimaryColor] = useState("#12372A");
  const [accentColor, setAccentColor] = useState("#C9A227");

  // Initial values tracker for unsaved changes detection
  const [initialData, setInitialData] = useState<any>(null);

  // Notification Sound & Web Push
  const [notificationSound, setNotificationSound] = useState<NotificationSoundTone>("chime");
  const [playingTone, setPlayingTone] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("default");

  // Test WhatsApp
  const [testPhone, setTestPhone] = useState("");
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string; waLink?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setBrowserPermission(Notification.permission);
      } else {
        setBrowserPermission("unsupported");
      }
      const cachedSound = localStorage.getItem("admin_notification_sound") as NotificationSoundTone;
      if (cachedSound) {
        setNotificationSound(cachedSound);
      }
    }

    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (res.ok && data.hotel) {
          const h = data.hotel;
          setHotel(h);
          setName(h.name || "Hotel Annapoorna");
          setTagline(h.tagline || "Authentic South Indian & Mughlai Delicacies");
          setAddress(h.address || "No. 42, Cross Cut Road, Gandhipuram, Coimbatore - 641012");
          setPhone(h.phone || "+91 422 223 4567");
          setWhatsappNumber(h.whatsappNumber || "");
          setWhatsappMode(h.whatsappMode === "DISABLED" ? "DISABLED" : "PAID");
          setWhatsappPhoneId(h.whatsappPhoneId || "");
          setWhatsappAccessToken(h.whatsappAccessToken || "");
          setWhatsappBusinessId(h.whatsappBusinessId || "");
          setEmail(h.email || "manager@hotelannapoorna.in");
          setTaxRate(String(h.taxRate || "5.0"));
          setCurrency(h.currency || "₹");
          setPrimaryColor(h.primaryColor || "#12372A");
          setAccentColor(h.accentColor || "#C9A227");

          const sound = (h.notificationSound as NotificationSoundTone) || "chime";
          if (h.notificationSound) {
            setNotificationSound(sound);
            if (typeof window !== "undefined") {
              localStorage.setItem("admin_notification_sound", h.notificationSound);
            }
          }

          setInitialData({
            name: h.name || "Hotel Annapoorna",
            tagline: h.tagline || "Authentic South Indian & Mughlai Delicacies",
            address: h.address || "No. 42, Cross Cut Road, Gandhipuram, Coimbatore - 641012",
            phone: h.phone || "+91 422 223 4567",
            whatsappNumber: h.whatsappNumber || "",
            whatsappMode: h.whatsappMode === "DISABLED" ? "DISABLED" : "PAID",
            whatsappPhoneId: h.whatsappPhoneId || "",
            whatsappAccessToken: h.whatsappAccessToken || "",
            whatsappBusinessId: h.whatsappBusinessId || "",
            email: h.email || "manager@hotelannapoorna.in",
            taxRate: String(h.taxRate || "5.0"),
            currency: h.currency || "₹",
            primaryColor: h.primaryColor || "#12372A",
            accentColor: h.accentColor || "#C9A227",
            notificationSound: sound,
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    return (
      name !== initialData.name ||
      tagline !== initialData.tagline ||
      address !== initialData.address ||
      phone !== initialData.phone ||
      whatsappNumber !== initialData.whatsappNumber ||
      whatsappMode !== initialData.whatsappMode ||
      whatsappPhoneId !== initialData.whatsappPhoneId ||
      whatsappAccessToken !== initialData.whatsappAccessToken ||
      whatsappBusinessId !== initialData.whatsappBusinessId ||
      email !== initialData.email ||
      taxRate !== initialData.taxRate ||
      currency !== initialData.currency ||
      primaryColor !== initialData.primaryColor ||
      accentColor !== initialData.accentColor ||
      notificationSound !== initialData.notificationSound
    );
  }, [
    initialData,
    name,
    tagline,
    address,
    phone,
    whatsappNumber,
    whatsappMode,
    whatsappPhoneId,
    whatsappAccessToken,
    whatsappBusinessId,
    email,
    taxRate,
    currency,
    primaryColor,
    accentColor,
    notificationSound,
  ]);

  const handleReset = () => {
    if (!initialData) return;
    setName(initialData.name);
    setTagline(initialData.tagline);
    setAddress(initialData.address);
    setPhone(initialData.phone);
    setWhatsappNumber(initialData.whatsappNumber);
    setWhatsappMode(initialData.whatsappMode);
    setWhatsappPhoneId(initialData.whatsappPhoneId);
    setWhatsappAccessToken(initialData.whatsappAccessToken);
    setWhatsappBusinessId(initialData.whatsappBusinessId);
    setEmail(initialData.email);
    setTaxRate(initialData.taxRate);
    setCurrency(initialData.currency);
    setPrimaryColor(initialData.primaryColor);
    setAccentColor(initialData.accentColor);
    setNotificationSound(initialData.notificationSound);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hotel?.id) return;

    try {
      setSaving(true);
      setSavedSuccess(false);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: hotel.id,
          name,
          tagline,
          address,
          phone,
          whatsappNumber,
          whatsappMode,
          whatsappPhoneId,
          whatsappAccessToken,
          whatsappBusinessId,
          email,
          taxRate: Number(taxRate),
          currency,
          primaryColor,
          accentColor,
          notificationSound,
        }),
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_notification_sound", notificationSound);
        }
        setInitialData({
          name,
          tagline,
          address,
          phone,
          whatsappNumber,
          whatsappMode,
          whatsappPhoneId,
          whatsappAccessToken,
          whatsappBusinessId,
          email,
          taxRate,
          currency,
          primaryColor,
          accentColor,
          notificationSound,
        });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewTone = (toneId: NotificationSoundTone) => {
    setPlayingTone(toneId);
    playNotificationTone(toneId);
    const durationMs = toneId === "longring" || toneId === "harp" ? 2200 : 1300;
    setTimeout(() => {
      setPlayingTone((curr) => (curr === toneId ? null : curr));
    }, durationMs);
  };

  const handleSelectSound = (toneId: NotificationSoundTone) => {
    setNotificationSound(toneId);
    handlePreviewTone(toneId);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_notification_sound", toneId);
    }
  };

  const handleRequestBrowserPermission = async () => {
    const res = await requestWebNotificationPermission();
    setBrowserPermission(res);
    if (res === "granted") {
      triggerBrowserWebNotification({
        title: "🎉 Browser Notifications Active!",
        body: "You will now receive instant desktop alerts whenever a new order is placed.",
        url: "/admin/orders",
      });
    }
  };

  const handleTestBrowserAlert = () => {
    playNotificationTone(notificationSound);
    triggerBrowserWebNotification({
      title: "🔔 New Order #999 Received!",
      body: "Table 5 - 2x Paneer Butter Masala, 3x Butter Naan (₹680)",
      url: "/admin/orders",
    });
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone.trim()) {
      alert("Please enter a phone number to test.");
      return;
    }
    if (whatsappMode === "DISABLED") {
      alert("WhatsApp notifications are currently Disabled. Switch to 'Automated Meta API' to send test messages.");
      return;
    }
    try {
      setTestingWhatsApp(true);
      setTestResult(null);
      const res = await fetch("/api/admin/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testPhone: testPhone.trim(),
          hotelId: hotel?.id,
          whatsappPhoneId,
          whatsappAccessToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Test failed");
      }
      setTestResult({
        success: true,
        msg: data.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResult({ success: false, msg });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  // Tax simulation calculation for demonstration
  const sampleTaxCalculation = useMemo(() => {
    const rate = parseFloat(taxRate) || 0;
    const base = 1000;
    const tax = (base * rate) / 100;
    return {
      base,
      tax: tax.toFixed(2),
      total: (base + tax).toFixed(2),
    };
  }, [taxRate]);

  if (loading) {
    return (
      <div className="space-y-6 w-full animate-pulse py-6">
        <div className="h-14 bg-stone-200/70 rounded-2xl w-2/3" />
        <div className="h-10 bg-stone-200/50 rounded-xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-stone-200/60 rounded-3xl" />
          <div className="h-72 bg-stone-200/60 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 w-full pb-24">
      {/* 1. Header with Breadcrumb & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#171717] tracking-tight">
            Hotel &amp; System Settings
          </h1>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !hasChanges}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer ${
              hasChanges
                ? "bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white shadow-emerald-950/10"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
            ) : savedSuccess ? (
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            ) : (
              <Save className="w-4 h-4 text-[#C9A227]" />
            )}
            <span>{savedSuccess ? "Saved!" : saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* 2. Modern Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-stone-200 scrollbar-none">
        {[
          { id: "all", label: "All Settings", icon: Layers },
          { id: "profile", label: "Hotel Profile", icon: Store },
          { id: "billing", label: "Taxes & Currency", icon: Receipt },
          { id: "whatsapp", label: "WhatsApp Engine", icon: Smartphone },
          { id: "sounds", label: "Audio & Web Push", icon: Volume2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#12372A] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#171717] hover:bg-stone-100"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C9A227]" : "text-stone-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-8 w-full">
        {/* ========================================================================= */}
        {/* ROW 1: SECTION 1 (RESTAURANT PROFILE) */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "profile") && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E2D9] shadow-xs space-y-6 w-full">
            <div className="flex items-center gap-3 border-b border-[#E5E2D9] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#12372A]/10 text-[#12372A] flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="font-black text-lg text-[#171717]">
                1. Restaurant Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-stone-400" />
                  <span>Name</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] font-semibold focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs"
                  placeholder="e.g. Hotel Annapoorna"
                  required
                />
              </div>

              {/* Slogan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                  <span>Slogan</span>
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs"
                  placeholder="e.g. Authentic South Indian Delicacies"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Phone</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] font-mono focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs"
                  placeholder="+91 422 223 4567"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs"
                  placeholder="manager@hotelannapoorna.in"
                />
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Number</span>
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 919876543210 (digits with country code)"
                  className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] font-mono focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2 lg:col-span-1 space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>Address</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs"
                  placeholder="No. 42, Cross Cut Road, Gandhipuram, Coimbatore - 641012"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 2: SECTION 2 (TAXES & CURRENCY) */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "billing") && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E2D9] shadow-xs space-y-6 w-full">
            <div className="flex items-center gap-3 border-b border-[#E5E2D9] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <h2 className="font-black text-lg text-[#171717]">
                2. Taxes, Currency &amp; Billing Calculation
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* GST Tax Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-stone-400" />
                  <span>Restaurant GST / Tax Rate (%)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] font-semibold focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400">%</span>
                </div>
              </div>

              {/* Currency Symbol */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-stone-400" />
                  <span>Currency Symbol</span>
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717] font-black focus:outline-none focus:border-[#12372A] focus:ring-2 focus:ring-[#12372A]/10 transition shadow-2xs"
                  placeholder="₹"
                />
              </div>

              {/* Live Tax Simulation Box */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E5E2D9] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span>Real-time Invoice Simulation (Example Bill)</span>
                </span>
                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-mono">
                  <div>
                    <span className="text-stone-400">Subtotal: </span>
                    <span className="font-bold text-[#171717]">{currency}{sampleTaxCalculation.base}</span>
                  </div>
                  <span className="text-stone-300">+</span>
                  <div>
                    <span className="text-stone-400">GST ({taxRate}%): </span>
                    <span className="font-bold text-amber-700">{currency}{sampleTaxCalculation.tax}</span>
                  </div>
                  <span className="text-stone-300">=</span>
                  <div className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="text-emerald-700 font-extrabold">{currency}{sampleTaxCalculation.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: WHATSAPP NOTIFICATION ENGINE */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "whatsapp") && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E2D9] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h2 className="font-black text-lg text-[#171717]">
                  3. WhatsApp Notification Engine
                </h2>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-auto ${
                  whatsappMode === "PAID"
                    ? "bg-purple-100 text-purple-900 border border-purple-200"
                    : "bg-stone-100 text-stone-600 border border-stone-200"
                }`}
              >
                {whatsappMode === "PAID" ? "Meta API Active" : "Disabled (Off)"}
              </span>
            </div>

            {/* Mode Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Paid Cloud API */}
              <button
                type="button"
                onClick={() => setWhatsappMode("PAID")}
                className={`p-4 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                  whatsappMode === "PAID"
                    ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs"
                    : "bg-[#FAF9F6] border-[#E5E2D9] hover:bg-stone-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#171717]">
                      1. Automated Meta API
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-700 text-white text-[9px] font-black uppercase">
                      Meta Cloud
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-snug">
                    Automated background message dispatch via official Meta WhatsApp Cloud API account (~₹0.12/msg).
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-purple-700">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Official Meta API</span>
                </div>
              </button>

              {/* Disabled */}
              <button
                type="button"
                onClick={() => setWhatsappMode("DISABLED")}
                className={`p-4 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                  whatsappMode === "DISABLED"
                    ? "bg-stone-100 border-stone-400 ring-2 ring-stone-400/20 shadow-xs"
                    : "bg-[#FAF9F6] border-[#E5E2D9] hover:bg-stone-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#171717]">
                      2. Disabled
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-300 text-stone-700 text-[9px] font-bold uppercase">
                      Off
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-snug">
                    Turn off automated WhatsApp order triggers and messaging.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-stone-500">
                  No messages dispatched
                </div>
              </button>
            </div>

            {/* If PAID mode selected: Meta Cloud API credentials & Billing Info */}
            {whatsappMode === "PAID" && (
              <div className="p-5 bg-purple-50/70 border border-purple-200 rounded-3xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-200 text-purple-900 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    💳
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-purple-950">
                      Official Meta Direct Billing Setup
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#171717] block">
                      WhatsApp Phone Number ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={whatsappPhoneId}
                      onChange={(e) => setWhatsappPhoneId(e.target.value)}
                      placeholder="e.g. 104829104819201"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-purple-200 rounded-xl text-[#171717] font-mono focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#171717] block">
                      WhatsApp Business Account ID <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={whatsappBusinessId}
                      onChange={(e) => setWhatsappBusinessId(e.target.value)}
                      placeholder="e.g. 192847102938172"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-purple-200 rounded-xl text-[#171717] font-mono focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-[#171717] block">
                      Meta System User Permanent Access Token <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={whatsappAccessToken}
                      onChange={(e) => setWhatsappAccessToken(e.target.value)}
                      placeholder="EAABw..."
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-purple-200 rounded-xl text-[#171717] font-mono focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live WhatsApp Test Box */}
            <div className="p-4 sm:p-5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#171717] flex items-center gap-1.5">
                  <span>🧪 Test WhatsApp Notification Delivery</span>
                </h4>
                <span className="text-[10px] text-stone-500">
                  Mode: {whatsappMode === "PAID" ? "Automated Meta Cloud API" : "Disabled (Off)"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 9876543210 (10 digits)"
                  className="w-full sm:w-72 px-3.5 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#171717]"
                />
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={testingWhatsApp}
                  className="w-full sm:w-auto px-4 py-2 bg-[#12372A] hover:bg-[#0e2b21] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {testingWhatsApp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                  ) : (
                    <span>Send Test Message</span>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold mt-2 ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: AUDIO NOTIFICATION & DESKTOP WEB PUSH */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "sounds") && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5E2D9] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E2D9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <Volume2 className="w-5 h-5" />
                </div>
                <h2 className="font-black text-lg text-[#171717]">
                  4. Realtime Order Sounds &amp; Desktop Web Push
                </h2>
              </div>

              {/* Test Alert Button */}
              <button
                type="button"
                onClick={handleTestBrowserAlert}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
                title="Test current selected sound tone & desktop notification banner"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-700" />
                <span>🔔 Test Alert &amp; Sound</span>
              </button>
            </div>

            {/* Browser Web Push Permission Banner */}
            <div className="p-4 sm:p-5 rounded-2xl border bg-[#FAF9F6] border-[#E5E2D9] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#171717]">Desktop Web Notification:</span>
                {browserPermission === "granted" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                    <Check className="w-3 h-3 stroke-[3]" /> Active &amp; Allowed
                  </span>
                )}
                {browserPermission === "default" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                    ⚠️ Permission Needed
                  </span>
                )}
                {browserPermission === "denied" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                    ❌ Blocked by Browser
                  </span>
                )}
                {browserPermission === "unsupported" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gray-200 text-gray-700">
                    Unsupported
                  </span>
                )}
              </div>

              {browserPermission !== "granted" && browserPermission !== "unsupported" && (
                <button
                  type="button"
                  onClick={handleRequestBrowserPermission}
                  className="px-4 py-2.5 bg-[#12372A] hover:bg-[#0e2b21] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                >
                  <BellRing className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Allow Desktop Notifications</span>
                </button>
              )}
            </div>

            {/* 5 Sound Choices Grid */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-extrabold text-[#171717] tracking-wider uppercase flex items-center gap-1.5">
                <span>Select Order Alert Tone (5 Choices)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {NOTIFICATION_SOUNDS.map((sound) => {
                  const isSelected = notificationSound === sound.id;
                  const isPlaying = playingTone === sound.id;

                  return (
                    <div
                      key={sound.id}
                      onClick={() => handleSelectSound(sound.id)}
                      className={`relative p-4 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        isSelected
                          ? "border-[#12372A] bg-[#12372A]/5 ring-2 ring-[#12372A]/25 shadow-xs"
                          : "border-[#E5E2D9] bg-white hover:border-[#12372A]/40 hover:bg-[#FAF9F6]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{sound.emoji}</span>
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-[#12372A] text-white flex items-center justify-center text-[10px] shadow-2xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border border-stone-300" />
                          )}
                        </div>

                        <h4 className="text-xs font-black text-[#171717] leading-snug">
                          {sound.name}
                        </h4>
                      </div>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewTone(sound.id);
                        }}
                        className={`mt-3.5 w-full py-2 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isPlaying
                            ? "bg-amber-500 text-white animate-pulse"
                            : isSelected
                            ? "bg-[#12372A] text-white hover:bg-[#0e2b21]"
                            : "bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151]"
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Volume2 className="w-3 h-3 animate-bounce" />
                            <span>{sound.id === "longring" ? "Music (2s)..." : "Playing..."}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Preview</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM SAVE BUTTON */}
        {/* ========================================================================= */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className={`px-7 py-3.5 rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 transition cursor-pointer ${
              hasChanges
                ? "bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
            ) : savedSuccess ? (
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            ) : (
              <Save className="w-4 h-4 text-[#C9A227]" />
            )}
            <span>{savedSuccess ? "Settings Saved Successfully!" : saving ? "Saving Settings..." : "Save Settings"}</span>
          </button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* FLOATING ACTION BAR FOR UNSAVED CHANGES */}
      {/* ========================================================================= */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#171717] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold">You have unsaved changes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#12372A] hover:bg-[#0e2b21] text-white border border-[#C9A227]/40 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#C9A227]" />}
              <span>Save Now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

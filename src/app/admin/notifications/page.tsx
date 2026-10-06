"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Check,
  Send,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Phone,
  Clock,
  ExternalLink,
  Edit3,
  Undo2,
  Search,
  MessageSquare,
  Zap,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  CookingPot,
  UtensilsCrossed,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  NotificationTemplatesMap,
} from "@/lib/notificationTemplates";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerEvent {
  id: string;
  event: keyof NotificationTemplatesMap;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  enabled: boolean;
}

interface SentLog {
  id: number;
  title: string;
  body: string;
  sentAt: string;
  orderNumber: string | null;
  customerName: string;
  customerPhone: string;
  tableNumber: string;
}

const CUSTOMER_EVENTS: CustomerEvent[] = [
  {
    id: "cust_accepted",
    event: "ACCEPTED",
    label: "Order Confirmed",
    emoji: "✅",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    enabled: true,
  },
  {
    id: "cust_ready",
    event: "READY",
    label: "Food Ready",
    emoji: "🍽️",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    enabled: true,
  },
  {
    id: "cust_served",
    event: "SERVED",
    label: "Dishes Served",
    emoji: "🛎️",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    enabled: true,
  },
  {
    id: "cust_completed",
    event: "COMPLETED",
    label: "Payment Done",
    emoji: "🙏",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    enabled: true,
  },
  {
    id: "cust_cancelled",
    event: "CANCELLED",
    label: "Order Cancelled",
    emoji: "⚠️",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    enabled: true,
  },
];

const DYNAMIC_TAGS = [
  "{customer_name}",
  "{order_number}",
  "{table_number}",
  "{hotel_name}",
  "{order_url}",
  "{bill_url}",
];

const TOGGLE_STORAGE = "admin_cust_notif_toggles_v3";

type Tab = "messages" | "api" | "history";

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<Tab>("messages");

  // Customer event toggles & templates
  const [events, setEvents] = useState<CustomerEvent[]>(CUSTOMER_EVENTS);
  const [templates, setTemplates] = useState<NotificationTemplatesMap>({ ...DEFAULT_NOTIFICATION_TEMPLATES });
  const [editing, setEditing] = useState<keyof NotificationTemplatesMap | null>(null);

  // API settings
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [hotelName, setHotelName] = useState("Hotel Annapoorna");
  const [mode, setMode] = useState<"PAID" | "DISABLED">("PAID");
  const [waNumber, setWaNumber] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waBusinessId, setWaBusinessId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Test send
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; link?: string } | null>(null);

  // Save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Logs
  const [logs, setLogs] = useState<SentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, today: 0 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOGGLE_STORAGE);
      if (stored) {
        const parsed: Record<string, boolean> = JSON.parse(stored);
        setEvents((prev) =>
          prev.map((e) => ({ ...e, enabled: parsed[e.id] !== undefined ? parsed[e.id] : e.enabled }))
        );
      }
    } catch {}
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.hotel) {
          setHotelId(data.hotel.id);
          setHotelName(data.hotel.name);
          setMode(data.hotel.whatsappMode === "DISABLED" ? "DISABLED" : "PAID");
          setWaNumber(data.hotel.whatsappNumber || "");
          setWaPhoneId(data.hotel.whatsappPhoneId || "");
          setWaBusinessId(data.hotel.whatsappBusinessId || "");
          setHasToken(Boolean(data.hotel.hasAccessToken));
        }
        if (data.templates) setTemplates(data.templates);
        if (data.stats) setStats({ total: data.stats.totalSent, today: data.stats.todaySent });
        if (data.recentSent) setLogs(data.recentSent);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const toggleEvent = (id: string) => {
    const updated = events.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e));
    setEvents(updated);
    const map: Record<string, boolean> = {};
    updated.forEach((e) => (map[e.id] = e.enabled));
    localStorage.setItem(TOGGLE_STORAGE, JSON.stringify(map));
  };

  const updateTemplate = (event: keyof NotificationTemplatesMap, text: string) => {
    setTemplates((prev) => ({ ...prev, [event]: text }));
  };

  const resetTemplate = (event: keyof NotificationTemplatesMap) => {
    updateTemplate(event, DEFAULT_NOTIFICATION_TEMPLATES[event]);
  };

  const insertTag = (event: keyof NotificationTemplatesMap, tag: string) => {
    updateTemplate(event, (templates[event] || "") + " " + tag);
  };

  const renderPreview = (text: string) =>
    text
      .replace(/\{customer_name\}/g, "Rajesh Kumar")
      .replace(/\{order_number\}/g, "ORD-142")
      .replace(/\{table_number\}/g, "Table 4")
      .replace(/\{hotel_name\}/g, hotelName)
      .replace(/\{order_url\}/g, "https://hotel.com/orders/ORD-142")
      .replace(/\{bill_url\}/g, "https://hotel.com/bill/142");

  const handleSave = async () => {
    if (!hotelId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          whatsappMode: mode,
          whatsappNumber: waNumber,
          whatsappPhoneId: waPhoneId,
          whatsappBusinessId: waBusinessId,
          whatsappAccessToken: waToken.trim() || undefined,
          templates,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hotel) setHasToken(Boolean(data.hotel.hasAccessToken));
        if (data.templates) setTemplates(data.templates);
        setWaToken("");
        setEditing(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) {
      setTestResult({ ok: false, msg: "Enter a phone number" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testPhone, hotelId }),
      });
      const data = await res.json();
      setTestResult(
        res.ok && data.success
          ? { ok: true, msg: "Test message sent!", link: data.whatsappLink }
          : { ok: false, msg: data.error || "Failed to send" }
      );
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message });
    } finally {
      setTesting(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!logSearch) return logs;
    const q = logSearch.toLowerCase();
    return logs.filter(
      (l) =>
        l.customerName.toLowerCase().includes(q) ||
        l.customerPhone.includes(q) ||
        (l.orderNumber && l.orderNumber.toLowerCase().includes(q))
    );
  }, [logs, logSearch]);

  // Pagination for logs
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [logSearch]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
  };

  const activeCount = events.filter((e) => e.enabled).length;

  return (
    <div className="w-full pb-24">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E2D9] pb-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Notifications
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#12372A] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-[#0e2b21] transition disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Changes
          </button>
          <button
            onClick={fetchData}
            disabled={loadingLogs}
            className="p-2 sm:p-2.5 rounded-xl border border-[#E5E2D9] text-[#6B7280] hover:bg-stone-50 transition cursor-pointer"
            title="Refresh logs & settings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">WhatsApp</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${mode === "PAID" ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`} />
            <span className="text-sm font-black text-[#171717]">
              {mode === "PAID" ? "Active" : "OFF"}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">Events</p>
          <span className="text-2xl font-black text-[#12372A]">{activeCount}</span>
          <span className="text-xs text-[#6B7280] ml-1">/ {events.length}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Today</p>
          <span className="text-2xl font-black text-emerald-700">{stats.today}</span>
          <span className="text-xs text-emerald-600 ml-1">sent</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2D9] shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">All Time</p>
          <span className="text-2xl font-black text-[#171717]">{stats.total}</span>
          <span className="text-xs text-[#6B7280] ml-1">sent</span>
        </div>
      </div>

      {/* ── Tabs Bar with Distinct Color Schemes per Tab ── */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#E5E2D9] shadow-2xs inline-flex flex-wrap items-center gap-1.5 sm:gap-2 mb-6">
        {/* TAB 1: Messages (Emerald Green Theme) */}
        <button
          onClick={() => setTab("messages")}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
            tab === "messages"
              ? "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white border-emerald-700 shadow-md shadow-emerald-900/20 ring-2 ring-emerald-500/30"
              : "bg-white text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/70 border-stone-200/70 hover:border-emerald-300"
          }`}
        >
          <Edit3 className={`w-3.5 h-3.5 ${tab === "messages" ? "text-emerald-200" : "text-emerald-600"}`} />
          <span>Messages &amp; Templates</span>
          <span
            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              tab === "messages"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {activeCount}/{events.length}
          </span>
        </button>

        {/* TAB 2: API Settings (Indigo / Violet Theme) */}
        <button
          onClick={() => setTab("api")}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
            tab === "api"
              ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white border-indigo-700 shadow-md shadow-indigo-900/20 ring-2 ring-indigo-500/30"
              : "bg-white text-stone-600 hover:text-indigo-800 hover:bg-indigo-50/70 border-stone-200/70 hover:border-indigo-300"
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${tab === "api" ? "text-indigo-200" : "text-indigo-600"}`} />
          <span>Meta API Settings</span>
          <span
            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
              tab === "api"
                ? "bg-white/20 text-white"
                : mode === "PAID"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${mode === "PAID" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            {mode === "PAID" ? "Active" : "OFF"}
          </span>
        </button>

        {/* TAB 3: History (Warm Amber / Gold Theme) */}
        <button
          onClick={() => setTab("history")}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
            tab === "history"
              ? "bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white border-amber-700 shadow-md shadow-amber-900/20 ring-2 ring-amber-500/30"
              : "bg-white text-stone-600 hover:text-amber-800 hover:bg-amber-50/70 border-stone-200/70 hover:border-amber-300"
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${tab === "history" ? "text-amber-200" : "text-amber-600"}`} />
          <span>API Sent History</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: Messages                                   */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === "messages" && (
        <div className="space-y-4">
          {events.map((ev) => {
            const isEditing = editing === ev.event;
            const text = templates[ev.event] || DEFAULT_NOTIFICATION_TEMPLATES[ev.event];
            const preview = renderPreview(text);

            return (
              <div
                key={ev.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
                  ev.enabled
                    ? "border-[#E5E2D9] shadow-2xs hover:shadow-md"
                    : "border-stone-200 opacity-55"
                }`}
              >
                {/* ── Card Layout: Left info + Right phone preview ── */}
                <div className={`flex flex-col lg:flex-row ${isEditing ? "" : ""}`}>
                  {/* LEFT SIDE */}
                  <div className="flex-1 p-5 lg:p-6">
                    {/* Top row: icon + label + toggle */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl ${ev.bg} border ${ev.border} ${ev.color} flex items-center justify-center text-lg`}>
                          {ev.emoji}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-[#171717]">{ev.label}</span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 border border-stone-200">
                              {ev.event}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {ev.enabled ? (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Sending to customers
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-stone-400">Disabled</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setEditing(isEditing ? null : ev.event)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition border ${
                            isEditing
                              ? "bg-[#12372A] text-white border-[#12372A] shadow-sm"
                              : "bg-white text-[#6B7280] hover:text-[#171717] border-[#E5E2D9] hover:bg-stone-50"
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          {isEditing ? "Done" : "Edit"}
                        </button>

                        <button
                          onClick={() => toggleEvent(ev.id)}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                            ev.enabled ? "bg-[#12372A]" : "bg-stone-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              ev.enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Edit mode: textarea + tags */}
                    {isEditing && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <textarea
                          rows={6}
                          value={text}
                          onChange={(e) => updateTemplate(ev.event, e.target.value)}
                          className="w-full p-4 text-sm bg-[#FAF9F6] rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 focus:bg-white leading-relaxed text-[#1F2937] resize-y font-sans transition"
                          placeholder="Type notification message..."
                        />

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mr-1">Insert:</span>
                          {DYNAMIC_TAGS.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => insertTag(ev.event, tag)}
                              className="text-[10px] font-mono px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-[#E5E2D9] hover:border-emerald-300 text-[#12372A] font-semibold cursor-pointer transition shadow-2xs"
                            >
                              + {tag}
                            </button>
                          ))}
                          <button
                            onClick={() => resetTemplate(ev.event)}
                            className="text-[10px] px-2 py-1 rounded-lg text-rose-600 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 cursor-pointer flex items-center gap-0.5 ml-auto transition"
                          >
                            <Undo2 className="w-3 h-3" /> Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT SIDE: WhatsApp Phone Preview */}
                  <div className={`lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#E5E2D9] bg-gradient-to-br from-[#FAF9F6] to-[#F0EDE5] p-5 lg:p-6 flex flex-col`}>
                    {/* Mini phone frame */}
                    <div className="flex-1 flex flex-col">
                      {/* WhatsApp chat header bar */}
                      <div className="bg-[#075E54] rounded-t-2xl px-4 py-2.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                          {hotelName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white text-xs font-bold leading-tight">{hotelName}</p>
                          <p className="text-emerald-200 text-[9px]">Business · online</p>
                        </div>
                      </div>

                      {/* Chat body */}
                      <div className="bg-[#EFEAE2] flex-1 p-3 rounded-b-2xl min-h-[140px]"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9c2b6' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                      >
                        {/* Message bubble */}
                        <div className="bg-white rounded-xl rounded-tl-sm p-3.5 shadow-sm max-w-full relative">
                          <div className="absolute -top-0 -left-1 w-3 h-3 bg-white" style={{
                            clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                          }} />
                          <p className="text-[12px] text-[#1F2937] whitespace-pre-line leading-[1.65] font-sans">
                            {preview}
                          </p>
                          <div className="flex justify-end items-center gap-1 mt-1.5">
                            <span className="text-[9px] text-[#667781]">12:45 PM</span>
                            <svg className="w-4 h-3 text-[#53BDEB]" viewBox="0 0 16 11" fill="currentColor">
                              <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.46.46 0 0 0-.327-.14.465.465 0 0 0-.328.14l-.632.66a.456.456 0 0 0 0 .648l2.96 3.083a.475.475 0 0 0 .327.14.525.525 0 0 0 .39-.178l7.138-8.788a.46.46 0 0 0 .037-.634l-.679-.548z" />
                              <path d="M14.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.46.46 0 0 0-.327-.14.465.465 0 0 0-.328.14l-.632.66a.456.456 0 0 0 0 .648l2.96 3.083a.475.475 0 0 0 .327.14.525.525 0 0 0 .39-.178l7.138-8.788a.46.46 0 0 0 .037-.634l-.679-.548z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: API Settings                               */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === "api" && (
        <div className="space-y-5">
          {/* Mode */}
          <div className="bg-white rounded-2xl border border-[#E5E2D9] p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-[#171717] mb-4">WhatsApp Dispatch</h2>

            <div className="flex gap-2 bg-[#FAF9F6] p-1.5 rounded-2xl border border-[#E5E2D9] w-fit">
              <button
                onClick={() => setMode("PAID")}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition ${
                  mode === "PAID"
                    ? "bg-[#12372A] text-white shadow-sm"
                    : "text-[#6B7280] hover:text-[#171717]"
                }`}
              >
                {mode === "PAID" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                Meta Cloud API
              </button>
              <button
                onClick={() => setMode("DISABLED")}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition ${
                  mode === "DISABLED"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-[#6B7280] hover:text-rose-600"
                }`}
              >
                OFF
              </button>
            </div>

            <p className="text-xs text-[#6B7280] mt-3 leading-relaxed max-w-xl">
              {mode === "PAID"
                ? "Automated WhatsApp messages sent to customers when order status changes. Messages are dispatched via Meta Cloud API (~₹0.12/msg billed to your Meta account)."
                : "WhatsApp notifications are completely disabled."}
            </p>
          </div>

          {/* Credentials */}
          {mode === "PAID" && (
            <div className="bg-white rounded-2xl border border-[#E5E2D9] p-6 shadow-2xs">
              <h2 className="text-sm font-bold text-[#171717] mb-4">API Credentials</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-bold text-[#171717] block mb-1.5">Business Phone</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 bg-[#FAF9F6] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#171717] block mb-1.5">Phone Number ID</label>
                  <input
                    type="text"
                    placeholder="102938475610293"
                    value={waPhoneId}
                    onChange={(e) => setWaPhoneId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 bg-[#FAF9F6] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#171717] block mb-1.5">Business Account ID</label>
                  <input
                    type="text"
                    placeholder="987654321098765"
                    value={waBusinessId}
                    onChange={(e) => setWaBusinessId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 bg-[#FAF9F6] focus:bg-white transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-[#171717]">Access Token</label>
                    {hasToken && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Saved
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      placeholder={hasToken ? "•••••••• (blank = keep current)" : "EAAG..."}
                      value={waToken}
                      onChange={(e) => setWaToken(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2.5 text-xs rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 bg-[#FAF9F6] focus:bg-white transition"
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test */}
          {mode === "PAID" && (
            <div className="bg-white rounded-2xl border border-[#E5E2D9] p-6 shadow-2xs">
              <h2 className="text-sm font-bold text-[#171717] mb-4">Test Send</h2>

              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Phone number (9876543210)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 bg-[#FAF9F6] focus:bg-white transition"
                />
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#12372A] hover:bg-[#0e2b21] rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 transition shadow-sm"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Test
                </button>
              </div>

              {testResult && (
                <div className={`mt-3 p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  testResult.ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  <span>{testResult.msg}</span>
                  {testResult.link && (
                    <a
                      href={testResult.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline shrink-0"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* TAB: History                                     */}
      {/* ═══════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="bg-white rounded-2xl border border-[#E5E2D9] overflow-hidden shadow-2xs">
          {/* Top Bar with Filter & Per-Page Controls */}
          <div className="p-4 sm:p-5 border-b border-[#E5E2D9] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-[#171717]">Sent via WhatsApp API</h2>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Send className="w-2.5 h-2.5" /> Meta Cloud API
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Items per page dropdown (50, 100, 150, 200) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#6B7280]">Show:</span>
                <div className="relative">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="pl-3 pr-8 py-2 text-xs font-bold text-[#171717] bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#12372A]/20 cursor-pointer appearance-none shadow-2xs hover:bg-stone-50 transition"
                  >
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={150}>150 per page</option>
                    <option value={200}>200 per page</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, phone, order..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF9F6] rounded-xl border border-[#E5E2D9] focus:outline-none focus:ring-2 focus:ring-[#12372A]/20"
                />
              </div>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-16 text-center">
              <Clock className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#171717]">No logs found</p>
              <p className="text-xs text-[#6B7280] mt-1">
                {logSearch ? "No notifications match your search query." : "Notifications appear here as orders are updated."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[10px] text-[#6B7280] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-5 font-bold w-12">#</th>
                      <th className="py-3 px-5 font-bold">Customer</th>
                      <th className="py-3 px-5 font-bold">Order</th>
                      <th className="py-3 px-5 font-bold">Message</th>
                      <th className="py-3 px-5 font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2D9]">
                    {paginatedLogs.map((log, index) => (
                      <tr key={log.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3 px-5 text-stone-400 font-mono text-[11px]">
                          {startIndex + index + 1}
                        </td>
                        <td className="py-3 px-5">
                          <div className="font-bold text-[#171717]">{log.customerName}</div>
                          <div className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {log.customerPhone || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          {log.orderNumber ? (
                            <span className="font-mono font-bold text-[#12372A] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                              #{log.orderNumber}
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-5 max-w-sm">
                          <div className="font-semibold text-[#171717] truncate">{log.title}</div>
                          <div className="text-[11px] text-[#6B7280] truncate mt-0.5">{log.body}</div>
                        </td>
                        <td className="py-3 px-5 text-[#6B7280] whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleString([], {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Bar - Simple & Clean */}
              <div className="px-5 py-3.5 bg-[#FAF9F6] border-t border-[#E5E2D9] flex items-center justify-between text-xs text-[#6B7280]">
                <span>
                  Showing <strong className="text-[#171717] font-bold">{startIndex + 1}–{endIndex}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E2D9] bg-white text-xs font-bold text-[#171717] disabled:opacity-30 hover:bg-stone-50 transition cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs font-bold text-[#171717] px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E2D9] bg-white text-xs font-bold text-[#171717] disabled:opacity-30 hover:bg-stone-50 transition cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

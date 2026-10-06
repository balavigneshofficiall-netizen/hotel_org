"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Zap,
  Copy,
  Check,
  Power,
  Clock,
} from "lucide-react";

interface IntegrationState {
  id: number;
  hotelId: number;
  platform: "SWIGGY" | "ZOMATO";
  isEnabled: boolean;
  storeId: string;
  autoAccept: boolean;
  prepTime: number;
}

interface StatsChannel {
  count: number;
  revenue: number;
  active: number;
}

interface IntegrationResponse {
  hotel: {
    id: number;
    name: string;
    slug: string;
    currency: string;
  };
  integrations: {
    swiggy: IntegrationState;
    zomato: IntegrationState;
  };
  stats: {
    swiggy: StatsChannel;
    zomato: StatsChannel;
    dineIn: StatsChannel;
  };
}

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPlatform, setUpdatingPlatform] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/integrations?hotel=hotel-annapoorna");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleChannel = async (platform: "SWIGGY" | "ZOMATO", currentEnabled: boolean) => {
    try {
      setUpdatingPlatform(platform);
      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          isEnabled: !currentEnabled,
          hotelSlug: "hotel-annapoorna",
        }),
      });

      if (res.ok) {
        showToast(`${platform} is now ${!currentEnabled ? "ONLINE ✓" : "OFFLINE"}`);
        await fetchIntegrations();
      }
    } catch (err) {
      console.error("Toggle error:", err);
    } finally {
      setUpdatingPlatform(null);
    }
  };

  const handleUpdateConfig = async (
    platform: "SWIGGY" | "ZOMATO",
    updates: { autoAccept?: boolean; prepTime?: number; storeId?: string }
  ) => {
    try {
      setUpdatingPlatform(platform);
      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          ...updates,
          hotelSlug: "hotel-annapoorna",
        }),
      });

      if (res.ok) {
        showToast(`${platform} settings updated.`);
        await fetchIntegrations();
      }
    } catch (err) {
      console.error("Update config error:", err);
    } finally {
      setUpdatingPlatform(null);
    }
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/integrations/webhook?hotel=hotel-annapoorna`
    : "http://localhost:3000/api/integrations/webhook?hotel=hotel-annapoorna";

  const handleCopyWebhook = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      showToast("Webhook URL copied!");
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const currency = data?.hotel.currency || "₹";
  const swiggy = data?.integrations.swiggy;
  const zomato = data?.integrations.zomato;
  const stats = data?.stats;

  // Reusable platform card component
  const PlatformCard = ({
    platform,
    config,
    channelStats,
    brandColor,
    brandGradient,
    brandLetter,
  }: {
    platform: "SWIGGY" | "ZOMATO";
    config: IntegrationState | undefined;
    channelStats: StatsChannel | undefined;
    brandColor: string;
    brandGradient: string;
    brandLetter: string;
  }) => {
    const isEnabled = config?.isEnabled ?? true;
    const isUpdating = updatingPlatform === platform;

    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Compact header */}
        <div className={`px-5 py-4 ${brandGradient} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <span className={`text-lg font-black ${brandColor}`}>{brandLetter}</span>
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">{platform.charAt(0) + platform.slice(1).toLowerCase()}</h3>
              <p className="text-[11px] text-white/70 font-medium">
                {config?.storeId || `${platform.slice(0, 3)}-ANNAPOORNA-01`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              isEnabled ? "bg-emerald-400 text-stone-950" : "bg-black/30 text-white"
            }`}>
              {isEnabled ? "Online" : "Paused"}
            </span>
            <button
              onClick={() => handleToggleChannel(platform, isEnabled)}
              disabled={isUpdating}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isEnabled
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/80"
              }`}
              title={isEnabled ? "Pause channel" : "Go online"}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Inline stats */}
          <div className="flex items-center gap-4 text-center">
            <div className="flex-1 py-2.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className="text-lg font-black text-stone-900">{channelStats?.count || 0}</div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Orders</div>
            </div>
            <div className="flex-1 py-2.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className="text-lg font-black text-stone-900">{currency}{channelStats?.revenue || 0}</div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Revenue</div>
            </div>
            <div className="flex-1 py-2.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className={`text-lg font-black ${(channelStats?.active || 0) > 0 ? "text-amber-600" : "text-stone-400"}`}>
                {channelStats?.active || 0}
              </div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Active</div>
            </div>
          </div>

          {/* Settings — compact two-row */}
          <div className="divide-y divide-stone-100">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-xs font-bold text-stone-800">Auto-Accept Orders</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config?.autoAccept ?? true}
                  onChange={(e) => handleUpdateConfig(platform, { autoAccept: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-xs font-bold text-stone-800">Prep Time</span>
              </div>
              <select
                value={config?.prepTime ?? 20}
                onChange={(e) => handleUpdateConfig(platform, { prepTime: Number(e.target.value) })}
                className="px-2.5 py-1 rounded-lg border border-stone-200 text-xs font-bold bg-white text-stone-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-stone-400"
              >
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={25}>25 min</option>
                <option value={30}>30 min</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12372A] text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-600/30 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Zap className="w-4 h-4 text-[#C9A227]" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header — simple */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">
            Swiggy & Zomato Hub
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">
            Manage live delivery partner channels and order automation.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 transition cursor-pointer shadow-2xs"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Platform Cards — 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PlatformCard
          platform="SWIGGY"
          config={swiggy}
          channelStats={stats?.swiggy}
          brandColor="text-[#FC8019]"
          brandGradient="bg-gradient-to-r from-orange-500 to-[#FC8019]"
          brandLetter="S"
        />
        <PlatformCard
          platform="ZOMATO"
          config={zomato}
          channelStats={stats?.zomato}
          brandColor="text-[#E23744]"
          brandGradient="bg-gradient-to-r from-red-600 to-[#E23744]"
          brandLetter="Z"
        />
      </div>

      {/* Webhook — single compact row */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#C9A227]" />
            <h3 className="text-sm font-black text-stone-900">Webhook Endpoint</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Listening
          </span>
        </div>
        <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-xl border border-stone-200">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="w-full bg-transparent text-xs font-mono text-stone-700 px-2 py-0.5 focus:outline-none"
          />
          <button
            onClick={handleCopyWebhook}
            className="px-3 py-1.5 rounded-lg bg-[#12372A] hover:bg-[#0e2b21] text-white text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#C9A227]" />}
            <span>{copiedUrl ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <p className="text-[11px] text-stone-400 mt-2">
          Configure this URL in your UrbanPiper / Swiggy / Zomato merchant portal to receive live orders.
        </p>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, Loader2, X } from "lucide-react";

interface PushNotificationPromptProps {
  orderNumber?: string;
  tableId?: string | number;
  hotelId?: string | number;
  customerPhone?: string;
}

export default function PushNotificationPrompt({
  orderNumber,
  tableId,
  hotelId,
  customerPhone,
}: PushNotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported =
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;

      setIsSupported(supported);

      if (supported && "Notification" in window) {
        setPermission(Notification.permission);
        if (Notification.permission === "granted") {
          setIsSubscribed(true);
        }
      }
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("Notification" in window) ||
      !("PushManager" in window)
    ) {
      return;
    }

    try {
      setLoading(true);

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      // Register SW if not already registered
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BHSFve7XC0oNLrMRWEOpW1Vs8lsdXBSmuuGoYNbQvNnwoItO0S8EXzcqFb1yARUYtqzVXszGWfymoi-RvTOqlXo";

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Send to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          tableId,
          hotelId,
          customerPhone,
        }),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error("Push registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (dismissed || !isSupported) return null;

  if (isSubscribed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">Notifications Active</span>
            <p className="text-[11px] text-emerald-700">
              We will buzz your phone when dishes are ready!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/70 rounded-2xl p-4 shadow-xs">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2.5 right-2.5 text-[#6B7280] hover:text-[#171717]"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[#12372A] text-white flex items-center justify-center shrink-0 shadow-xs">
          <Bell className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-bold text-xs text-[#171717]">
            Get Status Updates on Your Phone
          </h4>
          <p className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">
            Enable browser notifications so you never miss when your food is being cooked and served!
          </p>

          <button
            onClick={subscribeToPush}
            disabled={loading}
            className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <Bell className="w-3 h-3" />
                <span>Turn on Notifications</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

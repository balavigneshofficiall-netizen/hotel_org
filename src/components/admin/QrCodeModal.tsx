"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { X, Download, Printer, Copy, Check, Wifi, Laptop, ExternalLink, Settings } from "lucide-react";

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: {
    id: string;
    tableNumber: string;
    qrCodeToken: string;
    floor?: string;
  } | null;
  hotelSlug?: string;
  networkBaseUrl?: string;
}

export default function QrCodeModal({
  isOpen,
  onClose,
  table,
  hotelSlug = "hotel-annapoorna",
  networkBaseUrl = typeof window !== "undefined" ? window.location.origin : "http://10.117.226.228:3000",
}: QrCodeModalProps) {
  const [selectedHostMode, setSelectedHostMode] = useState<"wifi" | "localhost">("wifi");
  const [customHost, setCustomHost] = useState<string>(networkBaseUrl);
  const [showHostInput, setShowHostInput] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [menuUrl, setMenuUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync customHost when networkBaseUrl changes
  useEffect(() => {
    if (networkBaseUrl) {
      setCustomHost(networkBaseUrl);
    }
  }, [networkBaseUrl]);

  useEffect(() => {
    if (!table) return;

    let base = networkBaseUrl;
    if (selectedHostMode === "localhost") {
      base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    } else {
      base = customHost || networkBaseUrl || (typeof window !== "undefined" ? window.location.origin : "http://10.117.226.228:3000");
    }

    const cleanBase = base.replace(/\/+$/, "");
    const fullUrl = `${cleanBase}/menu?hotel=${hotelSlug}&table=${table.qrCodeToken}`;
    setMenuUrl(fullUrl);

    QRCode.toDataURL(
      fullUrl,
      {
        width: 340,
        margin: 1.5,
        color: {
          dark: "#12372A",
          light: "#FFFFFF",
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrUrl(url);
        }
      }
    );
  }, [table, hotelSlug, selectedHostMode, customHost, networkBaseUrl]);

  if (!isOpen || !table) return null;

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `QR_${table.tableNumber.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (menuUrl) {
      navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5E2D9] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#FAF9F6] border-b border-[#E5E2D9] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-[#171717]">
              Table QR Code
            </h3>
            <p className="text-[11px] text-[#6B7280]">
              {table.tableNumber} · {table.floor || "Main Dining"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-[#6B7280] hover:bg-stone-200 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Target Host Mode Selector */}
          <div className="bg-[#FAF9F6] rounded-2xl p-3 border border-[#E5E2D9] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#171717]">QR Destination Network:</span>
              <button
                type="button"
                onClick={() => setShowHostInput(!showHostInput)}
                className="text-[10px] text-[#12372A] font-semibold flex items-center gap-1 hover:underline"
              >
                <Settings className="w-3 h-3" />
                {showHostInput ? "Hide IP Settings" : "Change IP"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedHostMode("wifi")}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                  selectedHostMode === "wifi"
                    ? "bg-[#12372A] text-white shadow-xs"
                    : "bg-white border border-[#E5E2D9] text-[#6B7280] hover:bg-stone-50"
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Wi-Fi IP (Phone)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedHostMode("localhost")}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                  selectedHostMode === "localhost"
                    ? "bg-[#12372A] text-white shadow-xs"
                    : "bg-white border border-[#E5E2D9] text-[#6B7280] hover:bg-stone-50"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Localhost (PC)</span>
              </button>
            </div>

            {selectedHostMode === "wifi" && (
              <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                ✓ Mobile phones connected to the same Wi-Fi can scan this QR code directly.
              </p>
            )}

            {showHostInput && selectedHostMode === "wifi" && (
              <div className="pt-1 space-y-1">
                <label className="text-[10px] font-medium text-[#6B7280]">
                  Server IP / Base URL:
                </label>
                <input
                  type="text"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="http://10.117.226.228:3000"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E2D9] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
              </div>
            )}
          </div>

          {/* Printable Card Area */}
          <div className="text-center space-y-3" ref={cardRef}>
            <div className="bg-[#FAF9F6] rounded-2xl p-5 border-2 border-dashed border-[#12372A]/20 space-y-3">
              <div>
                <span className="text-[10px] font-black tracking-widest text-[#C9A227] uppercase">
                  Hotel Annapoorna
                </span>
                <h2 className="text-xl font-black text-[#12372A] mt-0.5">
                  {table.tableNumber}
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  Scan to View Menu & Order
                </p>
              </div>

              {/* QR Image */}
              <div className="relative w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-xs border border-[#E5E2D9] flex items-center justify-center">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt={`QR for ${table.tableNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-[#6B7280]">Generating QR...</div>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-500 font-mono">
                <span>Token:</span>
                <span className="font-bold text-[#12372A]">{table.qrCodeToken}</span>
              </div>
            </div>

            {/* Quick link copy & Open */}
            <div className="flex items-center gap-1.5 p-2 bg-[#F7F5EF] rounded-xl border border-[#E5E2D9] text-[11px] text-[#6B7280]">
              <input
                type="text"
                readOnly
                value={menuUrl}
                className="bg-transparent flex-1 truncate outline-none text-[#171717] font-mono text-[11px]"
              />
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white border border-[#E5E2D9] text-[#12372A] hover:bg-stone-50 transition"
                title="Open menu in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-white border border-[#E5E2D9] text-[#12372A] hover:bg-stone-50 transition"
                title="Copy customer menu link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#FAF9F6] border-t border-[#E5E2D9] grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDownload}
            className="py-2.5 px-3 rounded-xl border border-[#E5E2D9] hover:bg-white text-[#171717] text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-4 h-4 text-[#12372A]" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4 text-[#C9A227]" />
            <span>Print Stand</span>
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Lock, ArrowRight, Camera, CheckCircle2, Utensils, Image as ImageIcon, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { decodeQrFromImageFile } from "@/lib/qrDecode";
import { useCart } from "@/context/CartContext";

interface TableInfo {
  id: number | string;
  tableNumber: string;
  qrCodeToken: string;
  capacity?: number;
  occupiedSeats?: number;
  availableSeats?: number;
  status?: string;
}

interface TableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTableNumber: string;
  currentTableToken: string;
  hotelSlug: string;
  hasActiveOrder: boolean;
  activeOrderNumber?: string | null;
  onSelectTable?: (token: string, tableNumber: string) => void;
}

export default function TableSelectorModal({
  isOpen,
  onClose,
  currentTableNumber,
  currentTableToken,
  hotelSlug,
  hasActiveOrder,
  activeOrderNumber,
  onSelectTable,
}: TableSelectorModalProps) {
  const router = useRouter();
  const { guestCount, setGuestCount } = useCart();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"tables" | "scan">("tables");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);

  // Seat / Guest Count Selector state
  const [selectedTableForGuests, setSelectedTableForGuests] = useState<TableInfo | null>(null);
  const [chosenGuests, setChosenGuests] = useState<number>(guestCount || 1);

  const scannerRef = useRef<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const liveScanId = "qr-live-scan";

  useEffect(() => { setMounted(true); }, []);

  // Fetch tables with real seat occupancy
  useEffect(() => {
    if (!isOpen || hasActiveOrder) return;
    let alive = true;
    (async () => {
      try {
        setLoadingTables(true);
        const res = await fetch(`/api/menu?hotel=${encodeURIComponent(hotelSlug)}`);
        const data = await res.json();
        if (alive && data.availableTables) setTables(data.availableTables);
      } catch {} finally { if (alive) setLoadingTables(false); }
    })();
    return () => { alive = false; };
  }, [isOpen, hasActiveOrder, hotelSlug]);

  // Initiate guest count picker for a chosen table
  const initiateTableChoice = useCallback((tbl: TableInfo) => {
    const avail = tbl.availableSeats !== undefined ? tbl.availableSeats : (tbl.capacity || 4);
    if (avail <= 0) {
      setScanError(`${tbl.tableNumber} is completely full (${tbl.capacity || 4}/${tbl.capacity || 4} seats occupied). Please select another table.`);
      return;
    }
    setScanError(null);
    setChosenGuests(Math.min(guestCount || 1, avail));
    setSelectedTableForGuests(tbl);
  }, [guestCount]);

  // Handle decoded QR
  const handleResult = useCallback((text: string) => {
    const raw = (text || "").trim();
    if (!raw) {
      setScanError("Empty QR code scanned");
      setProcessing(false);
      return;
    }

    let extractedTable: string | null = null;
    let extractedHotel: string | null = null;

    try {
      const dummyBase = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const parsedUrl = new URL(raw, dummyBase);
      extractedTable = parsedUrl.searchParams.get("table");
      extractedHotel = parsedUrl.searchParams.get("hotel");
    } catch {}

    if (!extractedTable && raw.toLowerCase().startsWith("tbl_")) {
      extractedTable = raw;
    }

    const candidate = extractedTable || raw;

    let matched = tables.find(t => 
      t.qrCodeToken.toLowerCase() === candidate.toLowerCase() ||
      t.tableNumber.toLowerCase() === candidate.toLowerCase()
    );

    if (!matched) {
      const cleanCandidate = candidate.replace(/^table\s*/i, "").replace(/^0+/, "").trim().toLowerCase();
      if (cleanCandidate) {
        matched = tables.find(t => {
          const cleanT = t.tableNumber.replace(/^table\s*/i, "").replace(/^0+/, "").trim().toLowerCase();
          return cleanT === cleanCandidate;
        });
      }
    }

    if (matched) {
      setProcessing(false);
      initiateTableChoice(matched);
      return;
    }

    if (extractedTable) {
      setProcessing(false);
      const tempTable: TableInfo = {
        id: extractedTable,
        tableNumber: extractedTable,
        qrCodeToken: extractedTable,
        capacity: 4,
        availableSeats: 4,
      };
      initiateTableChoice(tempTable);
      return;
    }

    setScanError(`Scanned: "${raw.slice(0, 30)}${raw.length > 30 ? "..." : ""}" — Not a recognized table QR.`);
    setProcessing(false);
  }, [initiateTableChoice, tables]);

  // Stop live scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { if (scannerRef.current.getState() === 2) await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setScannerReady(false);
  }, []);

  // Start live scanner (HTTPS / localhost only)
  const startLive = useCallback(async () => {
    setScanError(null);
    setScannerReady(false);
    setCameraFailed(false);
    await new Promise(r => setTimeout(r, 250));
    if (!document.getElementById(liveScanId)) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode(liveScanId);
      scannerRef.current = s;
      await s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (t: string) => {
          s.stop().then(() => s.clear()).catch(() => {});
          scannerRef.current = null;
          handleResult(t);
        },
        () => {}
      );
      setScannerReady(true);
    } catch {
      setCameraFailed(true);
      setScannerReady(false);
    }
  }, [handleResult]);

  // File capture & decode
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setScanError(null);
    try {
      const decoded = await decodeQrFromImageFile(file);
      handleResult(decoded);
    } catch (err: any) {
      setScanError(err?.message || "Could not read QR. Please try a closer, well-lit photo.");
      setProcessing(false);
    }
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, [handleResult]);

  const isSecure = typeof window !== "undefined" && (window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // Scanner lifecycle
  useEffect(() => {
    if (isOpen && tab === "scan" && !hasActiveOrder && mounted && isSecure && !selectedTableForGuests) {
      startLive();
    }
    if (tab !== "scan" || !isOpen || selectedTableForGuests) {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [isOpen, tab, hasActiveOrder, mounted, isSecure, selectedTableForGuests, startLive, stopScanner]);

  useEffect(() => {
    if (!isOpen) {
      setTab("tables");
      setScanError(null);
      setProcessing(false);
      setCameraFailed(false);
      setSelectedTableForGuests(null);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleClose = () => {
    stopScanner();
    setTab("tables");
    setSelectedTableForGuests(null);
    onClose();
  };

  const handleConfirmGuestsAndTable = () => {
    if (!selectedTableForGuests) return;
    setGuestCount(chosenGuests);
    onSelectTable?.(selectedTableForGuests.qrCodeToken, selectedTableForGuests.tableNumber);
    handleClose();
    router.push(`/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(selectedTableForGuests.qrCodeToken)}`);
  };

  // ─── LOCKED STATE ───
  if (hasActiveOrder) {
    return createPortal(
      <div onClick={handleClose} style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backgroundColor:"rgba(0,0,0,0.6)" }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:"100%",maxWidth:340,backgroundColor:"white",borderRadius:16,boxShadow:"0 25px 50px rgba(0,0,0,0.25)" }}>
          <div style={{ padding:20 }}>
            <div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:16 }}>
              <div style={{ width:40,height:40,borderRadius:12,backgroundColor:"#fef3c7",border:"1px solid #fde68a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <Lock style={{ width:20,height:20,color:"#b45309" }} />
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:14,fontWeight:900,color:"#171717" }}>Table Locked</div>
                <div style={{ fontSize:11,color:"#6B7280",marginTop:2 }}>
                  Order <strong style={{ color:"#12372A" }}>#{activeOrderNumber}</strong> active on <strong style={{ color:"#12372A" }}>{currentTableNumber}</strong>
                </div>
              </div>
              <button onClick={handleClose} style={{ width:28,height:28,borderRadius:"50%",background:"#f5f5f4",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <X style={{ width:14,height:14,color:"#6B7280" }} />
              </button>
            </div>
            <div style={{ fontSize:11,color:"#92400e",backgroundColor:"#fffbeb",padding:"10px 12px",borderRadius:12,border:"1px solid #fde68a",lineHeight:1.5,marginBottom:16 }}>
              Complete your order or settle bill before switching table.
            </div>
            {activeOrderNumber && (
              <Link href={`/orders/${activeOrderNumber}`} onClick={handleClose} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"10px 16px",borderRadius:12,backgroundColor:"#12372A",color:"white",fontSize:12,fontWeight:700,textDecoration:"none" }}>
                <span>View Order</span><ArrowRight style={{ width:14,height:14,color:"#C9A227" }} />
              </Link>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ─── MAIN MODAL ───
  return createPortal(
    <div onClick={handleClose} style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backgroundColor:"rgba(0,0,0,0.6)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%",maxWidth:360,backgroundColor:"white",borderRadius:22,boxShadow:"0 25px 50px rgba(0,0,0,0.25)",display:"flex",flexDirection:"column",overflow:"hidden",maxHeight:"80vh" }}>

        {/* Header */}
        <div style={{ padding:"16px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15,fontWeight:900,color:"#171717" }}>
              {selectedTableForGuests ? "Party Size" : "Select or Scan Table"}
            </div>
            <div style={{ fontSize:11,color:"#6B7280",marginTop:1 }}>
              Current: <strong style={{ color:"#12372A" }}>{currentTableNumber}</strong>
              {guestCount > 0 && <span> · <strong style={{ color:"#12372A" }}>{guestCount} {guestCount === 1 ? "Guest" : "Guests"}</strong></span>}
            </div>
          </div>
          <button onClick={handleClose} style={{ width:30,height:30,borderRadius:"50%",background:"#f5f5f4",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <X style={{ width:15,height:15,color:"#6B7280" }} />
          </button>
        </div>

        {/* Content View */}
        <div style={{ flex:1,overflowY:"auto",padding:"0 16px 16px" }}>
          {selectedTableForGuests ? (
            /* ═══ STEP 2: GUEST COUNT SELECTION ═══ */
            <div style={{ padding:"4px 0" }}>
              <div style={{ backgroundColor:"#FAF9F6",border:"1px solid #E5E2D9",borderRadius:16,padding:"14px 16px",textAlign:"center",marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.5px" }}>Selected Table</div>
                <div style={{ fontSize:22,fontWeight:900,color:"#171717",marginTop:2 }}>{selectedTableForGuests.tableNumber}</div>
                <div style={{ display:"inline-flex",alignItems:"center",gap:5,marginTop:6,padding:"4px 12px",borderRadius:20,backgroundColor:"#ecfdf5",border:"1px solid #a7f3d0",fontSize:11,fontWeight:800,color:"#065f46" }}>
                  <Users style={{ width:12,height:12 }} />
                  <span>
                    {selectedTableForGuests.availableSeats ?? 4} of {selectedTableForGuests.capacity ?? 4} seats free
                  </span>
                </div>
              </div>

              <div style={{ textAlign:"center",marginBottom:14 }}>
                <div style={{ fontSize:14,fontWeight:800,color:"#171717" }}>How many members are dining?</div>
                <div style={{ fontSize:11,color:"#6B7280",marginTop:2 }}>
                  Max {selectedTableForGuests.availableSeats ?? 4} seats available at this table
                </div>
              </div>

              {/* Number Chips */}
              <div style={{ display:"grid",gridTemplateColumns:`repeat(${Math.min(selectedTableForGuests.availableSeats || 4, 4)}, 1fr)`,gap:8,marginBottom:18 }}>
                {Array.from({ length: Math.min(selectedTableForGuests.availableSeats || 4, 8) }, (_, i) => i + 1).map((num) => {
                  const isSelected = chosenGuests === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setChosenGuests(num)}
                      style={{
                        padding:"14px 0",
                        borderRadius:14,
                        border:isSelected ? "2px solid #12372A" : "1px solid #E5E2D9",
                        backgroundColor:isSelected ? "#12372A" : "#FAF9F6",
                        color:isSelected ? "white" : "#171717",
                        fontSize:16,
                        fontWeight:900,
                        cursor:"pointer",
                        transition:"all 0.15s",
                        boxShadow:isSelected ? "0 4px 12px rgba(18,55,42,0.25)" : "none",
                      }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmGuestsAndTable}
                style={{
                  width:"100%",
                  padding:"13px 18px",
                  borderRadius:14,
                  backgroundColor:"#12372A",
                  color:"white",
                  fontSize:13,
                  fontWeight:800,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:8,
                  cursor:"pointer",
                  border:"none",
                  boxShadow:"0 4px 14px rgba(18,55,42,0.25)",
                }}
              >
                <span>Confirm for {chosenGuests} {chosenGuests === 1 ? "Guest" : "Guests"}</span>
                <ArrowRight style={{ width:15,height:15,color:"#C9A227" }} />
              </button>

              {/* Back to tables */}
              <button
                type="button"
                onClick={() => setSelectedTableForGuests(null)}
                style={{
                  width:"100%",
                  padding:"10px",
                  borderRadius:12,
                  backgroundColor:"transparent",
                  color:"#6B7280",
                  fontSize:11,
                  fontWeight:700,
                  cursor:"pointer",
                  border:"none",
                  marginTop:8,
                }}
              >
                ← Back to Table List
              </button>
            </div>
          ) : (
            /* ═══ STEP 1: SELECT TABLE OR SCAN QR ═══ */
            <div>
              {/* Tabs */}
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex",gap:4,padding:3,backgroundColor:"#f5f5f4",borderRadius:12 }}>
                  <button onClick={()=>setTab("tables")} style={{
                    flex:1,padding:"8px 0",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.15s",
                    backgroundColor:tab==="tables"?"white":"transparent",
                    color:tab==="tables"?"#171717":"#9ca3af",
                    boxShadow:tab==="tables"?"0 1px 3px rgba(0,0,0,0.08)":"none",
                  }}>
                    Select Table
                  </button>
                  <button onClick={()=>setTab("scan")} style={{
                    flex:1,padding:"8px 0",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.15s",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                    backgroundColor:tab==="scan"?"white":"transparent",
                    color:tab==="scan"?"#171717":"#9ca3af",
                    boxShadow:tab==="scan"?"0 1px 3px rgba(0,0,0,0.08)":"none",
                  }}>
                    <Camera style={{ width:14,height:14 }} /> Scan QR
                  </button>
                </div>
              </div>

              {tab === "tables" ? (
                /* ── TABLE GRID WITH REALTIME SEAT AVAILABILITY ── */
                loadingTables ? (
                  <div style={{ padding:"32px 0",textAlign:"center",fontSize:12,color:"#9ca3af" }}>Loading tables...</div>
                ) : (
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8 }}>
                    {tables.map(tbl => {
                      const cur = tbl.qrCodeToken === currentTableToken;
                      const short = tbl.tableNumber.replace(/^Table\s*/i,"").trim() || tbl.tableNumber;
                      const cap = tbl.capacity || 4;
                      const avail = tbl.availableSeats !== undefined ? tbl.availableSeats : cap;
                      const isFull = avail <= 0;

                      return (
                        <button
                          key={tbl.id}
                          type="button"
                          onClick={() => initiateTableChoice(tbl)}
                          style={{
                            position:"relative",
                            padding:"12px 6px 10px",
                            borderRadius:14,
                            textAlign:"center",
                            cursor:isFull ? "not-allowed" : "pointer",
                            transition:"all 0.15s",
                            border:cur ? "2px solid #12372A" : isFull ? "1px solid #fee2e2" : "1px solid #E5E2D9",
                            backgroundColor:cur ? "#12372A" : isFull ? "#fef2f2" : "#FAF9F6",
                            color:cur ? "white" : isFull ? "#991b1b" : "#171717",
                            opacity:isFull ? 0.75 : 1,
                          }}
                        >
                          <Utensils style={{ width:14,height:14,margin:"0 auto 4px",color:cur ? "#C9A227" : isFull ? "#ef4444" : "#9ca3af" }} />
                          <div style={{ fontSize:13,fontWeight:900 }}>{short}</div>

                          {/* Seat Availability Badge */}
                          <div style={{
                            fontSize:9,
                            fontWeight:800,
                            marginTop:3,
                            color:cur ? "#a7f3d0" : isFull ? "#dc2626" : avail <= 2 ? "#d97706" : "#059669",
                          }}>
                            {isFull ? "FULL" : `${avail}/${cap} free`}
                          </div>

                          {cur && <CheckCircle2 style={{ position:"absolute",top:4,right:4,width:13,height:13,color:"#34d399" }} />}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                /* ── QR SCANNER ── */
                <div>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display:"none" }} />
                  <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />

                  {isSecure && !cameraFailed ? (
                    <div>
                      <div style={{ position:"relative",backgroundColor:"#000",borderRadius:14,overflow:"hidden",minHeight:240 }}>
                        <div id={liveScanId} style={{ width:"100%",minHeight:240 }} />
                        {!scannerReady && !scanError && (
                          <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",backgroundColor:"#111",gap:10 }}>
                            <div style={{ width:36,height:36,border:"3px solid rgba(255,255,255,0.15)",borderTopColor:"#C9A227",borderRadius:"50%",animation:"qrs 1s linear infinite" }} />
                            <div style={{ fontSize:12,color:"rgba(255,255,255,0.6)" }}>Opening camera...</div>
                            <style>{`@keyframes qrs{to{transform:rotate(360deg)}}`}</style>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop:12,display:"flex",gap:8 }}>
                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={processing}
                          style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"8px 12px",borderRadius:12,backgroundColor:"#FAF9F6",border:"1px solid #E5E2D9",color:"#171717",fontSize:11,fontWeight:700,cursor:"pointer" }}
                        >
                          <Camera style={{ width:13,height:13,color:"#12372A" }} />
                          <span>Take Photo</span>
                        </button>
                        <button
                          onClick={() => galleryInputRef.current?.click()}
                          disabled={processing}
                          style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"8px 12px",borderRadius:12,backgroundColor:"#FAF9F6",border:"1px solid #E5E2D9",color:"#171717",fontSize:11,fontWeight:700,cursor:"pointer" }}
                        >
                          <ImageIcon style={{ width:13,height:13,color:"#12372A" }} />
                          <span>Upload QR</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign:"center",padding:"16px 0" }}>
                      <div style={{ width:68,height:68,borderRadius:18,backgroundColor:"#f5f5f4",border:"2px dashed #E5E2D9",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                        {processing ? (
                          <Loader2 style={{ width:28,height:28,color:"#12372A",animation:"qrs 1s linear infinite" }} />
                        ) : (
                          <Camera style={{ width:28,height:28,color:"#12372A" }} />
                        )}
                        <style>{`@keyframes qrs{to{transform:rotate(360deg)}}`}</style>
                      </div>

                      <div style={{ fontSize:14,fontWeight:800,color:"#171717",marginBottom:4 }}>
                        {processing ? "Decoding QR Code..." : "Scan Table QR Code"}
                      </div>
                      <div style={{ fontSize:11,color:"#6B7280",marginBottom:16,lineHeight:1.4,maxWidth:260,margin:"0 auto 16px" }}>
                        {processing
                          ? "Analyzing image with high-accuracy QR engines..."
                          : "Take a clear, centered photo of your table's QR code."}
                      </div>

                      {!processing && (
                        <div style={{ display:"flex",flexDirection:"column",gap:8,alignItems:"center" }}>
                          <button
                            onClick={() => cameraInputRef.current?.click()}
                            style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",maxWidth:240,padding:"11px 18px",borderRadius:14,backgroundColor:"#12372A",color:"white",fontSize:13,fontWeight:800,cursor:"pointer",border:"none" }}
                          >
                            <Camera style={{ width:16,height:16,color:"#C9A227" }} />
                            <span>Open Camera</span>
                          </button>

                          <button
                            onClick={() => galleryInputRef.current?.click()}
                            style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",maxWidth:240,padding:"8px 14px",borderRadius:12,backgroundColor:"#FAF9F6",border:"1px solid #E5E2D9",color:"#4B5563",fontSize:11,fontWeight:700,cursor:"pointer" }}
                          >
                            <ImageIcon style={{ width:13,height:13,color:"#12372A" }} />
                            <span>Choose from Gallery / Files</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {scanError && (
                    <div style={{ marginTop:12,fontSize:11,color:"#b91c1c",backgroundColor:"#fef2f2",padding:"10px 12px",borderRadius:12,border:"1px solid #fecaca",textAlign:"center",lineHeight:1.4 }}>
                      <div style={{ fontWeight:700,marginBottom:2 }}>{scanError}</div>
                      <div style={{ color:"#6B7280",fontSize:10,marginTop:4 }}>
                        Tip: You can also pick an available table directly from the <strong style={{ color:"#12372A",cursor:"pointer" }} onClick={()=>setTab("tables")}>Select Table</strong> tab above.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

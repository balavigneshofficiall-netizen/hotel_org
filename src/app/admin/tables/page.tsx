"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Grid,
  QrCode,
  RefreshCw,
  Plus,
  Users,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Download,
  Printer,
  Eye,
  Pencil,
  X,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import QrCodeModal from "@/components/admin/QrCodeModal";
import ManualOrderModal from "@/components/admin/ManualOrderModal";

export default function TablesManagementPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "AVAILABLE" | "OCCUPIED" | "RESERVED">("ALL");
  const [selectedTableForQr, setSelectedTableForQr] = useState<any | null>(null);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [manualOrderTableId, setManualOrderTableId] = useState<number | null>(null);

  // Add Table state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [newFloor, setNewFloor] = useState<string>("Main Dining");
  const [addingTable, setAddingTable] = useState(false);

  // Edit Table state
  const [editingTable, setEditingTable] = useState<any | null>(null);
  const [editTableNumber, setEditTableNumber] = useState<string>("");
  const [editCapacity, setEditCapacity] = useState<number>(4);
  const [editFloor, setEditFloor] = useState<string>("Main Dining");
  const [updatingTable, setUpdatingTable] = useState(false);

  const [networkBaseUrl, setNetworkBaseUrl] = useState<string>(
    typeof window !== "undefined" ? window.location.origin : "http://10.117.226.228:3000"
  );

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tables");
      const data = await res.json();
      if (res.ok) {
        setTables(data.tables || []);
        if (data.networkBaseUrl) {
          setNetworkBaseUrl(data.networkBaseUrl);
        }
      }
    } catch (err) {
      console.error("Failed to load tables:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleResetTable = async (tableId: string) => {
    if (!confirm("Are you sure you want to mark this table Free / Available?")) return;

    try {
      await fetch("/api/admin/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, action: "RESET_TABLE" }),
      });
      fetchTables();
    } catch (err) {
      console.error("Failed to reset table:", err);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;

    try {
      setAddingTable(true);
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: newTableNumber.trim(),
          capacity: Math.max(1, Number(newCapacity) || 4),
          floor: newFloor.trim() || "Main Dining",
        }),
      });

      if (res.ok) {
        setNewTableNumber("");
        setNewCapacity(4);
        setNewFloor("Main Dining");
        setShowAddModal(false);
        fetchTables();
      }
    } catch (err) {
      console.error("Failed to add table:", err);
    } finally {
      setAddingTable(false);
    }
  };

  const openEditModal = (tbl: any) => {
    setEditingTable(tbl);
    setEditTableNumber(tbl.tableNumber || "");
    setEditCapacity(tbl.capacity || 4);
    setEditFloor(tbl.floor || "Main Dining");
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    try {
      setUpdatingTable(true);
      const res = await fetch("/api/admin/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: editingTable.id,
          tableNumber: editTableNumber.trim(),
          capacity: Math.max(1, Number(editCapacity) || 4),
          floor: editFloor.trim(),
        }),
      });

      if (res.ok) {
        setEditingTable(null);
        fetchTables();
      }
    } catch (err) {
      console.error("Failed to update table:", err);
    } finally {
      setUpdatingTable(false);
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      const res = await fetch(`/api/admin/tables?id=${tableId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete table");
        return;
      }
      setEditingTable(null);
      fetchTables();
    } catch (err) {
      console.error("Failed to delete table:", err);
      alert("Failed to delete table");
    }
  };

  const filteredTables = tables.filter((t) => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  const currency = "₹";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E2D9] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#171717] tracking-tight">
            Tables & Seat Capacities
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Configure member capacities, visual occupancy & printable QR codes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTables}
            className="p-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#6B7280] transition"
            title="Refresh tables"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setManualOrderTableId(null);
              setShowManualOrderModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1e5843] hover:from-[#0d281e] hover:to-[#174635] active:scale-98 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>New Order</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#171717] active:scale-98 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#12372A]" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(["ALL", "AVAILABLE", "OCCUPIED", "RESERVED"] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === st
                ? "bg-[#12372A] text-white shadow-2xs"
                : "bg-white border border-[#E5E2D9] text-[#6B7280] hover:text-[#171717]"
            }`}
          >
            {st === "ALL" ? "All Tables" : st}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((tbl) => {
          const cap = tbl.capacity || 4;
          const occupied = tbl.occupiedSeats || 0;
          const available = tbl.availableSeats !== undefined ? tbl.availableSeats : Math.max(0, cap - occupied);
          const isFull = available === 0 || tbl.status === "OCCUPIED";
          const isShared = occupied > 0 && available > 0;
          const activeOrders = tbl.activeOrders || (tbl.activeOrder ? [tbl.activeOrder] : []);

          return (
            <div
              key={tbl.id}
              className={`bg-white rounded-3xl p-5 border-2 transition-all space-y-3.5 shadow-2xs hover:shadow-md ${
                isFull
                  ? "border-red-200 hover:border-red-400"
                  : isShared
                  ? "border-amber-200 hover:border-amber-400"
                  : "border-[#E5E2D9] hover:border-[#12372A]/40"
              }`}
            >
              {/* Card top */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-[#171717]">
                      {tbl.tableNumber}
                    </h3>
                    <button
                      onClick={() => openEditModal(tbl)}
                      className="p-1 rounded-lg hover:bg-stone-100 text-[#6B7280] hover:text-[#12372A] transition"
                      title="Edit Seat Capacity"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[11px] text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                    <span>{tbl.floor}</span>
                    <span>·</span>
                    <strong className="text-[#12372A] font-extrabold">{cap} Seats Capacity</strong>
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                    isFull
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : isShared
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isFull ? "bg-red-500" : isShared ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  <span>{isFull ? "Full" : isShared ? "Shared" : "Free"}</span>
                </span>
              </div>

              {/* Seat occupancy bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#6B7280] mb-1">
                  <span>Seats Occupied</span>
                  <span className={isFull ? "text-red-700 font-extrabold" : isShared ? "text-amber-700 font-extrabold" : "text-emerald-700 font-extrabold"}>
                    {occupied} / {cap} ({available} free)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFull ? "bg-red-500" : isShared ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (occupied / cap) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Active Orders snippet */}
              {activeOrders.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activeOrders.map((ord: any) => (
                    <div key={ord.id} className="bg-[#FAF9F6] rounded-2xl p-2.5 border border-[#E5E2D9] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#171717]">#{ord.orderNumber}</span>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Users className="w-2.5 h-2.5 text-amber-700" />
                          <span>{ord.guestCount || 1} {ord.guestCount === 1 ? "Guest" : "Guests"}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#171717]">
                        <span className="truncate text-[11px] font-medium text-[#6B7280]">{ord.customerName}</span>
                        <span className="font-extrabold text-[#12372A]">
                          {currency}{ord.totalAmount?.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#FAF9F6] rounded-2xl p-3 border border-[#E5E2D9] text-center text-xs text-[#6B7280] font-medium">
                  Ready for new guests ({cap} seats free)
                </div>
              )}

              {/* Actions row: View QR, Edit Capacity, Reset/Print */}
              <div className="pt-2 border-t border-black/5 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setManualOrderTableId(tbl.id);
                    setShowManualOrderModal(true);
                  }}
                  className="flex-1 py-2 px-2 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                  title="Punch manual order for this table"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Order</span>
                </button>

                <button
                  onClick={() => setSelectedTableForQr(tbl)}
                  className="py-2 px-2 rounded-xl border border-[#E5E2D9] hover:bg-stone-50 text-[#171717] text-xs font-bold flex items-center justify-center gap-1 transition"
                  title="View / Print QR"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#12372A]" />
                  <span className="hidden sm:inline">QR</span>
                </button>

                <button
                  onClick={() => openEditModal(tbl)}
                  className="flex-1 py-2 px-2 rounded-xl border border-[#E5E2D9] hover:bg-stone-50 text-[#171717] text-xs font-bold flex items-center justify-center gap-1 transition"
                  title="Edit Seat Capacity & Details"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-700" />
                  <span>Seats</span>
                </button>

                {(isFull || occupied > 0) ? (
                  <button
                    onClick={() => handleResetTable(tbl.id)}
                    className="py-2 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-red-600 text-xs font-bold flex items-center justify-center gap-1 transition"
                    title="Reset to Available"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedTableForQr(tbl)}
                    className="py-2 px-2.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] text-white text-xs font-bold flex items-center justify-center gap-1 transition"
                    title="Print QR"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Printable Modal */}
      <QrCodeModal
        isOpen={Boolean(selectedTableForQr)}
        onClose={() => setSelectedTableForQr(null)}
        table={selectedTableForQr}
        networkBaseUrl={networkBaseUrl}
      />

      {/* ═══ ADD TABLE MODAL (With Seat Capacity) ═══ */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 border border-[#E5E2D9] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-[#171717]">
                  Add New Dining Table
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Specify table number and maximum seat capacity
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              {/* Table Number */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Table Number / Name
                </label>
                <input
                  type="text"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. Table 09"
                  className="w-full px-3 py-2 text-xs bg-[#F7F5EF] border border-[#E5E2D9] rounded-xl text-[#171717] font-bold focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  required
                />
              </div>

              {/* Seat Capacity */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#171717]">
                    Seat Capacity (Max Members)
                  </label>
                  <span className="text-xs font-black text-[#12372A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {newCapacity} Seats
                  </span>
                </div>

                {/* Quick preset chips */}
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {[2, 4, 6, 8, 10, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNewCapacity(num)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition border ${
                        newCapacity === num
                          ? "bg-[#12372A] text-white border-[#12372A]"
                          : "bg-[#FAF9F6] text-[#171717] border-[#E5E2D9] hover:bg-stone-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCapacity(Math.max(1, newCapacity - 1))}
                    className="w-9 h-9 rounded-xl border border-[#E5E2D9] bg-stone-50 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center py-2 text-xs bg-[#F7F5EF] border border-[#E5E2D9] rounded-xl font-black text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setNewCapacity(newCapacity + 1)}
                    className="w-9 h-9 rounded-xl border border-[#E5E2D9] bg-stone-50 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Floor / Section */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Floor / Dining Section
                </label>
                <input
                  type="text"
                  value={newFloor}
                  onChange={(e) => setNewFloor(e.target.value)}
                  placeholder="e.g. Main Dining, AC Hall, Verandah"
                  className="w-full px-3 py-2 text-xs bg-[#F7F5EF] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {["Main Dining", "AC Hall", "Verandah", "Rooftop"].map((fl) => (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => setNewFloor(fl)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition ${
                        newFloor === fl
                          ? "bg-[#12372A] text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {fl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTable}
                  className="px-5 py-2 rounded-xl bg-[#12372A] text-white text-xs font-bold shadow-xs hover:bg-[#0e2b21] flex items-center gap-1.5"
                >
                  {addingTable ? "Creating..." : `Create Table (${newCapacity} Seats)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT TABLE MODAL (Update Capacity & Details) ═══ */}
      {editingTable && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingTable(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 border border-[#E5E2D9] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-[#171717]">
                  Edit Table Capacity
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Update seat capacity for {editingTable.tableNumber}
                </p>
              </div>
              <button
                onClick={() => setEditingTable(null)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTable} className="space-y-4">
              {/* Table Name */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Table Name
                </label>
                <input
                  type="text"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F7F5EF] border border-[#E5E2D9] rounded-xl text-[#171717] font-bold focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  required
                />
              </div>

              {/* Seat Capacity */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#171717]">
                    Max Seat Capacity (Members Allowed)
                  </label>
                  <span className="text-xs font-black text-[#12372A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {editCapacity} Seats
                  </span>
                </div>

                {/* Quick preset chips */}
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {[2, 4, 6, 8, 10, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEditCapacity(num)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition border ${
                        editCapacity === num
                          ? "bg-[#12372A] text-white border-[#12372A]"
                          : "bg-[#FAF9F6] text-[#171717] border-[#E5E2D9] hover:bg-stone-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCapacity(Math.max(1, editCapacity - 1))}
                    className="w-9 h-9 rounded-xl border border-[#E5E2D9] bg-stone-50 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center py-2 text-xs bg-[#F7F5EF] border border-[#E5E2D9] rounded-xl font-black text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setEditCapacity(editCapacity + 1)}
                    className="w-9 h-9 rounded-xl border border-[#E5E2D9] bg-stone-50 font-black text-sm flex items-center justify-center hover:bg-stone-100 active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Floor / Section */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Floor / Dining Section
                </label>
                <input
                  type="text"
                  value={editFloor}
                  onChange={(e) => setEditFloor(e.target.value)}
                  placeholder="e.g. Main Dining, AC Hall, Verandah"
                  className="w-full px-3 py-2 text-xs bg-[#F7F5EF] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {["Main Dining", "AC Hall", "Verandah", "Rooftop"].map((fl) => (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => setEditFloor(fl)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition ${
                        editFloor === fl
                          ? "bg-[#12372A] text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {fl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currently occupied notice */}
              {editingTable.occupiedSeats > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-900 leading-tight">
                  <strong>Notice:</strong> Currently <strong>{editingTable.occupiedSeats} seats</strong> are in use by active diners.
                  {editCapacity < editingTable.occupiedSeats && (
                    <span className="block text-red-600 font-bold mt-1">
                      ⚠️ Warning: New capacity ({editCapacity}) is less than current diners ({editingTable.occupiedSeats})!
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteTable(editingTable.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 flex items-center gap-1 transition"
                  title="Delete Table"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTable(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingTable}
                    className="px-5 py-2 rounded-xl bg-[#12372A] text-white text-xs font-bold shadow-xs hover:bg-[#0e2b21] flex items-center gap-1.5"
                  >
                    {updatingTable ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Order Modal */}
      <ManualOrderModal
        isOpen={showManualOrderModal}
        onClose={() => {
          setShowManualOrderModal(false);
          setManualOrderTableId(null);
        }}
        initialTableId={manualOrderTableId}
        onOrderCreated={() => {
          fetchTables();
        }}
      />
    </div>
  );
}

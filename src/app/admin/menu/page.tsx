"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  UtensilsCrossed,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  Sparkles,
  Clock,
  X,
  Leaf,
  FileSpreadsheet,
  Download,
  UploadCloud,
} from "lucide-react";
import ProductModal from "@/components/admin/ProductModal";
import MenuExcelModal from "@/components/admin/MenuExcelModal";

function MenuManagementInner() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | number>("all");
  const [vegFilter, setVegFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [urlCategoryApplied, setUrlCategoryApplied] = useState(false);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<"IMPORT" | "EXPORT">("IMPORT");

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/menu");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories || []);
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to load admin menu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Auto-select category from URL ?category=ID on first load
  useEffect(() => {
    if (!urlCategoryApplied && urlCategory && categories.length > 0) {
      const catId = Number(urlCategory);
      const exists = categories.some((c) => c.id === catId);
      if (exists) {
        setSelectedCategory(catId);
      }
      setUrlCategoryApplied(true);
    }
  }, [urlCategory, categories, urlCategoryApplied]);

  // Toggle dish availability instantly with optimistic update
  const handleToggleAvailability = async (productId: number, currentVal: boolean) => {
    try {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: !currentVal } : p))
      );

      await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, isAvailable: !currentVal }),
      });
    } catch (err) {
      console.error("Failed to toggle availability:", err);
      fetchMenu();
    }
  };

  // Save product (Add or Edit)
  const handleSaveProduct = async (productData: any) => {
    if (productData.id) {
      await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
    } else {
      await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
    }
    fetchMenu();
  };

  // Delete product
  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}" from the menu?`)) return;

    try {
      await fetch(`/api/admin/menu?id=${productId}`, { method: "DELETE" });
      fetchMenu();
    } catch (err) {
      console.error("Failed to delete dish:", err);
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.categoryId !== Number(selectedCategory)) return false;
      if (vegFilter === "VEG" && !p.isVeg) return false;
      if (vegFilter === "NON_VEG" && p.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.ingredients?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, vegFilter, searchQuery]);

  // Key KPI stats
  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter((p) => p.isAvailable).length;
    const soldOut = total - available;
    const vegCount = products.filter((p) => p.isVeg).length;
    return { total, available, soldOut, vegCount };
  }, [products]);

  const currency = "₹";

  return (
    <div className="space-y-3.5">
      {/* 1. Header Bar: Title, Import/Export & Primary Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#E5E2D9]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
              Menu Management
            </h1>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              {stats.total} Dishes
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5 font-medium">
            Manage food dishes, categories, Excel import/export & live kitchen availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Excel Button */}
          <button
            onClick={() => {
              setExcelModalTab("IMPORT");
              setIsExcelModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 active:scale-95 text-[#12372A] border border-[#E5E2D9] text-xs font-black shadow-2xs transition cursor-pointer group"
            title="Import dishes from Excel (.xlsx)"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#12372A] group-hover:scale-110 transition-transform" />
            <span>Import Excel</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={() => {
              setExcelModalTab("EXPORT");
              setIsExcelModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 active:scale-95 text-[#12372A] border border-[#E5E2D9] text-xs font-black shadow-2xs transition cursor-pointer group"
            title="Export menu as Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227] group-hover:scale-110 transition-transform" />
            <span>Export Excel</span>
          </button>

          {/* Add Food Button */}
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] active:scale-95 text-white text-xs font-black shadow-xs border border-[#C9A227]/30 transition cursor-pointer group"
          >
            <Plus className="w-3.5 h-3.5 text-[#E2B755] group-hover:scale-110 transition-transform" />
            <span>+ Add Food</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchMenu}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#12372A] shadow-2xs transition cursor-pointer"
            title="Refresh menu items"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Bento KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Menu
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-stone-900 leading-none">
                {stats.total}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">items</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              In Stock
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-800 leading-none">
                {stats.available}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">available</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Sold Out
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-rose-700 leading-none">
                {stats.soldOut}
              </span>
              <span className="text-[10px] text-rose-600 font-medium">paused</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Pure Veg
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-teal-800 leading-none">
                {stats.vegCount}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">dishes</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <Leaf className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Streamlined Clean Filter, Search & View Command Strip */}
      <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-[#E5E2D9] shadow-2xs space-y-2">
        {/* Row 1: Search + Veg Segmented + View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Left: Search with clear button */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or ingredients..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs text-[#171717] placeholder:text-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Veg Capsule + Grid/Table Switcher */}
          <div className="flex items-center gap-2">
            {/* Veg / Non-Veg segmented capsule */}
            <div className="inline-flex items-center p-0.5 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
              <button
                onClick={() => setVegFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  vegFilter === "ALL"
                    ? "bg-white text-[#171717] shadow-2xs font-black"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setVegFilter("VEG")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  vegFilter === "VEG"
                    ? "bg-white text-emerald-800 shadow-2xs font-black"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Veg</span>
              </button>
              <button
                onClick={() => setVegFilter("NON_VEG")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  vegFilter === "NON_VEG"
                    ? "bg-white text-red-800 shadow-2xs font-black"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                <span>Non-Veg</span>
              </button>
            </div>

            {/* Grid / Table Layout Switcher */}
            <div className="inline-flex items-center p-0.5 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
              <button
                onClick={() => setViewMode("GRID")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  viewMode === "GRID"
                    ? "bg-[#12372A] text-white shadow-2xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
                title="Photo Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode("TABLE")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-[#12372A] text-white shadow-2xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
                title="Spreadsheet Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Category Pill Capsule Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#E5E2D9]/60">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition cursor-pointer whitespace-nowrap shadow-2xs ${
              selectedCategory === "all"
                ? "bg-[#12372A] text-white ring-2 ring-[#12372A]/20"
                : "bg-stone-100 hover:bg-stone-200 text-stone-700"
            }`}
          >
            All Items ({products.length})
          </button>

          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            const isSelected = selectedCategory === c.id;

            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#12372A] text-white shadow-2xs ring-2 ring-[#12372A]/20"
                    : "bg-[#FAF9F6] border border-[#E5E2D9] text-[#6B7280] hover:text-[#171717] hover:bg-white"
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-stone-200/80 text-stone-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Products Display (Grid View or Table View) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E5E2D9] text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 text-stone-500 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-[#171717]">No Dishes Found</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            No dishes match your selected filters or search keyword. Try clearing filters, adding a new dish, or importing from Excel.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setVegFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-[#12372A] text-white text-xs font-bold hover:bg-[#0e2b21] transition cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={() => {
                setExcelModalTab("IMPORT");
                setIsExcelModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-white border border-[#E5E2D9] text-[#12372A] text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
            >
              Import from Excel
            </button>
          </div>
        </div>
      ) : viewMode === "GRID" ? (
        /* VISUAL PHOTO CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
            const isAvailable = p.isAvailable;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  isAvailable
                    ? "border-[#E5E2D9] hover:border-[#12372A]/40"
                    : "border-red-200 bg-stone-50/50 opacity-90"
                }`}
              >
                <div>
                  {/* Photo with Overlay Badges */}
                  <div className="relative w-full h-38 bg-stone-100 overflow-hidden group">
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized={p.imageUrl.startsWith("/uploads/")}
                    />

                    {/* Veg / Non-veg badge */}
                    <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 border border-black/5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p.isVeg ? "bg-emerald-600" : "bg-red-600"
                        }`}
                      />
                      <span className="text-[9px] font-black text-stone-800">
                        {p.isVeg ? "VEG" : "NON-VEG"}
                      </span>
                    </div>

                    {/* Chef's Pick / Popular badge */}
                    {p.isPopular && (
                      <div className="absolute top-2 right-2 z-10 bg-[#C9A227] text-stone-950 px-2 py-0.5 rounded-full text-[9px] font-black shadow-xs flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Special</span>
                      </div>
                    )}

                    {/* Prep time badge */}
                    {p.prepTimeMinutes && (
                      <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-[#E2B755]" />
                        <span>{p.prepTimeMinutes}m</span>
                      </div>
                    )}

                    {/* Sold out overlay tag */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow-md">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          {p.category?.name || "Main Course"}
                        </span>
                        <h3 className="font-extrabold text-sm text-[#171717] line-clamp-1 leading-tight">
                          {p.name}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-[#12372A]">
                          {currency}
                          {p.price}
                        </div>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <div className="text-[10px] text-stone-400 line-through">
                            {currency}
                            {p.originalPrice}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-[#6B7280] line-clamp-2 leading-relaxed">
                      {p.description || "Freshly cooked to order with signature authentic recipes."}
                    </p>
                  </div>
                </div>

                {/* Footer Controls: In-Stock Toggle & Actions */}
                <div className="p-2.5 bg-[#FAF9F6] border-t border-[#E5E2D9] flex items-center justify-between gap-2">
                  {/* Availability Button Toggle */}
                  <button
                    onClick={() => handleToggleAvailability(p.id, isAvailable)}
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer select-none shadow-2xs ${
                      isAvailable
                        ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300"
                        : "bg-red-100 hover:bg-red-200 text-red-900 border border-red-300"
                    }`}
                    title="Click to toggle availability"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAvailable ? "bg-emerald-600" : "bg-red-600"
                      }`}
                    />
                    <span>{isAvailable ? "Available" : "Sold Out"}</span>
                  </button>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setIsProductModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#E5E2D9] bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                      title="Edit dish"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 transition cursor-pointer"
                      title="Delete dish"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SPREADSHEET TABLE VIEW */
        <div className="bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#6B7280] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Image</th>
                  <th className="py-2.5 px-4 font-bold">Dish Details</th>
                  <th className="py-2.5 px-4 font-bold">Category</th>
                  <th className="py-2.5 px-4 font-bold">Price</th>
                  <th className="py-2.5 px-4 font-bold text-center">Status</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredProducts.map((p) => {
                  const isAvailable = p.isAvailable;

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF9F6] transition">
                      <td className="py-2 px-4">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-stone-100 border border-[#E5E2D9] shrink-0">
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                            unoptimized={p.imageUrl.startsWith("/uploads/")}
                          />
                        </div>
                      </td>

                      <td className="py-2 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              p.isVeg ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                          <span className="font-extrabold text-[#171717]">{p.name}</span>
                          {p.isPopular && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#C9A227] text-stone-950">
                              Special
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B7280] line-clamp-1 max-w-sm mt-0.5">
                          {p.description}
                        </p>
                      </td>

                      <td className="py-2 px-4 font-semibold text-[#6B7280]">
                        {p.category?.name || "Main Course"}
                      </td>

                      <td className="py-2 px-4 font-extrabold text-[#12372A]">
                        {currency}
                        {p.price}
                      </td>

                      {/* Instant Toggle */}
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => handleToggleAvailability(p.id, isAvailable)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition shadow-2xs ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          <span>{isAvailable ? "Available" : "Sold Out"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-[#E5E2D9] hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                            title="Edit dish"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition cursor-pointer"
                            title="Delete dish"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Add / Edit Modal with Image Upload */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        categories={categories}
        editingProduct={editingProduct}
        onSave={handleSaveProduct}
      />

      {/* Excel Import / Export Modal */}
      <MenuExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        categories={categories}
        products={products}
        onImportSuccess={fetchMenu}
        initialTab={excelModalTab}
      />
    </div>
  );
}

export default function MenuManagementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="text-xs text-stone-500 font-bold">Loading menu...</div></div>}>
      <MenuManagementInner />
    </Suspense>
  );
}

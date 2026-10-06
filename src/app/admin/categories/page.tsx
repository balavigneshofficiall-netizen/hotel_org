"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Filter,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Flame,
  UtensilsCrossed,
  Soup,
  Wheat,
  IceCream,
  Coffee,
  GlassWater,
  Fish,
  Salad,
  Pizza,
  Tag,
  Hash,
  Search,
  LayoutGrid,
  List,
  Layers,
  ArrowRight,
} from "lucide-react";

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number };
}

export const ICON_OPTIONS = [
  { value: "UtensilsCrossed", label: "Meals / Thali", Icon: UtensilsCrossed, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  { value: "Flame", label: "Biriyani / Spicy", Icon: Flame, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { value: "Sparkles", label: "Chef Special", Icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "Soup", label: "Starters & Soups", Icon: Soup, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  { value: "Wheat", label: "Tiffin & Breads", Icon: Wheat, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "IceCream", label: "Desserts & Sweets", Icon: IceCream, color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200" },
  { value: "Coffee", label: "Hot Beverages", Icon: Coffee, color: "text-stone-700", bg: "bg-stone-100", border: "border-stone-200" },
  { value: "GlassWater", label: "Coolers & Juices", Icon: GlassWater, color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200" },
  { value: "Fish", label: "Seafood", Icon: Fish, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { value: "Salad", label: "Healthy & Salads", Icon: Salad, color: "text-lime-700", bg: "bg-lime-50", border: "border-lime-200" },
  { value: "Pizza", label: "Snacks & Fast Food", Icon: Pizza, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  { value: "Tag", label: "General Tag", Icon: Tag, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
];

function getIconData(iconName: string | null) {
  return ICON_OPTIONS.find((o) => o.value === iconName) || ICON_OPTIONS[0];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("UtensilsCrossed");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Master sorted list by sortOrder
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories]);

  // Toggle isActive with optimistic update
  const handleToggleActive = async (cat: CategoryItem) => {
    const nextState = !cat.isActive;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isActive: nextState } : c))
    );

    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isActive: nextState }),
      });
      if (!res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, isActive: cat.isActive } : c))
        );
      }
    } catch {
      fetchCategories();
    }
  };

  // Reorder category position
  const handleMove = async (cat: CategoryItem, direction: "up" | "down") => {
    const idx = sortedCategories.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedCategories.length) return;
    const other = sortedCategories[swapIdx];

    try {
      setCategories((prev) =>
        prev
          .map((c) => {
            if (c.id === cat.id) return { ...c, sortOrder: other.sortOrder };
            if (c.id === other.id) return { ...c, sortOrder: cat.sortOrder };
            return c;
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );

      await Promise.all([
        fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cat.id, sortOrder: other.sortOrder }),
        }),
        fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: other.id, sortOrder: cat.sortOrder }),
        }),
      ]);
    } catch {
      fetchCategories();
    }
  };

  // Delete category
  const handleDelete = async (cat: CategoryItem) => {
    if (cat._count.products > 0) {
      alert(
        `Cannot delete "${cat.name}" — it currently has ${cat._count.products} dish(es) assigned. Please move or reassign them in Menu Items first.`
      );
      return;
    }
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete category");
        return;
      }
      fetchCategories();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Open modal for add
  const openAddModal = () => {
    setEditingCategory(null);
    setFormName("");
    setFormDescription("");
    setFormIcon("UtensilsCrossed");
    setFormSortOrder(
      categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 1
    );
    setErrorMsg("");
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormIcon(cat.icon || "UtensilsCrossed");
    setFormSortOrder(cat.sortOrder);
    setErrorMsg("");
    setModalOpen(true);
  };

  // Save (add or edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("Please enter a category name.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      if (editingCategory) {
        await fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCategory.id,
            name: formName.trim(),
            description: formDescription.trim() || null,
            icon: formIcon,
            sortOrder: Number(formSortOrder) || 1,
          }),
        });
      } else {
        await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            icon: formIcon,
            sortOrder: Number(formSortOrder) || 1,
          }),
        });
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  // Filter categories
  const filteredCategories = useMemo(() => {
    return sortedCategories.filter((c) => {
      if (statusFilter === "ACTIVE" && !c.isActive) return false;
      if (statusFilter === "INACTIVE" && c.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sortedCategories, statusFilter, searchQuery]);

  const totalDishes = categories.reduce((s, c) => s + c._count.products, 0);
  const activeCount = categories.filter((c) => c.isActive).length;
  const hiddenCount = categories.length - activeCount;

  // Selected icon component for modal preview
  const selectedIconData = getIconData(formIcon);
  const ModalPreviewIcon = selectedIconData.Icon;

  return (
    <div className="space-y-4 w-full">
      {/* 1. Header Bar: Navigation Capsule + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E2D9]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] flex items-center justify-center shadow-xs border border-[#C9A227]/30">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
              Categories
            </h1>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              {categories.length} Sections
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 font-medium">
            Organize customer menu sections, tab sequence & live visibility
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick link to Menu */}
          <Link
            href="/admin/menu"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-[#E5E2D9] text-xs font-bold shadow-2xs transition cursor-pointer"
            title="View menu items"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Menu Items</span>
          </Link>

          {/* Add Category Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] active:scale-95 text-white text-xs font-black shadow-xs border border-[#C9A227]/30 transition cursor-pointer group"
          >
            <Plus className="w-4 h-4 text-[#E2B755] group-hover:scale-110 transition-transform" />
            <span>+ Add Category</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#E5E2D9] hover:bg-stone-50 text-[#12372A] shadow-2xs transition cursor-pointer"
            title="Refresh categories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Bento KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Sections
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-stone-900 leading-none">
                {categories.length}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">categories</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
            <Layers className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Visible on Menu
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-800 leading-none">
                {activeCount}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">live tabs</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <Eye className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Hidden Tabs
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-stone-700 leading-none">
                {hiddenCount}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">paused</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 flex items-center justify-center">
            <EyeOff className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E5E2D9] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Assigned Dishes
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-800 leading-none">
                {totalDishes}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">items</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <UtensilsCrossed className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* 3. Streamlined Filter & View Bar */}
      <div className="bg-white rounded-2xl p-2.5 border border-[#E5E2D9] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category name or slug..."
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

        {/* Right: Visibility Filter Capsule + Layout Switcher */}
        <div className="flex items-center gap-2">
          {/* Status Segmented Capsule */}
          <div className="inline-flex items-center p-0.5 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white text-[#171717] shadow-2xs font-black"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              All ({categories.length})
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-800 shadow-2xs font-black"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Visible ({activeCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-stone-800 shadow-2xs font-black"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
              <span>Hidden ({hiddenCount})</span>
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
              title="Cards Grid View"
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

      {/* 4. Category Display (Grid or Table) */}
      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-3xl border border-[#E5E2D9]">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#12372A]" />
            <p className="text-xs text-[#6B7280] font-bold">Loading menu categories...</p>
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E5E2D9] text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 text-stone-500 flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-[#171717]">No Categories Found</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            No category matches your filter or search query. Create a new section or reset your search.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold hover:bg-stone-200 transition cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-[#12372A] text-white text-xs font-bold hover:bg-[#0e2b21] transition cursor-pointer"
            >
              + Create Category
            </button>
          </div>
        </div>
      ) : viewMode === "GRID" ? (
        /* DISTINCTIVE ACCENT CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => {
            const iconData = getIconData(cat.icon);
            const IconComp = iconData.Icon;

            const isFirst = sortedCategories.findIndex((c) => c.id === cat.id) === 0;
            const isLast =
              sortedCategories.findIndex((c) => c.id === cat.id) ===
              sortedCategories.length - 1;

            return (
              <div
                key={cat.id}
                className={`group/card rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between hover:-translate-y-0.5 ${
                  cat.isActive
                    ? "bg-white border border-[#E5E2D9] shadow-xs hover:shadow-lg"
                    : "bg-stone-50/80 border border-dashed border-stone-300 opacity-75 hover:opacity-90"
                }`}
              >
                {/* ── Colored Accent Header Band ── */}
                <div className={`relative px-4 pt-4 pb-3 ${iconData.bg}`}>
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

                  <div className="relative flex items-start justify-between">
                    {/* Hero Icon + Title */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-white/80 backdrop-blur-sm ${iconData.border} border-2 flex items-center justify-center shadow-sm group-hover/card:scale-105 transition-transform duration-300`}
                      >
                        <IconComp className={`w-5.5 h-5.5 ${iconData.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-[13px] text-[#171717] tracking-tight line-clamp-1" title={cat.name}>
                          {cat.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-stone-500 bg-white/70 px-1.5 py-0.5 rounded-md">
                            <Hash className="w-2 h-2" />
                            Tab {cat.sortOrder}
                          </span>
                          <span className="text-[9px] font-mono text-stone-400">
                            {cat.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black transition cursor-pointer select-none ${
                        cat.isActive
                          ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                          : "bg-stone-400 text-white shadow-sm hover:bg-stone-500"
                      }`}
                      title={cat.isActive ? "Click to hide" : "Click to show"}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? "bg-emerald-300" : "bg-stone-300"}`} />
                      {cat.isActive ? "Live" : "Off"}
                    </button>
                  </div>
                </div>

                {/* ── Card Body ── */}
                <div className="px-4 py-3 flex-1 space-y-2.5">
                  {/* Description */}
                  <p className="text-[11px] text-[#6B7280] line-clamp-2 leading-relaxed min-h-[2.2rem]">
                    {cat.description || "Menu section for restaurant customers."}
                  </p>

                  {/* Dishes Quick-Link */}
                  <Link
                    href={`/admin/menu?category=${cat.id}`}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-gradient-to-r from-[#12372A]/[0.04] to-[#C9A227]/[0.06] border border-[#E5E2D9] hover:border-[#C9A227]/50 text-xs font-black text-[#12372A] hover:bg-white transition-all group/link"
                    title={`View all ${cat._count.products} dishes in this category`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-[#12372A] flex items-center justify-center">
                        <UtensilsCrossed className="w-3 h-3 text-[#E2B755]" />
                      </div>
                      <span>{cat._count.products} {cat._count.products === 1 ? "Dish" : "Dishes"}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover/link:text-[#12372A] group-hover/link:translate-x-0.5 transition-all" />
                  </Link>
                </div>

                {/* ── Bottom Action Footer ── */}
                <div className="px-3 py-2 bg-[#FAF9F6] border-t border-[#E5E2D9]/70 flex items-center justify-between">
                  {/* Reorder — dark green pill */}
                  <div className="inline-flex items-center gap-0.5 bg-gradient-to-r from-[#12372A] to-[#1A4535] rounded-lg p-0.5">
                    <button
                      onClick={() => handleMove(cat, "up")}
                      disabled={isFirst}
                      className={`p-1.5 rounded-md transition ${
                        isFirst
                          ? "text-white/20 cursor-not-allowed"
                          : "text-white/80 hover:text-[#E2B755] hover:bg-white/10 cursor-pointer active:scale-90"
                      }`}
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(cat, "down")}
                      disabled={isLast}
                      className={`p-1.5 rounded-md transition ${
                        isLast
                          ? "text-white/20 cursor-not-allowed"
                          : "text-white/80 hover:text-[#E2B755] hover:bg-white/10 cursor-pointer active:scale-90"
                      }`}
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Edit (green) & Delete (red) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200 transition cursor-pointer active:scale-90"
                      title="Edit category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={cat._count.products > 0}
                      className={`p-1.5 rounded-lg border transition ${
                        cat._count.products > 0
                          ? "bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed"
                          : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-800 cursor-pointer active:scale-90"
                      }`}
                      title={
                        cat._count.products > 0
                          ? `${cat._count.products} dishes assigned — reassign first`
                          : "Delete category"
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Add Card */}
          <button
            onClick={openAddModal}
            className="group rounded-2xl border-2 border-dashed border-[#E5E2D9] bg-gradient-to-br from-white to-stone-50 hover:from-emerald-50/50 hover:to-amber-50/30 hover:border-[#12372A]/30 transition-all duration-300 flex flex-col items-center justify-center p-8 gap-3 text-center cursor-pointer min-h-[220px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <Plus className="w-6 h-6 text-[#E2B755]" />
            </div>
            <div>
              <p className="font-black text-sm text-[#171717]">Create New Category</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Add another section to customer menu
              </p>
            </div>
          </button>
        </div>
      ) : (
        /* HIGH-DENSITY SPREADSHEET TABLE VIEW */
        <div className="bg-white rounded-2xl border border-[#E5E2D9] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#6B7280] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 font-bold text-center">Tab Order</th>
                  <th className="py-2.5 px-4 font-bold">Category</th>
                  <th className="py-2.5 px-4 font-bold">Description</th>
                  <th className="py-2.5 px-4 font-bold text-center">Dishes</th>
                  <th className="py-2.5 px-4 font-bold text-center">Menu Visibility</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredCategories.map((cat) => {
                  const iconData = getIconData(cat.icon);
                  const IconComp = iconData.Icon;

                  const isFirst = sortedCategories.findIndex((c) => c.id === cat.id) === 0;
                  const isLast =
                    sortedCategories.findIndex((c) => c.id === cat.id) ===
                    sortedCategories.length - 1;

                  return (
                    <tr key={cat.id} className="hover:bg-[#FAF9F6] transition">
                      {/* Sort Order */}
                      <td className="py-2 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md text-[11px]">
                          #{cat.sortOrder}
                        </div>
                      </td>

                      {/* Name & Icon */}
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg ${iconData.bg} ${iconData.border} border flex items-center justify-center shrink-0`}
                          >
                            <IconComp className={`w-3.5 h-3.5 ${iconData.color}`} />
                          </div>
                          <div>
                            <span className="font-extrabold text-[#171717] block">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              #{cat.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-2 px-4 text-[#6B7280] max-w-xs truncate">
                        {cat.description || "-"}
                      </td>

                      {/* Dishes count */}
                      <td className="py-2 px-4 text-center">
                        <Link
                          href={`/admin/menu?category=${cat.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-stone-100 hover:bg-stone-200 text-[#12372A] transition"
                        >
                          <UtensilsCrossed className="w-3 h-3 text-[#C9A227]" />
                          <span>{cat._count.products}</span>
                        </Link>
                      </td>

                      {/* Visibility Toggle */}
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(cat)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black transition cursor-pointer shadow-2xs ${
                            cat.isActive
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-stone-100 text-stone-600 border border-stone-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cat.isActive ? "bg-emerald-600" : "bg-stone-400"
                            }`}
                          />
                          <span>{cat.isActive ? "Visible" : "Hidden"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleMove(cat, "up")}
                            disabled={isFirst}
                            className={`p-1 rounded transition ${
                              isFirst
                                ? "text-stone-300 cursor-not-allowed"
                                : "text-stone-600 hover:bg-stone-100"
                            }`}
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(cat, "down")}
                            disabled={isLast}
                            className={`p-1 rounded transition ${
                              isLast
                                ? "text-stone-300 cursor-not-allowed"
                                : "text-stone-600 hover:bg-stone-100"
                            }`}
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1 rounded text-stone-600 hover:bg-stone-100 hover:text-[#12372A] transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            disabled={cat._count.products > 0}
                            className={`p-1 rounded transition ${
                              cat._count.products > 0
                                ? "text-stone-300 cursor-not-allowed"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                            title={
                              cat._count.products > 0
                                ? "Cannot delete category with dishes"
                                : "Delete"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* 5. Add / Edit Category Modal with Live Preview */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5E2D9] overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#12372A] to-[#1E4D3C] text-white flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C9A227]/25 text-[#E2B755] border border-[#C9A227]/40 flex items-center justify-center font-black">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                    {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category"}
                  </h2>
                  <p className="text-[10px] text-emerald-200/80 font-medium">
                    Configure section title, visual icon & customer tab sequence
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Live Preview Card */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Live Tab Preview
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Customer Menu Preview
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#12372A] text-white font-bold text-xs shadow-xs">
                    <ModalPreviewIcon className="w-3.5 h-3.5 text-[#E2B755]" />
                    <span>{formName.trim() || "Category Name"}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-[#FAF9F6]">
                      #{formSortOrder || 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Name */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Biriyani, Starters, Tiffin..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] font-semibold focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  required
                />
              </div>

              {/* Icon Picker Grid */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1.5">
                  Select Visual Icon (12 Options)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ICON_OPTIONS.map((item) => {
                    const IconComp = item.Icon;
                    const isSelected = formIcon === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setFormIcon(item.value)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          isSelected
                            ? "border-[#12372A] bg-emerald-50/70 ring-2 ring-[#12372A]/20 shadow-xs"
                            : "border-[#E5E2D9] bg-[#FAF9F6] hover:bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                          <IconComp className={`w-3.5 h-3.5 ${item.color}`} />
                        </div>
                        <span className="text-[9px] font-bold text-stone-700 truncate max-w-full text-center">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short tagline or note for this category..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A] resize-none"
                />
              </div>

              {/* Tab Sequence Sort Order */}
              <div>
                <label className="text-xs font-bold text-[#171717] block mb-1">
                  Tab Position (Sort Order)
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] font-mono focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Lower numbers (e.g. 1, 2) appear first on the customer menu tabs.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-[#C9A227] stroke-[3]" />
                  )}
                  <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

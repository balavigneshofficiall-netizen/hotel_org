"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  Users,
  Check,
  Loader2,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Grid,
  Receipt,
  Sparkles,
  ChefHat,
  Flame,
  CheckCircle2,
  Coffee,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  isVeg: boolean;
  imageUrl?: string | null;
  categoryId: number;
  category?: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
  products: Product[];
}

interface TableItem {
  id: number;
  tableNumber: string;
  capacity: number;
  floor?: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
  activeOrdersCount?: number;
  activeOrder?: any;
  activeOrders?: any[];
}

interface CartItem {
  product: Product;
  quantity: number;
  specialInstructions: string;
}

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: any) => void;
  initialTableId?: number | null;
}

// Category palette for colorful tags
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Starters & Appetizers": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "Biryani & Rice": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  "South Indian Curries & Gravies": { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  "Tandoori & Indian Breads": { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  "Desserts & Sweets": { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  "Beverages & Fresh Juices": { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
};

function getCategoryColor(name?: string) {
  if (!name) return { bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-200" };
  return CATEGORY_COLORS[name] || { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" };
}

export default function ManualOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  initialTableId,
}: ManualOrderModalProps) {
  // Step: 1. "CHOOSE_TABLE" -> 2. "SELECT_MENU"
  const [step, setStep] = useState<"CHOOSE_TABLE" | "SELECT_MENU">("CHOOSE_TABLE");

  // Order Mode: Dine-In vs Takeaway
  const [orderSource, setOrderSource] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");

  // Tables & Menu data
  const [tables, setTables] = useState<TableItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [orderInstructions, setOrderInstructions] = useState<string>("");

  // Split Table / Re-order state
  const [promptTable, setPromptTable] = useState<TableItem | null>(null);
  const [isSplitGroup, setIsSplitGroup] = useState<boolean>(false);
  const [splitSuffix, setSplitSuffix] = useState<string>("");
  const [targetSessionId, setTargetSessionId] = useState<number | null>(null);

  // Menu Search & Filters in Step 2
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "ALL">("ALL");
  const [dietFilter, setDietFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");

  // Cart State
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [editingNoteProductId, setEditingNoteProductId] = useState<number | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        if (promptTable) {
          setPromptTable(null);
        } else if (step === "SELECT_MENU" && !initialTableId) {
          setStep("CHOOSE_TABLE");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, step, initialTableId, promptTable, onClose]);

  const currency = "₹";

  // Fetch Tables & Menu on Mount
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      try {
        setLoadingData(true);
        setErrorMsg(null);
        const [tablesRes, menuRes] = await Promise.all([
          fetch("/api/admin/tables"),
          fetch("/api/menu"),
        ]);

        const [tablesJson, menuJson] = await Promise.all([
          tablesRes.json(),
          menuRes.json(),
        ]);

        if (isMounted) {
          const fetchedTables: TableItem[] = tablesJson.tables || [];
          setTables(fetchedTables);

          // If initialTableId provided, jump directly to menu with that table
          if (initialTableId) {
            setSelectedTableId(initialTableId);
            setOrderSource("DINE_IN");
            setStep("SELECT_MENU");
            const foundTable = fetchedTables.find((t) => t.id === initialTableId);
            if (foundTable) {
              setGuestCount(Math.min(foundTable.capacity || 2, 2));
            }
          } else {
            setStep("CHOOSE_TABLE");
            setSelectedTableId(null);
          }

          if (menuJson.categories) {
            setCategories(menuJson.categories);
          }
        }
      } catch (err) {
        console.error("Failed to load tables or menu:", err);
        if (isMounted) setErrorMsg("Failed to load tables and menu items.");
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialTableId]);

  // Flattened products for Step 2
  const allProducts = useMemo(() => {
    const list: Product[] = [];
    categories.forEach((cat) => {
      if (cat.products && Array.isArray(cat.products)) {
        cat.products.forEach((prod) => {
          list.push({
            ...prod,
            categoryId: cat.id,
            category: { id: cat.id, name: cat.name },
          });
        });
      }
    });
    return list;
  }, [categories]);

  // Filtered products for Step 2
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      if (selectedCategoryId !== "ALL" && product.categoryId !== selectedCategoryId) {
        return false;
      }
      if (dietFilter === "VEG" && !product.isVeg) return false;
      if (dietFilter === "NON_VEG" && product.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesCat = product.category?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      return true;
    });
  }, [allProducts, selectedCategoryId, dietFilter, searchQuery]);

  // Quick stats for Step 1
  const freeTablesCount = tables.filter((t) => t.status === "AVAILABLE" && (!t.activeOrdersCount || t.activeOrdersCount === 0)).length;
  const activeTablesCount = tables.length - freeTablesCount;

  // Select Table Action: checks if occupied to offer Re-order or Split Table
  const handleSelectTable = (table: TableItem) => {
    if (table.activeOrdersCount && table.activeOrdersCount > 0) {
      setPromptTable(table);
      return;
    }

    // Free table -> Direct fresh order
    setSelectedTableId(table.id);
    setIsSplitGroup(false);
    setSplitSuffix("");
    setTargetSessionId(null);
    setOrderSource("DINE_IN");
    setGuestCount(Math.min(table.capacity || 2, 2));
    setStep("SELECT_MENU");
  };

  // Option 1: Add to Current Order (Re-order for existing family)
  const handleChooseAddToExisting = (table: TableItem) => {
    setSelectedTableId(table.id);
    setIsSplitGroup(false);
    setSplitSuffix("");
    const existingSessionId = table.activeOrders?.[0]?.sessionId || null;
    setTargetSessionId(existingSessionId);
    setOrderSource("DINE_IN");
    setGuestCount(Math.min(table.capacity || 2, 2));
    setPromptTable(null);
    setStep("SELECT_MENU");
  };

  // Option 2: New Group / Split Table (e.g. Table 08-B for sharing table)
  const handleChooseNewSplit = (table: TableItem) => {
    setSelectedTableId(table.id);
    setIsSplitGroup(true);
    const count = table.activeOrdersCount || 1;
    const nextSuffix = String.fromCharCode(65 + count); // count 1 -> 'B', count 2 -> 'C'
    setSplitSuffix(nextSuffix);
    setTargetSessionId(null);
    setOrderSource("DINE_IN");
    setGuestCount(Math.min(table.capacity || 2, 2));
    setPromptTable(null);
    setStep("SELECT_MENU");
  };

  // Select Takeaway Action -> Proceed to Menu
  const handleSelectTakeaway = () => {
    setSelectedTableId(null);
    setIsSplitGroup(false);
    setSplitSuffix("");
    setTargetSessionId(null);
    setOrderSource("TAKEAWAY");
    setStep("SELECT_MENU");
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev[product.id];
      if (existing) {
        return {
          ...prev,
          [product.id]: {
            ...existing,
            quantity: existing.quantity + 1,
          },
        };
      }
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: 1,
          specialInstructions: "",
        },
      };
    });
  };

  const decrementInCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const updateItemNote = (productId: number, note: string) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      return {
        ...prev,
        [productId]: {
          ...existing,
          specialInstructions: note,
        },
      };
    });
  };

  // Cart Calculations
  const cartItemsList = Object.values(cart);
  const totalItemCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItemsList.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const taxAmount = Number(((subtotal * 5) / 100).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));

  // Selected Table Details
  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // Handle Place Order Submit
  const handlePlaceOrder = async () => {
    if (cartItemsList.length === 0) {
      setErrorMsg("Please select at least one item from the menu.");
      return;
    }

    if (orderSource === "DINE_IN" && !selectedTableId) {
      setErrorMsg("Please select a table for Dine-In orders.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        orderSource,
        tableId: orderSource === "DINE_IN" ? selectedTableId : null,
        guestCount: orderSource === "DINE_IN" ? guestCount : 1,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        status: "PENDING",
        isSplitGroup,
        splitSuffix: isSplitGroup ? splitSuffix : undefined,
        targetSessionId: !isSplitGroup ? targetSessionId : undefined,
        specialInstructions: orderInstructions.trim() || undefined,
        items: cartItemsList.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions.trim() || undefined,
        })),
      };

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      const tableLabel = isSplitGroup
        ? `${selectedTable?.tableNumber}-${splitSuffix}`
        : selectedTable?.tableNumber || "Order";

      setSuccessToast(
        isSplitGroup
          ? `Split Table #${tableLabel} placed! Sent to incoming queue.`
          : targetSessionId
          ? `Added to #${tableLabel}'s running bill! Sent to incoming queue.`
          : `Order #${data.order.orderNumber} placed! Sent to incoming queue.`
      );

      if (onOrderCreated) {
        onOrderCreated(data.order);
      }

      setTimeout(() => {
        setCart({});
        setCustomerName("");
        setCustomerPhone("");
        setOrderInstructions("");
        setIsSplitGroup(false);
        setSplitSuffix("");
        setTargetSessionId(null);
        setPromptTable(null);
        setStep("CHOOSE_TABLE");
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Order creation error:", err);
      setErrorMsg(err.message || "An error occurred while creating order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#FAF8F5] via-[#F5F2EB] to-[#ECE7DC] flex flex-col h-screen w-screen overflow-hidden select-none animate-in fade-in duration-200 font-sans">
      {/* ═══ TOP NAVBAR: SLEEK & VIBRANT ═══ */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-stone-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Tight back arrow + Gradient Title */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (step === "SELECT_MENU" && !initialTableId) {
                setStep("CHOOSE_TABLE");
              } else {
                onClose();
              }
            }}
            className="p-1.5 -ml-1 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer flex items-center justify-center active:scale-95"
            title={step === "SELECT_MENU" && !initialTableId ? "Back to Table Selection" : "Back (Esc)"}
          >
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#12372A] to-emerald-600 flex items-center justify-center text-white shadow-xs">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#C9A227]" />
            </div>
            <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
              Manual Order
            </h1>
          </div>
        </div>

        {/* Right: Current selection & Close button */}
        <div className="flex items-center gap-2.5">
          {step === "SELECT_MENU" && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-xs font-semibold text-stone-800 border border-stone-200 shadow-xs">
              {orderSource === "DINE_IN" ? (
                <>
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-black text-stone-900">
                    {isSplitGroup && splitSuffix
                      ? `${selectedTable?.tableNumber}-${splitSuffix}`
                      : selectedTable?.tableNumber || "Table"}
                  </span>
                  <span className="text-stone-300">·</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isSplitGroup
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs"
                        : targetSessionId
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs"
                        : "bg-stone-100 text-stone-600 font-semibold"
                    }`}
                  >
                    {isSplitGroup
                      ? "Split Table"
                      : targetSessionId
                      ? "Running Order"
                      : selectedTable?.floor || "Main Dining"}
                  </span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-black text-amber-900">Takeaway / Parcel</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1: CHOOSE TABLE SCREEN (Colourful, pretty & lively)
         ═══════════════════════════════════════════════════════════════ */}
      {step === "CHOOSE_TABLE" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-5xl space-y-6">
            {/* Header row with stats & Takeaway card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200/80">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                    Choose Table
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {freeTablesCount} Free
                    </span>
                    {activeTablesCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                        {activeTablesCount} Active
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
                  Select a table to start punching. Tap active tables to re-order or split.
                </p>
              </div>

              {/* Takeaway / Parcel Button (Sunset Gradient) */}
              <button
                type="button"
                onClick={handleSelectTakeaway}
                className="group px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-3 active:scale-98 cursor-pointer shrink-0"
              >
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-black leading-tight text-white drop-shadow-xs">Takeaway / Parcel</div>
                  <div className="text-[10px] text-amber-100 font-semibold">Direct Counter Order</div>
                </div>
                <ArrowRight className="w-4 h-4 text-white ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Tables Grid */}
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-24 text-stone-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#12372A]" />
                <p className="text-xs font-bold text-stone-600">Loading tables...</p>
              </div>
            ) : tables.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-stone-200 p-12 text-center text-stone-400 max-w-md mx-auto shadow-sm">
                <Grid className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-700">No tables found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
                {tables.map((table) => {
                  const hasActive = (table.activeOrdersCount || 0) > 0;
                  const isAvailable = table.status === "AVAILABLE" && !hasActive;

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => handleSelectTable(table)}
                      className={`group text-left p-5 sm:p-6 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-xl hover:-translate-y-1 active:scale-98 cursor-pointer ${
                        isAvailable
                          ? "bg-gradient-to-br from-white via-white to-emerald-50/50 border-emerald-200/90 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/10"
                          : "bg-gradient-to-br from-white via-amber-50/40 to-orange-50/60 border-amber-300 hover:border-amber-500 hover:ring-2 hover:ring-amber-500/15"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                              isAvailable
                                ? "bg-emerald-600 text-white"
                                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAvailable ? "bg-white" : "bg-white animate-pulse"
                              }`}
                            />
                            <span>{isAvailable ? "Free" : "Active"}</span>
                          </span>

                          <span className="text-xs font-bold text-stone-500 flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-full">
                            <Users className="w-3 h-3 text-stone-500" />
                            {table.capacity}
                          </span>
                        </div>

                        <div>
                          <div className={`text-2xl sm:text-3xl font-black transition-colors ${
                            isAvailable
                              ? "text-stone-900 group-hover:text-emerald-800"
                              : "text-stone-900 group-hover:text-amber-800"
                          }`}>
                            {table.tableNumber}
                          </div>
                          <div className="text-xs font-semibold text-stone-500 mt-1 truncate">
                            {hasActive
                              ? `${table.activeOrdersCount} order(s) dining`
                              : table.floor || "Main Dining"}
                          </div>
                        </div>
                      </div>

                      <div className={`mt-6 pt-3 border-t flex items-center justify-between text-xs font-black ${
                        isAvailable
                          ? "border-emerald-100 text-emerald-800"
                          : "border-amber-100 text-amber-800"
                      }`}>
                        <span>{hasActive ? "Add or Split" : "Select"}</span>
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform text-[#C9A227]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ PROMPT MODAL: RE-ORDER vs SPLIT TABLE CHOOSER ═══ */}
      {promptTable && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black shadow-sm">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">
                    {promptTable.tableNumber} is Currently Active
                  </h3>
                  <p className="text-xs text-stone-500">
                    {promptTable.floor || "Main Dining"} · {promptTable.activeOrdersCount} order(s) dining
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPromptTable(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current order quick summary */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/80 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-stone-800">
                <span>Current Guest:</span>
                <span className="font-black text-amber-900">
                  {promptTable.activeOrder?.customerName || "Dining Guest"}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 font-medium">
                <span>Running Total:</span>
                <span className="font-black text-stone-900">
                  {currency}{promptTable.activeOrder?.totalAmount || 0}
                </span>
              </div>
            </div>

            {/* Choices */}
            <div className="space-y-3 pt-1">
              <p className="text-xs font-bold text-stone-600">Select order type for this table:</p>

              {/* Option 1: Add to Current Order (Re-order) */}
              <button
                type="button"
                onClick={() => handleChooseAddToExisting(promptTable)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-emerald-300 hover:border-emerald-500 text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-black text-sm text-emerald-950">
                      Add to Current Bill (One More Order)
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-medium mt-1 pl-4.5">
                    Same family ordering extra dishes (Biryani, drinks, etc.). Merged into same bill.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Option 2: New Group / Split Table */}
              <button
                type="button"
                onClick={() => handleChooseNewSplit(promptTable)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-300 hover:border-amber-500 text-left transition flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <span className="font-black text-sm text-amber-950">
                      New Group / Split Table ({promptTable.tableNumber}-B)
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium mt-1 pl-4.5">
                    Another family sharing this table. Creates a separate bill so payments don't mix!
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2: MENU & ORDER PUNCHING SCREEN (Food Images & Colors)
         ═══════════════════════════════════════════════════════════════ */}
      {step === "SELECT_MENU" && (
        <div className="flex-1 flex overflow-hidden">
          {/* ─── LEFT COLUMN: Menu Filters & Food Grid ─── */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-stone-200/80 bg-gradient-to-br from-[#FAF8F5] to-[#F5F1E8]">
            {/* Top Bar: Table Info & Optional Customer Inputs */}
            <div className="bg-white border-b border-stone-200/80 px-4 sm:px-6 py-2.5 shrink-0 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Active Table Details + Guests Stepper */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-[#12372A] to-[#1e5843] text-white rounded-xl shadow-xs">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span className="text-xs font-black">
                      {orderSource === "DINE_IN"
                        ? isSplitGroup && splitSuffix
                          ? `${selectedTable?.tableNumber}-${splitSuffix} (Split)`
                          : targetSessionId
                          ? `${selectedTable?.tableNumber} (Add to Bill)`
                          : selectedTable?.tableNumber
                        : "Takeaway / Parcel"}
                    </span>
                    {orderSource === "DINE_IN" && (
                      <span className="text-[10px] text-emerald-200 font-medium">
                        ({selectedTable?.floor || "Main Dining"})
                      </span>
                    )}
                  </div>

                  {orderSource === "DINE_IN" && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200">
                      <span className="text-xs font-bold text-stone-500">Guests:</span>
                      <button
                        type="button"
                        onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-stone-900">
                        {guestCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGuestCount(guestCount + 1)}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional Customer Inputs */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Name (Optional)"
                      className="w-36 sm:w-44 pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone (Optional)"
                      className="w-32 sm:w-36 pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Search, Categories & Diet Filter Bar */}
            <div className="bg-white border-b border-stone-200/80 px-4 sm:px-6 py-3 shrink-0 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu dishes (Biryani, Dosa, Chicken 65...)"
                    className="w-full pl-10 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Diet Filter Switcher (Colorful Veg / Non-Veg) */}
                <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDietFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      dietFilter === "ALL"
                        ? "bg-white text-stone-900 shadow-xs"
                        : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter("VEG")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      dietFilter === "VEG"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
                        : "text-stone-600 hover:text-emerald-700"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Pure Veg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter("NON_VEG")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      dietFilter === "NON_VEG"
                        ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs"
                        : "text-stone-600 hover:text-rose-700"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Non-Veg</span>
                  </button>
                </div>
              </div>

              {/* Colorful Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId("ALL")}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs ${
                    selectedCategoryId === "ALL"
                      ? "bg-gradient-to-r from-[#12372A] to-emerald-800 text-white shadow-xs ring-2 ring-emerald-600/30"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  All Items ({allProducts.length})
                </button>
                {categories.map((cat) => {
                  const count = cat.products?.length || 0;
                  if (count === 0) return null;
                  const isSelected = selectedCategoryId === cat.id;
                  const catColor = getCategoryColor(cat.name);

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs ${
                        isSelected
                          ? "bg-gradient-to-r from-[#12372A] to-emerald-800 text-white shadow-xs ring-2 ring-emerald-600/30"
                          : `${catColor.bg} ${catColor.text} border ${catColor.border} hover:opacity-90`
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── FOOD DISHES GRID AREA WITH PHOTOS ─── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingData ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#12372A]" />
                  <p className="text-xs font-bold text-stone-600">Loading delicious dishes...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-dashed border-stone-200 max-w-md mx-auto my-12 shadow-sm">
                  <UtensilsCrossed className="w-10 h-10 text-stone-300 mb-2" />
                  <p className="text-sm font-black text-stone-800">No dishes found</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Try adjusting search query or clearing category filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => {
                    const cartItem = cart[product.id];
                    const inCartQty = cartItem ? cartItem.quantity : 0;
                    const catStyle = getCategoryColor(product.category?.name);

                    return (
                      <div
                        key={product.id}
                        className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-0.5 ${
                          inCartQty > 0
                            ? "border-emerald-600 ring-2 ring-emerald-600/20 shadow-md"
                            : "border-stone-200/90 hover:border-emerald-300"
                        }`}
                      >
                        {/* Food Image Banner */}
                        {product.imageUrl ? (
                          <div className="relative w-full h-32 sm:h-36 overflow-hidden bg-stone-100 group">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                            {/* Floating Veg / Non-Veg badge */}
                            <div className="absolute top-2.5 left-2.5">
                              <span
                                className={`w-5 h-5 rounded-md bg-white/95 backdrop-blur-xs border flex items-center justify-center shadow-xs ${
                                  product.isVeg ? "border-emerald-600" : "border-rose-600"
                                }`}
                                title={product.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                              >
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    product.isVeg ? "bg-emerald-600" : "bg-rose-600"
                                  }`}
                                />
                              </span>
                            </div>

                            {/* Floating Category Tag */}
                            <div className="absolute top-2.5 right-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/90 backdrop-blur-xs text-stone-800 shadow-xs truncate max-w-[120px] inline-block">
                                {product.category?.name}
                              </span>
                            </div>

                            {/* Dish Price on image */}
                            <div className="absolute bottom-2 left-2.5">
                              <span className="text-base font-black text-white drop-shadow-md">
                                {currency}{product.price}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Fallback if no image */
                          <div className="p-3 pb-0">
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5 ${
                                  product.isVeg ? "border-emerald-600 bg-emerald-50" : "border-rose-600 bg-rose-50"
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    product.isVeg ? "bg-emerald-600" : "bg-rose-600"
                                  }`}
                                />
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                                {product.category?.name}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Dish Details & Bottom CTA */}
                        <div className="p-3.5 flex flex-col justify-between flex-1">
                          <h3 className="text-xs sm:text-sm font-black text-stone-900 leading-snug line-clamp-2">
                            {product.name}
                          </h3>

                          {/* Bottom Row */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100">
                            {!product.imageUrl && (
                              <span className="text-base font-black text-stone-900">
                                {currency}{product.price}
                              </span>
                            )}

                            {inCartQty > 0 ? (
                              <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#12372A] to-emerald-800 text-white rounded-xl px-2.5 py-1 shadow-xs ml-auto">
                                <button
                                  type="button"
                                  onClick={() => decrementInCart(product.id)}
                                  className="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5 text-white" />
                                </button>
                                <span className="text-xs font-black px-1.5 min-w-[18px] text-center">
                                  {inCartQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addToCart(product)}
                                  className="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(product)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer ml-auto"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN: Order Summary & Bill Terminal (POS Receipt Style) ─── */}
          <aside className="w-full sm:w-96 lg:w-[420px] bg-white flex flex-col justify-between shrink-0 shadow-xl z-10 border-l border-stone-200">
            {/* Colorful Cart Header */}
            <div className="px-5 py-3.5 border-b border-stone-200 bg-gradient-to-r from-[#12372A] to-[#1e5843] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs text-[#C9A227] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white leading-tight">Order Cart</h2>
                  <p className="text-[11px] text-emerald-200 font-medium">
                    {orderSource === "DINE_IN"
                      ? isSplitGroup
                        ? `${selectedTable?.tableNumber}-${splitSuffix} (Split Table)`
                        : targetSessionId
                        ? `${selectedTable?.tableNumber} (Add to Bill)`
                        : `${selectedTable?.tableNumber || "Table"} · ${guestCount} Guests`
                      : "Takeaway Order"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#C9A227] text-stone-950 shadow-xs">
                  {totalItemCount} {totalItemCount === 1 ? "dish" : "dishes"}
                </span>
                {cartItemsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart({})}
                    className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[200px] bg-stone-50/50">
              {cartItemsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-center text-stone-300">
                    <UtensilsCrossed className="w-7 h-7 text-stone-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-stone-700">No dishes selected</p>
                    <p className="text-[11px] text-stone-400 mt-0.5 max-w-[200px] mx-auto">
                      Click '+ Add' on any delicious dish to include it in this order
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cartItemsList.map(({ product, quantity, specialInstructions }) => (
                    <div
                      key={product.id}
                      className="p-3 rounded-2xl border border-stone-200/90 bg-white shadow-2xs hover:shadow-xs transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          {/* Dish thumbnail if available */}
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-2xs border border-stone-200"
                            />
                          ) : (
                            <span
                              className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 mt-0.5 ${
                                product.isVeg ? "border-emerald-600 bg-emerald-50" : "border-rose-600 bg-rose-50"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  product.isVeg ? "bg-emerald-600" : "bg-rose-600"
                                }`}
                              />
                            </span>
                          )}

                          <div>
                            <h4 className="text-xs font-black text-stone-900 leading-snug">
                              {product.name}
                            </h4>
                            <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                              {currency}{product.price} × {quantity} ={" "}
                              <span className="font-black text-emerald-800">
                                {currency}{product.price * quantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stepper + Delete Item */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => decrementInCart(product.id)}
                            className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black min-w-[18px] text-center text-stone-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(product.id)}
                            className="w-6 h-6 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer ml-1"
                            title="Remove dish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Notes */}
                      {editingNoteProductId === product.id ? (
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            value={specialInstructions}
                            onChange={(e) => updateItemNote(product.id, e.target.value)}
                            placeholder="Note: less spicy, no onion..."
                            className="flex-1 px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-[11px] text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingNoteProductId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setEditingNoteProductId(null)}
                            className="px-2.5 py-1 bg-gradient-to-r from-[#12372A] to-emerald-800 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Save
                          </button>
                          {specialInstructions && (
                            <button
                              type="button"
                              onClick={() => {
                                updateItemNote(product.id, "");
                                setEditingNoteProductId(null);
                              }}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete note"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          {specialInstructions ? (
                            <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px]">
                              <span className="text-amber-900 font-medium italic truncate flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-amber-700 shrink-0" />
                                <span className="truncate">{specialInstructions}</span>
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteProductId(product.id)}
                                  className="text-[10px] text-stone-600 hover:text-emerald-800 font-bold cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateItemNote(product.id, "")}
                                  className="text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5 hover:bg-rose-100/60 px-1 py-0.5 rounded transition cursor-pointer"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingNoteProductId(product.id)}
                                className="text-[10px] text-stone-400 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add note</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Billing & Action Footer */}
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-white space-y-3 shrink-0 shadow-lg">
              {/* Cooking instructions input */}
              <div className="relative">
                <ChefHat className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  value={orderInstructions}
                  onChange={(e) => setOrderInstructions(e.target.value)}
                  placeholder="Special instructions for Chef / Kitchen..."
                  className="w-full pl-8.5 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs font-medium"
                />
              </div>

              {/* Bill Summary Box (Crisp & Pretty) */}
              <div className="bg-gradient-to-br from-stone-50 to-[#FAF8F5] p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
                  <span>Subtotal ({totalItemCount} items)</span>
                  <span>
                    {currency}{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
                  <span>GST / Tax (5%)</span>
                  <span>
                    {currency}{taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-base font-black text-stone-900">
                  <span>Total Amount</span>
                  <span className="text-lg font-black text-[#12372A]">
                    {currency}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Error / Success Feedback */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 animate-in fade-in">
                  {errorMsg}
                </div>
              )}
              {successToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{successToast}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep("CHOOSE_TABLE")}
                  disabled={submitting}
                  className="py-3 px-3.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 font-bold text-xs transition cursor-pointer shadow-2xs"
                >
                  Change Table
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submitting || cartItemsList.length === 0}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-[#12372A] hover:from-emerald-800 hover:to-teal-800 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#C9A227]" />
                      <span>
                        {isSplitGroup
                          ? `Place Split Order (${selectedTable?.tableNumber}-${splitSuffix}) · ${currency}${grandTotal.toFixed(2)}`
                          : targetSessionId
                          ? `Add to Table Bill · ${currency}${grandTotal.toFixed(2)}`
                          : `Place Order · ${currency}${grandTotal.toFixed(2)}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

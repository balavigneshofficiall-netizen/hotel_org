"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RestaurantHeader from "@/components/RestaurantHeader";
import AnnouncementSlideshow from "@/components/AnnouncementSlideshow";
import SearchBar, { DietFilter } from "@/components/SearchBar";
import CategoryTabs from "@/components/CategoryTabs";
import FoodCard from "@/components/FoodCard";
import FoodDetailSheet from "@/components/FoodDetailSheet";
import CartBar from "@/components/CartBar";
import CartDrawer from "@/components/CartDrawer";
import TableSwitchModal from "@/components/TableSwitchModal";
import WelcomeCheckinModal from "@/components/WelcomeCheckinModal";
import { MenuSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/EmptyState";
import { HotelData, TableData, CategoryData, ProductData, AnnouncementData } from "@/types";
import { useCart } from "@/context/CartContext";
import {
  Sparkles,
  UtensilsCrossed,
  Flame,
  Soup,
  Wheat,
  IceCream,
  Coffee,
  GlassWater,
  Fish,
  Salad,
  Pizza,
  Tag,
} from "lucide-react";

function getCategoryIcon(slug: string, iconName?: string | null) {
  switch (iconName) {
    case "Flame":
      return <Flame className="w-4 h-4 text-orange-500" />;
    case "Sparkles":
      return <Sparkles className="w-4 h-4 text-[#C9A227]" />;
    case "Soup":
      return <Soup className="w-4 h-4 text-rose-500" />;
    case "Wheat":
      return <Wheat className="w-4 h-4 text-amber-600" />;
    case "IceCream":
      return <IceCream className="w-4 h-4 text-pink-500" />;
    case "UtensilsCrossed":
      return <UtensilsCrossed className="w-4 h-4 text-emerald-600" />;
    case "Coffee":
      return <Coffee className="w-4 h-4 text-stone-600" />;
    case "GlassWater":
      return <GlassWater className="w-4 h-4 text-cyan-500" />;
    case "Fish":
      return <Fish className="w-4 h-4 text-blue-500" />;
    case "Salad":
      return <Salad className="w-4 h-4 text-lime-600" />;
    case "Pizza":
      return <Pizza className="w-4 h-4 text-amber-500" />;
    case "Tag":
      return <Tag className="w-4 h-4 text-indigo-500" />;
  }

  switch (slug) {
    case "popular":
      return <Sparkles className="w-4 h-4 text-[#C9A227]" />;
    case "starters":
      return <Flame className="w-4 h-4 text-orange-500" />;
    case "biriyani":
      return <UtensilsCrossed className="w-4 h-4 text-amber-600" />;
    case "curries":
      return <Soup className="w-4 h-4 text-red-500" />;
    case "breads":
      return <Wheat className="w-4 h-4 text-yellow-600" />;
    case "desserts":
      return <IceCream className="w-4 h-4 text-pink-500" />;
    default:
      return <UtensilsCrossed className="w-4 h-4 text-emerald-600" />;
  }
}

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    tableToken: contextTableToken,
    setTableToken,
    hotelSlug: contextHotelSlug,
    setHotelSlug,
    setTableNumber,
    tableNumber,
    totalItems,
    activeOrderNumber,
    customerName,
    customerPhone,
    guestCount,
  } = useCart();

  const queryHotel = searchParams.get("hotel");
  const queryTable = searchParams.get("table");

  // State for Table Switch Confirmation Modal
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchTargetToken, setSwitchTargetToken] = useState<string | null>(null);
  const [switchTargetLabel, setSwitchTargetLabel] = useState<string>("New Table");
  const [isOrderConflict, setIsOrderConflict] = useState(false);

  // State for Welcome Check-in Modal (Asking name, phone, seat capacity)
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinDismissible, setCheckinDismissible] = useState(false);

  // Determine actual table token:
  // If customer has an active unbilled order on their table, STRICTLY LOCK to contextTableToken!
  const tableToken =
    activeOrderNumber && contextTableToken
      ? contextTableToken
      : queryTable || contextTableToken || "tbl_annapoorna_08";

  const hotelSlug =
    queryHotel ||
    contextHotelSlug ||
    "hotel-annapoorna";

  // Detect table changes and handle smart confirmation
  useEffect(() => {
    if (!queryTable) return;

    // Check if customer scanned a different table than their current active table
    if (contextTableToken && queryTable !== contextTableToken) {
      const targetLabel = queryTable.replace(/^tbl_[a-z0-9]+_0*/i, "Table ");

      // CASE 1: Customer has an ACTIVE LIVE UNBILLED ORDER on their current table!
      if (activeOrderNumber) {
        setSwitchTargetToken(queryTable);
        setSwitchTargetLabel(targetLabel);
        setIsOrderConflict(true);
        setShowSwitchModal(true);
        // STRICTLY LOCK URL TO ACTIVE ORDER TABLE!
        router.replace(`/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(contextTableToken)}`);
        return;
      }

      // CASE 2: Customer has DRAFT ITEMS in their cart!
      if (totalItems > 0) {
        setSwitchTargetToken(queryTable);
        setSwitchTargetLabel(targetLabel);
        setIsOrderConflict(false);
        setShowSwitchModal(true);
        return;
      }
    }

    // CASE 3: Cart is empty and no active order -> Smooth instant switch
    setTableToken(queryTable);
    if (queryHotel) {
      setHotelSlug(queryHotel);
    }
  }, [queryTable, queryHotel, contextTableToken, totalItems, activeOrderNumber, setTableToken, setHotelSlug, hotelSlug, router]);

  const handleConfirmSwitch = () => {
    // STRICT RULE: If active order is in tracking, DO NOT ALLOW SWITCHING!
    if (activeOrderNumber) {
      setShowSwitchModal(false);
      if (contextTableToken) {
        router.replace(`/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(contextTableToken)}`);
      }
      return;
    }

    if (switchTargetToken) {
      setTableToken(switchTargetToken);
    }
    setShowSwitchModal(false);
  };

  const handleCancelSwitch = () => {
    setShowSwitchModal(false);
    // Stay at current table: revert URL back to current table
    if (contextTableToken) {
      router.replace(`/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(contextTableToken)}`);
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [popularProducts, setPopularProducts] = useState<ProductData[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [dietFilter, setDietFilter] = useState<DietFilter>("ALL");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Bottom Sheet State
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);

  // Fetch Menu Data
  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/menu?hotel=${encodeURIComponent(hotelSlug)}&table=${encodeURIComponent(
          tableToken
        )}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load menu");
      }

      setHotel(data.hotel);
      setTable(data.table);
      if (data.table) {
        setTableNumber(data.table.tableNumber);
        if (data.table.qrCodeToken) {
          setTableToken(data.table.qrCodeToken);
        }
      }
      setCategories(data.categories || []);
      setPopularProducts(data.popularProducts || []);
      setAnnouncements(data.announcements || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching menu";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [hotelSlug, tableToken]);

  // Listen to mobile pull-to-refresh
  useEffect(() => {
    const handleRefresh = () => {
      fetchMenu();
    };
    window.addEventListener("app:refresh", handleRefresh);
    return () => window.removeEventListener("app:refresh", handleRefresh);
  }, [hotelSlug, tableToken]);

  // Check if current table is locked (Full or Occupied with 0 seats free)
  const isTableLocked = Boolean(
    table &&
    (table.status === "OCCUPIED" ||
     table.status === "RESERVED" ||
     (table.availableSeats !== undefined && table.availableSeats <= 0)) &&
    !activeOrderNumber
  );

  // Check if diner needs to complete initial check-in (Name, Phone, Seat Capacity)
  useEffect(() => {
    if (loading || !table) return;

    if (isTableLocked) {
      setCheckinDismissible(false);
      setShowCheckinModal(true);
      return;
    }

    const sessionDone =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`annapoorna_checkedin_${table.qrCodeToken}`)
        : null;

    const checkedInTable =
      typeof window !== "undefined"
        ? localStorage.getItem("annapoorna_checked_in_table")
        : null;

    const isFullyCheckedIn = Boolean(
      customerName &&
      customerPhone &&
      (sessionDone === "true" || checkedInTable === table.qrCodeToken)
    );

    if (!isFullyCheckedIn) {
      setCheckinDismissible(false);
      setShowCheckinModal(true);
    }
  }, [loading, table, customerName, customerPhone, isTableLocked]);

  // Filtered Products Calculation
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return categories
      .map((cat) => {
        const products = (cat.products || []).filter((p) => {
          if (dietFilter === "VEG" && !p.isVeg) return false;
          if (dietFilter === "NON_VEG" && p.isVeg) return false;
          if (q) {
            const matchName = p.name.toLowerCase().includes(q);
            const matchDesc = p.description.toLowerCase().includes(q);
            const matchIng = p.ingredients?.toLowerCase().includes(q);
            if (!matchName && !matchDesc && !matchIng) return false;
          }
          return true;
        });

        return { ...cat, products };
      })
      .filter((cat) => {
        if (selectedCategory !== "all" && String(cat.id) !== String(selectedCategory)) {
          return false;
        }
        return cat.products.length > 0;
      });
  }, [categories, searchQuery, dietFilter, selectedCategory]);

  const filteredPopular = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return popularProducts.filter((p) => {
      if (dietFilter === "VEG" && !p.isVeg) return false;
      if (dietFilter === "NON_VEG" && p.isVeg) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [popularProducts, searchQuery, dietFilter]);

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error || !hotel) {
    return (
      <ErrorState
        title="Restaurant Unavailable"
        message={error || "Could not retrieve the digital menu."}
        onRetry={fetchMenu}
      />
    );
  }

  const hasAnyProducts =
    filteredCategories.some((c) => c.products.length > 0) ||
    filteredPopular.length > 0;

  return (
    <div className="flex-1 flex flex-col pb-36">
      {/* Restaurant Header */}
      <RestaurantHeader
        hotel={hotel}
        table={table}
        onOpenCheckin={() => {
          setCheckinDismissible(true);
          setShowCheckinModal(true);
        }}
      />

      {/* Announcement & Offer Slideshow */}
      <AnnouncementSlideshow
        announcements={announcements}
        hotelSlug={hotelSlug}
      />

      {/* Sticky Search & Category Navigation Bar — smoothly coordinated */}
      <div className="sticky top-16 sm:top-18 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5E2D9] py-2 sm:py-2.5 shadow-2xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-2">
          <SearchBar
            query={searchQuery}
            setQuery={setSearchQuery}
            dietFilter={dietFilter}
            setDietFilter={setDietFilter}
          />
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => setSelectedCategory(String(id))}
          />
        </div>
      </div>

      {/* Main Content Area: Full width responsive layout */}
      <main className="w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-10">
        {/* Popular / Chef's Recommendation Section */}
        {!searchQuery && selectedCategory === "all" && filteredPopular.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] flex items-center justify-center shadow-xs border border-[#C9A227]/30 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-stone-900 tracking-tight leading-tight">
                    Popular Dishes & Chef&apos;s Picks
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
                    Our most-loved signature specialties, prepared fresh for your table
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-stone-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full shadow-2xs">
                ⭐ Must Try
              </span>
            </div>

            {/* Responsive Grid: 2 on mobile, 3 on tablet, 5 ON LAPTOP/DESKTOP */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-4">
              {filteredPopular.slice(0, 10).map((product) => (
                <FoodCard
                  key={`pop-${product.id}`}
                  product={product}
                  currency={hotel.currency}
                  onOpenDetails={setSelectedProduct}
                />
              ))}
            </div>
          </section>
        )}

        {/* Categorized Food Sections */}
        {filteredCategories.map((category) => (
          <section key={category.id} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12372A] to-[#1E4D3C] text-[#E2B755] flex items-center justify-center shadow-xs border border-[#C9A227]/30 shrink-0">
                  {getCategoryIcon(category.slug, category.icon)}
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-stone-900 tracking-tight leading-tight">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs font-black text-[#12372A] bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                {category.products.length} {category.products.length === 1 ? "dish" : "dishes"}
              </span>
            </div>

            {/* Responsive Grid: 2 on mobile, 3 on tablet, 5 ON LAPTOP/DESKTOP */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-4">
              {category.products.map((product) => (
                <FoodCard
                  key={product.id}
                  product={product}
                  currency={hotel.currency}
                  onOpenDetails={setSelectedProduct}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Empty state when search yields no dishes */}
        {!hasAnyProducts && (
          <EmptyState
            title="No dishes found"
            description={
              dietFilter === "VEG"
                ? "No pure vegetarian dishes match your search or filter. Try switching to 'All' or clearing search."
                : dietFilter === "NON_VEG"
                ? "No non-vegetarian dishes match your search or filter. Try switching to 'All' or clearing search."
                : "We couldn't find any dishes matching your query. Explore other delicious options!"
            }
            onAction={() => {
              setSearchQuery("");
              setDietFilter("ALL");
              setSelectedCategory("all");
            }}
          />
        )}
      </main>

      {/* Floating Cart Bar (widget on desktop bottom right) */}
      <CartBar currency={hotel.currency} />

      {/* Slide-up Food Details Bottom Sheet Modal */}
      <FoodDetailSheet
        product={selectedProduct}
        currency={hotel.currency}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Slide-up Cart / Checkout Drawer */}
      <CartDrawer hotel={hotel} table={table} />

      {/* Table Switch Confirmation Modal */}
      <TableSwitchModal
        isOpen={showSwitchModal}
        fromTable={tableNumber || "Current Table"}
        toTable={switchTargetLabel}
        itemCount={totalItems}
        hasActiveOrder={isOrderConflict}
        activeOrderNumber={activeOrderNumber}
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
      />

      {/* Welcome Check-in Modal: Prompts Diner Name, Phone & Seat Count */}
      <WelcomeCheckinModal
        isOpen={showCheckinModal || isTableLocked}
        onClose={() => {
          if (!isTableLocked) setShowCheckinModal(false);
        }}
        table={table}
        hotel={hotel}
        canDismiss={!isTableLocked && checkinDismissible}
        onSuccess={() => {
          if (!isTableLocked) setShowCheckinModal(false);
        }}
      />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ProductData, CartItem } from "@/types";

interface CartContextType {
  items: CartItem[];
  addItem: (product: ProductData, quantity?: number, specialInstructions?: string) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  removeItem: (productId: string | number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string | number) => number;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  activeOrderNumber: string | null;
  setActiveOrderNumber: (orderNumber: string | null) => void;
  activeSessionId: string | number | null;
  setActiveSessionId: (sessionId: string | number | null) => void;
  activeOrderId: string | number | null;
  setActiveOrderId: (orderId: string | number | null) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  tableToken: string | null;
  setTableToken: (token: string | null) => void;
  hotelSlug: string;
  setHotelSlug: (slug: string) => void;
  tableNumber: string | null;
  setTableNumber: (tableNum: string | null) => void;
  guestCount: number;
  setGuestCount: (count: number) => void;
  clearSession: () => void;
  customerLogout: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | number | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableToken, setTableTokenState] = useState<string | null>(null);
  const [hotelSlug, setHotelSlugState] = useState<string>("hotel-annapoorna");
  const [tableNumber, setTableNumberState] = useState<string | null>(null);
  const [guestCount, setGuestCountState] = useState<number>(1);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Set table token with automatic cross-table session switching protection
  const setTableToken = useCallback((newToken: string | null) => {
    setTableTokenState((prev) => {
      // If table has changed (e.g. was on Table 01, now customer scans Table 04 QR)
      if (newToken && prev && newToken !== prev) {
        // STRICT LOCK: If customer currently has an active order in tracking, DO NOT ALLOW TABLE SWITCHING!
        const savedOrder = typeof window !== "undefined" ? localStorage.getItem("annapoorna_active_order") : null;
        if (activeOrderNumber || savedOrder) {
          console.warn(`[CartContext] Blocked table switch from ${prev} to ${newToken} because active order #${activeOrderNumber || savedOrder} is present!`);
          return prev;
        }

        console.log(`[CartContext] Switching table from ${prev} to ${newToken}.`);
      }

      if (newToken) {
        try {
          localStorage.setItem("annapoorna_table_token", newToken);
          if (typeof document !== "undefined") {
            document.cookie = `annapoorna_table_token=${encodeURIComponent(newToken)}; path=/; max-age=86400; SameSite=Lax`;
          }
        } catch {}
      } else {
        try {
          localStorage.removeItem("annapoorna_table_token");
          if (typeof document !== "undefined") {
            document.cookie = `annapoorna_table_token=; path=/; max-age=0`;
          }
        } catch {}
      }
      return newToken;
    });
  }, []);

  const setHotelSlug = useCallback((newSlug: string) => {
    setHotelSlugState(newSlug);
    try {
      localStorage.setItem("annapoorna_hotel_slug", newSlug);
    } catch {}
  }, []);

  const setTableNumber = useCallback((num: string | null) => {
    setTableNumberState(num);
    if (num) {
      try {
        localStorage.setItem("annapoorna_table_number", num);
      } catch {}
    } else {
      try {
        localStorage.removeItem("annapoorna_table_number");
      } catch {}
    }
  }, []);

  // Hydrate from localStorage if available
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("annapoorna_cart");
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
      const savedName = localStorage.getItem("annapoorna_cust_name");
      if (savedName) setCustomerName(savedName);
      const savedPhone = localStorage.getItem("annapoorna_cust_phone");
      if (savedPhone) setCustomerPhone(savedPhone);
      const savedActiveOrder = localStorage.getItem("annapoorna_active_order");
      if (savedActiveOrder) setActiveOrderNumber(savedActiveOrder);
      const savedSessionId = localStorage.getItem("annapoorna_session_id");
      if (savedSessionId) setActiveSessionId(savedSessionId);
      const savedOrderId = localStorage.getItem("annapoorna_order_id");
      if (savedOrderId) setActiveOrderId(savedOrderId);
      const savedTableToken = localStorage.getItem("annapoorna_table_token");
      if (savedTableToken) setTableTokenState(savedTableToken);
      const savedHotelSlug = localStorage.getItem("annapoorna_hotel_slug");
      if (savedHotelSlug) setHotelSlugState(savedHotelSlug);
      const savedTableNumber = localStorage.getItem("annapoorna_table_number");
      if (savedTableNumber) setTableNumberState(savedTableNumber);
      const savedGuestCount = localStorage.getItem("annapoorna_guest_count");
      if (savedGuestCount) setGuestCountState(Math.max(1, parseInt(savedGuestCount, 10) || 1));
    } catch {
      // ignore
    } finally {
      setHasHydrated(true);
    }
  }, []);

  const setGuestCount = useCallback((count: number) => {
    const val = Math.max(1, count);
    setGuestCountState(val);
    try {
      localStorage.setItem("annapoorna_guest_count", String(val));
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem("annapoorna_cart", JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (customerName) {
      localStorage.setItem("annapoorna_cust_name", customerName);
    } else {
      localStorage.removeItem("annapoorna_cust_name");
    }
    if (customerPhone) {
      localStorage.setItem("annapoorna_cust_phone", customerPhone);
    } else {
      localStorage.removeItem("annapoorna_cust_phone");
    }
  }, [customerName, customerPhone, hasHydrated]);

  useEffect(() => {
    if (activeOrderNumber) {
      localStorage.setItem("annapoorna_active_order", activeOrderNumber);
    } else if (hasHydrated) {
      localStorage.removeItem("annapoorna_active_order");
    }
  }, [activeOrderNumber, hasHydrated]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem("annapoorna_session_id", String(activeSessionId));
    } else if (hasHydrated) {
      localStorage.removeItem("annapoorna_session_id");
    }
  }, [activeSessionId, hasHydrated]);

  useEffect(() => {
    if (activeOrderId) {
      localStorage.setItem("annapoorna_order_id", String(activeOrderId));
    } else if (hasHydrated) {
      localStorage.removeItem("annapoorna_order_id");
    }
  }, [activeOrderId, hasHydrated]);

  // Check if saved active order is already completed/paid, and clear it if so
  useEffect(() => {
    if (!hasHydrated || !activeOrderNumber) return;

    let isMounted = true;
    async function verifyActiveOrder() {
      try {
        const res = await fetch(`/api/orders/${activeOrderNumber}?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const order = data.order;
          const session = data.sessionData?.session;
          const bill = data.sessionData?.bill || order?.bill;

          const liveStatuses = ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"];
          const hasLiveSessionOrders = session?.orders?.some((o: any) =>
            liveStatuses.includes(o.status)
          );
          const isOrderLive = order?.status ? liveStatuses.includes(order.status) : false;

          // NEVER clear session if the order or its session has active live food orders!
          if (hasLiveSessionOrders || isOrderLive) {
            return;
          }

          const isDone =
            order?.status === "COMPLETED" ||
            session?.isActive === false ||
            Boolean(session?.closedAt) ||
            bill?.paymentStatus === "PAID";

          if (isDone && isMounted) {
            clearSession();
          }
        } else if (res.status === 404 && isMounted) {
          clearSession();
        }
      } catch {
        // ignore
      }
    }

    verifyActiveOrder();
    return () => {
      isMounted = false;
    };
  }, [hasHydrated, activeOrderNumber]);

  // Sync active order by phone number (Enforces 1 customer in 1 table rule)
  useEffect(() => {
    if (!hasHydrated || !customerPhone) return;

    let isMounted = true;
    async function checkPhoneActiveOrder() {
      try {
        const res = await fetch(`/api/customer/active-order?phone=${encodeURIComponent(customerPhone)}&_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasActiveOrder && data.activeOrder && isMounted) {
            setActiveOrderNumber(data.activeOrder.orderNumber);
            setActiveOrderId(data.activeOrder.id);
            setTableTokenState(data.activeOrder.tableToken);
            setTableNumberState(data.activeOrder.tableNumber);
            try {
              localStorage.setItem("annapoorna_active_order", data.activeOrder.orderNumber);
              localStorage.setItem("annapoorna_order_id", String(data.activeOrder.id));
              localStorage.setItem("annapoorna_table_token", data.activeOrder.tableToken);
              localStorage.setItem("annapoorna_table_number", data.activeOrder.tableNumber);
            } catch {}
          }
        }
      } catch (err) {
        // ignore
      }
    }

    checkPhoneActiveOrder();
    return () => {
      isMounted = false;
    };
  }, [customerPhone, hasHydrated]);

  const addItem = useCallback((product: ProductData, quantity = 1, specialInstructions?: string) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => String(i.product.id) === String(product.id));
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
          specialInstructions: specialInstructions ?? next[existingIndex].specialInstructions,
        };
        return next;
      }
      return [...prev, { product, quantity, specialInstructions }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string | number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => String(item.product.id) !== String(productId)));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        String(item.product.id) === String(productId) ? { ...item, quantity } : item
      )
    );
  }, []);

  const removeItem = useCallback((productId: string | number) => {
    setItems((prev) => prev.filter((item) => String(item.product.id) !== String(productId)));
  }, []);

  const clearCart = useCallback(() => {
    setItems((prev) => (prev.length > 0 ? [] : prev));
    try {
      localStorage.removeItem("annapoorna_cart");
    } catch {
      // ignore
    }
  }, []);

  // Clear everything when session is closed (bill settled)
  const clearSession = useCallback(() => {
    setItems((prev) => (prev.length > 0 ? [] : prev));
    setActiveOrderNumber((prev) => (prev !== null ? null : prev));
    setActiveSessionId((prev) => (prev !== null ? null : prev));
    setActiveOrderId((prev) => (prev !== null ? null : prev));
    try {
      localStorage.removeItem("annapoorna_cart");
      localStorage.removeItem("annapoorna_active_order");
      localStorage.removeItem("annapoorna_session_id");
      localStorage.removeItem("annapoorna_order_id");
    } catch {
      // ignore
    }
  }, []);

  const customerLogout = useCallback(() => {
    setCustomerName("");
    setCustomerPhone("");
    try {
      localStorage.removeItem("annapoorna_cust_name");
      localStorage.removeItem("annapoorna_cust_phone");
    } catch {
      // ignore
    }
  }, []);

  const getItemQuantity = useCallback((productId: string | number) => {
    const item = items.find((i) => String(i.product.id) === String(productId));
    return item ? item.quantity : 0;
  }, [items]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const contextValue = React.useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      getItemQuantity,
      totalItems,
      subtotal,
      isCartOpen,
      setIsCartOpen,
      activeOrderNumber,
      setActiveOrderNumber,
      activeSessionId,
      setActiveSessionId,
      activeOrderId,
      setActiveOrderId,
      customerName,
      setCustomerName,
      customerPhone,
      setCustomerPhone,
      tableToken,
      setTableToken,
      hotelSlug,
      setHotelSlug,
      tableNumber,
      setTableNumber,
      guestCount,
      setGuestCount,
      clearSession,
      customerLogout,
    }),
    [
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      getItemQuantity,
      totalItems,
      subtotal,
      isCartOpen,
      activeOrderNumber,
      activeSessionId,
      activeOrderId,
      customerName,
      customerPhone,
      tableToken,
      setTableToken,
      hotelSlug,
      setHotelSlug,
      tableNumber,
      setTableNumber,
      guestCount,
      setGuestCount,
      clearSession,
      customerLogout,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}


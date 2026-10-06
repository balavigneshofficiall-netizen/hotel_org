export const OrderStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  PREPARING: "PREPARING",
  READY: "READY",
  SERVED: "SERVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  CASH: "CASH",
  UPI: "UPI",
  CARD: "CARD",
  ONLINE: "ONLINE",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const TableStatus = {
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  RESERVED: "RESERVED",
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  KITCHEN: "KITCHEN",
  STAFF: "STAFF",
  CASHIER: "CASHIER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export interface HotelData {
  id: number | string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  whatsappMode?: "DISABLED" | "PAID" | string;
  whatsappPhoneId?: string | null;
  whatsappAccessToken?: string | null;
  whatsappBusinessId?: string | null;
  notificationSound?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  coverImage?: string | null;
  currency: string;
  taxRate: number;
  primaryColor: string;
  accentColor: string;
}

export interface TableData {
  id: number | string;
  hotelId: number | string;
  tableNumber: string;
  qrCodeToken: string;
  capacity: number;
  floor?: string | null;
  status: TableStatus;
  occupiedSeats?: number;
  availableSeats?: number;
  activeOrdersCount?: number;
}

export interface CategoryData {
  id: number | string;
  hotelId: number | string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  sortOrder: number;
  products?: ProductData[];
}

export interface ProductData {
  id: number | string;
  hotelId: number | string;
  categoryId: number | string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  imageUrl: string;
  isVeg: boolean;
  isPopular: boolean;
  isAvailable: boolean;
  rating: number;
  reviewsCount: number;
  prepTimeMinutes: number;
  ingredients?: string | null;
}

export interface CartItem {
  product: ProductData;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderItemData {
  id: number | string;
  orderId: number | string;
  productId?: number | string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  specialInstructions?: string | null;
  isVeg: boolean;
  isCancelled?: boolean;
  isServed?: boolean;
  servedAt?: string | Date | null;
  imageUrl?: string | null;
}

export interface OrderStatusHistoryData {
  id: number | string;
  orderId: number | string;
  status: OrderStatus;
  note?: string | null;
  changedAt: string | Date;
}

export interface NotificationData {
  id: number | string;
  orderId?: number | string | null;
  customerId?: number | string | null;
  title: string;
  body: string;
  icon?: string | null;
  isRead: boolean;
  sentAt: string | Date;
}

export const OrderSource = {
  DINE_IN: "DINE_IN",
  TAKEAWAY: "TAKEAWAY",
  SWIGGY: "SWIGGY",
  ZOMATO: "ZOMATO",
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export interface OrderData {
  id: number | string;
  orderNumber: string;
  hotelId: number | string;
  tableId?: number | string | null;
  customerId?: number | string | null;
  customerName: string;
  customerPhone: string;
  guestCount?: number;
  status: OrderStatus;
  orderSource?: OrderSource;
  externalOrderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  riderStatus?: string | null;
  otp?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  specialInstructions?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  sessionId?: number | string | null;
  session?: {
    id: number | string;
    sessionCode: string;
    isActive: boolean;
    startedAt: string | Date;
    closedAt?: string | Date | null;
  } | null;
  hotel?: HotelData;
  table?: TableData | null;
  items: OrderItemData[];
  statusHistory: OrderStatusHistoryData[];
  notifications?: NotificationData[];
  bill?: BillData | null;
}

export interface AggregatorIntegrationData {
  id: number | string;
  hotelId: number | string;
  platform: OrderSource;
  isEnabled: boolean;
  storeId?: string | null;
  apiKey?: string | null;
  webhookSecret?: string | null;
  autoAccept: boolean;
  prepTime: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SessionData {
  id: number | string;
  hotelId: number | string;
  tableId: number | string;
  customerId?: number | string | null;
  sessionCode: string;
  isActive: boolean;
  startedAt: string | Date;
  closedAt?: string | Date | null;
  orders?: OrderData[];
  table?: TableData;
  hotel?: HotelData;
}

export interface BillData {
  id: number | string;
  orderId: number | string;
  hotelId: number | string;
  billNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  pdfUrl?: string | null;
  generatedAt: string | Date;
  paidAt?: string | Date | null;
  order?: OrderData;
}

export interface AnnouncementData {
  id: number | string;
  hotelId: number | string;
  text: string;
  badge?: string | null;
  icon?: string | null;
  theme?: string | null;
  linkUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

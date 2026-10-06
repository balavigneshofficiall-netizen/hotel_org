import { EventEmitter } from "events";

// Global EventEmitter singleton across hot-reloads
const globalForEvents = globalThis as unknown as {
  orderEvents: EventEmitter | undefined;
};

export const orderEventEmitter =
  globalForEvents.orderEvents ?? new EventEmitter();

// Allow unlimited listeners for SSE clients
orderEventEmitter.setMaxListeners(500);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.orderEvents = orderEventEmitter;
}

export interface OrderUpdateEvent {
  orderId: number | string;
  orderNumber: string;
  hotelId: number | string;
  tableNumber: string;
  status: string;
  timestamp: string;
  note?: string;
}

export function notifyOrderStatusChange(event: OrderUpdateEvent) {
  orderEventEmitter.emit(`order:${event.orderId}`, event);
  if (event.orderNumber) {
    orderEventEmitter.emit(`order:${event.orderNumber}`, event);
  }
  orderEventEmitter.emit(`hotel:${event.hotelId}`, event);
  orderEventEmitter.emit("order:any", event);
}

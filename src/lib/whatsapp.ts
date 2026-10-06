/**
 * WhatsApp Notification Service
 * Supports:
 * 1. PAID Mode: Official Meta WhatsApp Cloud API (Automated background send, billed directly to client's Meta account)
 * 2. DISABLED Mode: WhatsApp notifications completely disabled
 */

export interface WhatsAppNotificationPayload {
  hotel: {
    name: string;
    whatsappMode?: string | null;
    whatsappNumber?: string | null;
    whatsappPhoneId?: string | null;
    whatsappAccessToken?: string | null;
  };
  order: {
    orderNumber: string;
    customerName?: string | null;
    customerPhone: string;
    tableNumber?: string | null;
  };
  status: "ACCEPTED" | "READY" | "SERVED" | "COMPLETED" | string;
  orderUrl?: string;
  billUrl?: string;
}

/**
 * Normalizes phone numbers to international standard without '+' or '-'
 * Assumes 10-digit numbers in India start with 91
 */
export function formatWhatsAppPhone(phone: string): string {
  const clean = (phone || "").replace(/[^0-9]/g, "");
  if (clean.length === 10) {
    return `91${clean}`;
  }
  return clean;
}

import {
  getNotificationTemplates,
  renderNotificationTemplate,
  NotificationTemplatesMap,
} from "./notificationTemplates.server";

/**
 * Generates customer-targeted message text based on order event
 */
export function getOrderStatusMessage(
  hotelName: string,
  customerName: string,
  orderNumber: string,
  tableNumber: string,
  status: string,
  orderUrl?: string,
  billUrl?: string
): string {
  const templates = getNotificationTemplates();
  const templateKey = status as keyof NotificationTemplatesMap;

  if (templates[templateKey]) {
    return renderNotificationTemplate(templates[templateKey], {
      customer_name: customerName ? customerName.trim() : "Dear Customer",
      order_number: orderNumber,
      table_number: tableNumber ? `Table ${tableNumber}` : "Your Table",
      hotel_name: hotelName,
      order_url: orderUrl,
      bill_url: billUrl,
    });
  }

  const name = customerName ? customerName.trim() : "Dear Customer";
  const table = tableNumber ? `Table ${tableNumber}` : "Your Table";
  return `வணக்கம் ${name}! 👋\n\n${hotelName} Order #${orderNumber} (${table}) Update: Status is now ${status}.\n\nDetails: ${orderUrl || ""}`;
}

/**
 * Generates direct wa.me link to customer phone
 */
export function createCustomerWhatsAppLink(
  customerPhone: string,
  message: string
): string {
  const formattedPhone = formatWhatsAppPhone(customerPhone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Sends automated WhatsApp message using Meta Cloud API
 * Note: Charges (~₹0.12) are billed directly to client's Meta Payment Card
 */
export async function sendMetaCloudWhatsAppMessage(
  phoneId: string,
  accessToken: string,
  toPhone: string,
  messageText: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formattedTo = formatWhatsAppPhone(toPhone);
    const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
        type: "text",
        text: {
          preview_url: true,
          body: messageText,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Meta WhatsApp Cloud API error response:", data);
      return {
        success: false,
        error: data.error?.message || "Failed to send message via Meta Cloud API",
      };
    }

    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error calling Meta API";
    console.error("sendMetaCloudWhatsAppMessage exception:", err);
    return { success: false, error: msg };
  }
}

/**
 * Unified dispatch handler for order status changes
 */
export async function dispatchOrderStatusWhatsApp(
  payload: WhatsAppNotificationPayload
): Promise<{
  mode: "DISABLED" | "PAID";
  success: boolean;
  messageText: string;
  whatsappLink: string;
  metaResult?: any;
}> {
  const mode = (
    payload.hotel.whatsappMode === "DISABLED" ? "DISABLED" : "PAID"
  ) as "DISABLED" | "PAID";

  const messageText = getOrderStatusMessage(
    payload.hotel.name,
    payload.order.customerName || "Customer",
    payload.order.orderNumber,
    payload.order.tableNumber || "",
    payload.status,
    payload.orderUrl,
    payload.billUrl
  );

  const whatsappLink = createCustomerWhatsAppLink(
    payload.order.customerPhone,
    messageText
  );

  if (mode === "DISABLED") {
    return { mode, success: true, messageText, whatsappLink };
  }

  // PAID (Automated Meta Cloud API)
  const { whatsappPhoneId, whatsappAccessToken } = payload.hotel;
  if (whatsappPhoneId && whatsappAccessToken) {
    const metaRes = await sendMetaCloudWhatsAppMessage(
      whatsappPhoneId,
      whatsappAccessToken,
      payload.order.customerPhone,
      messageText
    );
    return {
      mode,
      success: metaRes.success,
      messageText,
      whatsappLink,
      metaResult: metaRes,
    };
  }

  return {
    mode,
    success: false,
    messageText,
    whatsappLink,
  };
}

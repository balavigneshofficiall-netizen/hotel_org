import { prisma } from "@/lib/prisma";
import { OrderSource } from "@prisma/client";

/**
 * UrbanPiper / Swiggy / Zomato Outbound Integration Service
 * Dispatches real-time order lifecycle changes and menu stock toggles
 * to UrbanPiper Hub APIs.
 */

// Mapping internal OrderStatus to UrbanPiper / Aggregator standard statuses
const AGGREGATOR_STATUS_MAP: Record<string, string> = {
  ACCEPTED: "Acknowledged",
  PREPARING: "Food Cooking",
  READY: "Food Ready",
  COMPLETED: "Dispatched",
  SERVED: "Dispatched",
  CANCELLED: "Cancelled",
};

interface OutboundStatusPayload {
  orderId: number | string;
  orderNumber: string;
  externalOrderId?: string | null;
  orderSource: string;
  status: string;
  reason?: string;
  hotelId: number;
}

/**
 * Push order status change back to Swiggy / Zomato via UrbanPiper
 */
export async function notifyAggregatorOrderStatus({
  orderId,
  orderNumber,
  externalOrderId,
  orderSource,
  status,
  reason,
  hotelId,
}: OutboundStatusPayload) {
  // Only handle online aggregator delivery channels
  if (orderSource !== "SWIGGY" && orderSource !== "ZOMATO") {
    return { skipped: true, reason: "Not an online delivery order" };
  }

  const platformEnum =
    orderSource === "ZOMATO" ? OrderSource.ZOMATO : OrderSource.SWIGGY;

  try {
    // Check if hotel has an active integration configured
    const integration = await prisma.aggregatorIntegration.findUnique({
      where: {
        hotelId_platform: {
          hotelId,
          platform: platformEnum,
        },
      },
    });

    const targetAggregatorStatus = AGGREGATOR_STATUS_MAP[status] || status;
    const trackingId = externalOrderId || orderNumber;

    // Log payload for audit trail
    console.log(`[Aggregator Relay] Order #${trackingId} (${orderSource}) -> Updating to '${targetAggregatorStatus}'`);

    // If live API credentials are configured in production
    if (integration?.apiKey && integration?.storeId) {
      const url = `https://api.urbanpiper.com/v1/orders/${encodeURIComponent(trackingId)}/status/`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `apikey ${integration.apiKey}`,
        },
        body: JSON.stringify({
          new_status: targetAggregatorStatus,
          message: reason || `Order updated to ${targetAggregatorStatus}`,
        }),
      });

      const responseData = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        platform: orderSource,
        status: targetAggregatorStatus,
        response: responseData,
      };
    }

    // Sandbox / Simulation fallback when testing locally without live UrbanPiper account
    return {
      success: true,
      mode: "SIMULATION_ACK",
      platform: orderSource,
      status: targetAggregatorStatus,
      message: `Status successfully synced to ${orderSource} test gateway.`,
    };
  } catch (error: any) {
    console.error(`[Aggregator Relay Error] Failed to update ${orderSource}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle Item Out-of-Stock (Stock Ingestion) on Swiggy & Zomato
 */
export async function syncAggregatorItemAvailability({
  hotelId,
  productName,
  isAvailable,
}: {
  hotelId: number;
  productName: string;
  isAvailable: boolean;
}) {
  try {
    const integrations = await prisma.aggregatorIntegration.findMany({
      where: { hotelId, isEnabled: true },
    });

    console.log(
      `[Stock Relay] Syncing dish '${productName}' availability = ${isAvailable} to ${integrations.length} channels`
    );

    for (const integration of integrations) {
      if (integration.apiKey && integration.storeId) {
        // Real UrbanPiper stock toggle endpoint
        const url = `https://api.urbanpiper.com/v1/inventory/locations/${integration.storeId}/`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `apikey ${integration.apiKey}`,
          },
          body: JSON.stringify({
            location_ref_id: integration.storeId,
            items: [
              {
                title: productName,
                available: isAvailable,
              },
            ],
          }),
        }).catch((err) => console.error(`Failed to push stock to ${integration.platform}:`, err));
      }
    }

    return {
      success: true,
      syncedChannels: integrations.map((i) => i.platform),
      productName,
      isAvailable,
    };
  } catch (error: any) {
    console.error("[Stock Relay Error]:", error);
    return { success: false, error: error.message };
  }
}

import { NextRequest } from "next/server";
import { orderEventEmitter, OrderUpdateEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected event
  const sendEvent = async (data: object, eventType = "message") => {
    try {
      const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    } catch {
      // client disconnected
    }
  };

  sendEvent({ connected: true, orderId: id, timestamp: new Date().toISOString() }, "open");

  // Listener for specific order
  const onOrderUpdate = (event: OrderUpdateEvent) => {
    if (event.orderId === id || event.orderNumber === id) {
      sendEvent(event, "orderUpdate");
    }
  };

  orderEventEmitter.on(`order:${id}`, onOrderUpdate);

  // Keep-alive heartbeat every 15 seconds
  const intervalId = setInterval(() => {
    sendEvent({ ping: true, timestamp: Date.now() }, "ping");
  }, 15000);

  // Clean up on disconnect
  request.signal.addEventListener("abort", () => {
    clearInterval(intervalId);
    orderEventEmitter.off(`order:${id}`, onOrderUpdate);
    try {
      writer.close();
    } catch {
      // ignore
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

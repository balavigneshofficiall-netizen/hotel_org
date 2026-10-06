import { NextRequest } from "next/server";
import { orderEventEmitter, OrderUpdateEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hotelSlug = searchParams.get("hotel") || "hotel-annapoorna";

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected packet
  writer.write(
    encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date().toISOString() })}\n\n`)
  );

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(`: heartbeat\n\n`));
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, 15000);

  // Listener for any order updates or new orders
  const handleOrderUpdate = (event: OrderUpdateEvent) => {
    try {
      writer.write(
        encoder.encode(`event: adminUpdate\ndata: ${JSON.stringify(event)}\n\n`)
      );
    } catch (err) {
      console.error("Failed to write to admin SSE stream:", err);
    }
  };

  orderEventEmitter.on("order:any", handleOrderUpdate);

  request.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    orderEventEmitter.off("order:any", handleOrderUpdate);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

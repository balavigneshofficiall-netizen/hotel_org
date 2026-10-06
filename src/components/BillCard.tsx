"use client";

import React, { useRef, useState } from "react";
import { BillData } from "@/types";
import { Download, Printer, CheckCircle, Clock } from "lucide-react";
import jsPDF from "jspdf";

interface BillCardProps {
  bill: BillData;
}

export default function BillCard({ bill }: BillCardProps) {
  const billRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const hotel = bill.order?.hotel;
  const table = bill.order?.table;
  const items = (bill.order?.items || []).filter((item: any) => !item.isCancelled);
  const currency = hotel?.currency || "₹";

  const sessionCode =
    (bill as any).sessionCode ||
    (bill.order as any)?.sessionCode ||
    (bill.order?.orderNumber?.startsWith("SES-") ? bill.order.orderNumber.split(" ")[0] : null);

  const orderNumbers: string[] =
    (bill as any).orderNumbers ||
    (bill.order as any)?.orderNumbers ||
    (bill.order?.orderNumber ? [bill.order.orderNumber] : []);

  const isMultiOrder = orderNumbers.length > 1;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      setDownloading(true);

      // Dynamically calculate receipt height so totals never get cut off or collapse
      const estimatedHeight = Math.max(
        170,
        110 + items.length * 7 + (isMultiOrder ? 18 : 0) + 50
      );

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, estimatedHeight],
      });

      let y = 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(hotel?.name || "Hotel Annapoorna", 40, y, { align: "center" });

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      if (hotel?.tagline) {
        doc.text(hotel.tagline.slice(0, 45), 40, y, { align: "center" });
        y += 4;
      }
      if (hotel?.address) {
        doc.text(hotel.address.slice(0, 45), 40, y, { align: "center" });
        y += 4;
      }
      if (hotel?.phone) {
        doc.text(`Ph: ${hotel.phone}`, 40, y, { align: "center" });
        y += 4;
      }

      // Clean dotted divider line
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(6, y, 74, y);
      y += 4.5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`TAX INVOICE`, 40, y, { align: "center" });
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      // Row 1: Bill No & Table
      doc.text(`Bill: ${bill.billNumber}`, 6, y);
      doc.text(`Table: ${table?.tableNumber || "Table 08"}`, 74, y, { align: "right" });
      y += 4;

      // Row 2: Date & Time
      const dateStr = new Date(bill.generatedAt).toLocaleDateString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = new Date(bill.generatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.text(`Date: ${dateStr}`, 6, y);
      doc.text(`Time: ${timeStr}`, 74, y, { align: "right" });
      y += 4;

      // Row 3: Session & Orders (Separate line so it never collides with date)
      if (sessionCode) {
        doc.text(`Session: ${sessionCode}`, 6, y);
        if (isMultiOrder) {
          doc.text(`(${orderNumbers.length} Batches)`, 74, y, { align: "right" });
        }
        y += 4;
      }

      // Row 4: If multi-orders, print batch numbers wrapped safely
      if (isMultiOrder) {
        const orderText = `Batches: ${orderNumbers.join(", ")}`;
        const wrappedOrderLines = doc.splitTextToSize(orderText, 68);
        doc.text(wrappedOrderLines, 6, y);
        y += wrappedOrderLines.length * 3.5;
      } else if (!sessionCode && bill.order?.orderNumber) {
        doc.text(`Order: #${bill.order.orderNumber}`, 6, y);
        y += 4;
      }

      // Row 5: Guest Name
      doc.text(`Guest: ${bill.order?.customerName || "Diner"}`, 6, y);
      y += 4;

      // Dotted line before items
      doc.line(6, y, 74, y);
      y += 4;

      // Table Header
      doc.setFont("helvetica", "bold");
      doc.text("Item", 6, y);
      doc.text("Qty", 50, y, { align: "center" });
      doc.text("Amt", 74, y, { align: "right" });
      y += 3.5;

      doc.line(6, y, 74, y);
      y += 4;

      // Items
      doc.setFont("helvetica", "normal");
      items.forEach((item: any) => {
        const cleanName = item.productName || "Dish";
        const nameLines = doc.splitTextToSize(cleanName, 42);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(nameLines[0], 6, y);
        doc.text(`${item.quantity}`, 50, y, { align: "center" });
        doc.text(`${item.subtotal.toFixed(2)}`, 74, y, { align: "right" });

        if (nameLines.length > 1) {
          y += 3.2;
          doc.text(nameLines[1], 6, y);
        }

        if (isMultiOrder && item.orderNumber) {
          y += 2.8;
          doc.setFontSize(6);
          doc.setTextColor(110, 110, 110);
          doc.text(`↳ Batch #${item.orderNumber}`, 8, y);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7.5);
        }

        y += 4.2;
      });

      // Dotted line before totals
      doc.line(6, y, 74, y);
      y += 4;

      // Totals
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Item Subtotal:", 6, y);
      doc.text(`${bill.subtotal.toFixed(2)}`, 74, y, { align: "right" });
      y += 3.8;

      const halfTax = (bill.taxAmount / 2).toFixed(2);
      doc.text("CGST (2.5%):", 6, y);
      doc.text(`${halfTax}`, 74, y, { align: "right" });
      y += 3.8;
      doc.text("SGST (2.5%):", 6, y);
      doc.text(`${halfTax}`, 74, y, { align: "right" });
      y += 4.5;

      // Solid line before grand total
      doc.setDrawColor(0, 0, 0);
      doc.setLineDashPattern([], 0);
      doc.line(6, y, 74, y);
      y += 5;

      // GRAND TOTAL
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("GRAND TOTAL:", 6, y);
      doc.text(`Rs. ${bill.grandTotal.toFixed(2)}`, 74, y, { align: "right" });
      y += 6;

      // Payment Status
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const paymentMethodStr = bill.paymentMethod ? ` (${bill.paymentMethod})` : "";
      doc.text(`Payment: ${bill.paymentStatus}${paymentMethodStr}`, 40, y, { align: "center" });
      y += 4;
      doc.text("Thank you! Please visit again.", 40, y, { align: "center" });

      doc.save(`${bill.billNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const isPaid = bill.paymentStatus === "PAID";
  const cgst = (bill.taxAmount / 2).toFixed(2);
  const sgst = (bill.taxAmount / 2).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Bill Container */}
      <div
        ref={billRef}
        className="bg-white rounded-3xl p-6 border border-black/8 shadow-md relative overflow-hidden"
      >
        {/* Receipt decorative serrated top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#12372A]" />

        {/* Brand Header */}
        <div className="text-center pb-4 border-b border-dashed border-stone-300">
          <h2 className="text-xl font-bold text-[#171717] tracking-tight">
            {hotel?.name || "Hotel Annapoorna"}
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">{hotel?.tagline}</p>
          {hotel?.address && (
            <p className="text-[11px] text-[#6B7280] mt-1 px-4 leading-tight">
              {hotel.address}
            </p>
          )}
          <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-stone-100 text-[10px] font-bold tracking-widest text-[#171717] uppercase">
            Tax Invoice / Bill
          </div>
        </div>

        {/* Bill Meta Details */}
        <div className="py-3 border-b border-dashed border-stone-300 space-y-2 text-xs text-[#6B7280]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Invoice No
              </span>
              <span className="font-bold text-[#171717]">{bill.billNumber}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Table
              </span>
              <span className="font-bold text-[#12372A]">
                {table?.tableNumber || "Table 08"}
              </span>
            </div>
          </div>

          {/* Dining Reference Banner */}
          <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-stone-200/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              <span>Dining Reference</span>
              <span>
                {new Date(bill.generatedAt).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-[#12372A]">
                {sessionCode ? `Session: ${sessionCode}` : `Order: #${bill.order?.orderNumber}`}
              </span>
              {isMultiOrder && (
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
                  {orderNumbers.length} Order Batches
                </span>
              )}
            </div>

            {isMultiOrder && (
              <div className="text-[11px] text-stone-600 font-medium pt-1 border-t border-stone-200">
                Orders: <span className="font-bold text-[#171717]">{orderNumbers.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-3 border-b border-dashed border-stone-300 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            <span>Item & Details</span>
            <div className="flex items-center gap-6">
              <span>Qty</span>
              <span>Total</span>
            </div>
          </div>

          {items.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs py-1"
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.isVeg ? "bg-emerald-600" : "bg-red-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-[#171717] truncate block">
                    {item.productName}
                  </span>
                  {item.orderNumber && isMultiOrder && (
                    <span className="text-[9px] text-[#6B7280] font-medium block">
                      Batch #{item.orderNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-7 shrink-0 text-right">
                <span className="w-4 text-center font-medium text-[#6B7280]">
                  {item.quantity}
                </span>
                <span className="w-16 font-bold text-[#171717]">
                  {currency}
                  {item.subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Calculation breakdown */}
        <div className="py-3 border-b border-dashed border-stone-300 space-y-1.5 text-xs text-[#6B7280]">
          <div className="flex items-center justify-between">
            <span>Item Subtotal</span>
            <span className="font-semibold text-[#171717]">
              {currency}
              {bill.subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span>CGST (2.5%)</span>
            <span>
              {currency}
              {cgst}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span>SGST (2.5%)</span>
            <span>
              {currency}
              {sgst}
            </span>
          </div>

          {bill.discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Discount</span>
              <span>
                -{currency}
                {bill.discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-black/5 flex items-center justify-between text-base font-extrabold text-[#12372A]">
            <span>Total Payable</span>
            <span>
              {currency}
              {bill.grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Status Badge */}
        <div className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isPaid ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-xs font-bold text-[#171717]">
              {isPaid ? "Payment Settled ✓" : "Payment Pending"}
            </span>
          </div>

          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isPaid
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {bill.paymentMethod || "Table Payment"}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 no-print">
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="py-3 px-4 rounded-2xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? "Preparing PDF..." : "Download PDF"}</span>
        </button>

        <button
          onClick={handlePrint}
          className="py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 border border-black/8 active:scale-98 text-[#171717] text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition"
        >
          <Printer className="w-4 h-4 text-[#6B7280]" />
          <span>Print Receipt</span>
        </button>
      </div>
    </div>
  );
}

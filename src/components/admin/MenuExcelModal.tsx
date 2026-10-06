"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Check,
  RefreshCw,
} from "lucide-react";

interface MenuExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { id: string | number; name: string }[];
  products: any[];
  onImportSuccess: () => void;
  initialTab?: "IMPORT" | "EXPORT";
}

interface ParsedDishRow {
  name: string;
  categoryName: string;
  price: number;
  originalPrice?: number | null;
  isVeg: boolean;
  isPopular: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  description: string;
  ingredients: string;
  imageUrl?: string;
  isValid: boolean;
  validationError?: string;
}

export default function MenuExcelModal({
  isOpen,
  onClose,
  categories,
  products,
  onImportSuccess,
  initialTab = "IMPORT",
}: MenuExcelModalProps) {
  const [activeTab, setActiveTab] = useState<"IMPORT" | "EXPORT">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedDishRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccessMsg, setImportSuccessMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // 1. GENERATE & DOWNLOAD SAMPLE EXCEL TEMPLATE
  const handleDownloadSampleTemplate = () => {
    try {
      const sampleData = [
        {
          "Dish Name": "Chicken Biriyani",
          "Category": "Biriyani",
          "Price (₹)": 240,
          "Original Price (₹)": 280,
          "Food Type (VEG/NON-VEG)": "NON-VEG",
          "Availability (AVAILABLE/SOLD OUT)": "AVAILABLE",
          "Chef Special (YES/NO)": "YES",
          "Prep Time (Minutes)": 20,
          "Description": "Authentic seeraga samba rice cooked with tender chicken and aromatic herbs.",
          "Ingredients": "Seeraga samba rice, Chicken, Ghee, Mint, Cloves, Cardamom",
          "Image Name or URL": "chicken-biriyani.jpg",
        },
        {
          "Dish Name": "Paneer Butter Masala",
          "Category": "Curries",
          "Price (₹)": 190,
          "Original Price (₹)": 220,
          "Food Type (VEG/NON-VEG)": "VEG",
          "Availability (AVAILABLE/SOLD OUT)": "AVAILABLE",
          "Chef Special (YES/NO)": "YES",
          "Prep Time (Minutes)": 15,
          "Description": "Fresh cottage cheese cubes simmered in rich creamy tomato and cashew gravy.",
          "Ingredients": "Paneer, Butter, Cream, Tomatoes, Kasuri methi",
          "Image Name or URL": "paneer-butter-masala.jpg",
        },
        {
          "Dish Name": "Ghee Roast Dosa",
          "Category": "Tiffin",
          "Price (₹)": 90,
          "Original Price (₹)": 110,
          "Food Type (VEG/NON-VEG)": "VEG",
          "Availability (AVAILABLE/SOLD OUT)": "AVAILABLE",
          "Chef Special (YES/NO)": "NO",
          "Prep Time (Minutes)": 10,
          "Description": "Crispy golden crepe roasted with pure aromatic cow ghee, served with chutneys.",
          "Ingredients": "Rice batter, Pure Ghee, Coconut chutney, Sambar",
          "Image Name or URL": "ghee-roast.jpg",
        },
        {
          "Dish Name": "Mutton Chukka",
          "Category": "Starters",
          "Price (₹)": 280,
          "Original Price (₹)": 320,
          "Food Type (VEG/NON-VEG)": "NON-VEG",
          "Availability (AVAILABLE/SOLD OUT)": "AVAILABLE",
          "Chef Special (YES/NO)": "YES",
          "Prep Time (Minutes)": 25,
          "Description": "Slow cooked tender mutton pan-roasted with hand-ground pepper and shallots.",
          "Ingredients": "Mutton, Small onions, Black pepper, Curry leaves, Coconut oil",
          "Image Name or URL": "mutton-chukka.jpg",
        },
        {
          "Dish Name": "South Indian Filter Coffee",
          "Category": "Beverages",
          "Price (₹)": 35,
          "Original Price (₹)": "",
          "Food Type (VEG/NON-VEG)": "VEG",
          "Availability (AVAILABLE/SOLD OUT)": "AVAILABLE",
          "Chef Special (YES/NO)": "NO",
          "Prep Time (Minutes)": 5,
          "Description": "Freshly brewed authentic Kumbakonam degree filter coffee with frothed milk.",
          "Ingredients": "Fresh cow milk, Roasted chicory coffee decoction, Sugar",
          "Image Name or URL": "filter-coffee.jpg",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);

      // Set optimal column widths
      worksheet["!cols"] = [
        { wch: 25 }, // Dish Name
        { wch: 16 }, // Category
        { wch: 12 }, // Price
        { wch: 16 }, // Original Price
        { wch: 24 }, // Food Type
        { wch: 30 }, // Availability
        { wch: 20 }, // Chef Special
        { wch: 18 }, // Prep Time
        { wch: 45 }, // Description
        { wch: 40 }, // Ingredients
        { wch: 24 }, // Image
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Template");

      // Instructions sheet
      const existingCategoryNames = categories.map((c) => c.name).join(", ");
      const instructions = [
        { "Guide": "1. Column Names", "Description": "Do not rename column headers in the 'Menu Template' sheet." },
        { "Guide": "2. Required Fields", "Description": "Dish Name, Category, and Price (₹) must be filled." },
        { "Guide": "3. Food Type", "Description": "Enter 'VEG' or 'NON-VEG'." },
        { "Guide": "4. Availability", "Description": "Enter 'AVAILABLE' or 'SOLD OUT'." },
        { "Guide": "5. Chef Special", "Description": "Enter 'YES' or 'NO'." },
        { "Guide": "6. Categories", "Description": `Existing categories: ${existingCategoryNames}. If you type a new category, it will be automatically created!` },
        { "Guide": "7. Image Name", "Description": "You can enter filename (e.g. biriyani.jpg) or leave blank to use default." },
      ];
      const guideSheet = XLSX.utils.json_to_sheet(instructions);
      guideSheet["!cols"] = [{ wch: 20 }, { wch: 70 }];
      XLSX.utils.book_append_sheet(workbook, guideSheet, "Instructions");

      XLSX.writeFile(workbook, "Hotel_Annapoorna_Menu_Import_Template.xlsx");
    } catch (err) {
      console.error("Failed to generate sample template:", err);
      alert("Failed to download template. Please try again.");
    }
  };

  // 2. PARSE UPLOADED EXCEL FILE
  const handleFileChange = (file: File) => {
    if (!file) return;

    setImportError("");
    setImportSuccessMsg("");
    setImportFile(file);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawJson || rawJson.length === 0) {
          throw new Error("The uploaded Excel sheet contains no rows.");
        }

        const parsed: ParsedDishRow[] = rawJson.map((row: any, idx: number) => {
          // Normalize possible column name variants
          const name = (
            row["Dish Name"] ||
            row["Dish"] ||
            row["Name"] ||
            row["Product Name"] ||
            row["productName"] ||
            ""
          ).toString().trim();

          const categoryName = (
            row["Category"] ||
            row["Category Name"] ||
            row["category"] ||
            "Main Course"
          ).toString().trim();

          const priceVal = row["Price (₹)"] ?? row["Price"] ?? row["price"] ?? 0;
          const price = Number(priceVal);

          const origPriceVal =
            row["Original Price (₹)"] ?? row["Original Price"] ?? row["originalPrice"];
          const originalPrice =
            origPriceVal && !isNaN(Number(origPriceVal)) ? Number(origPriceVal) : null;

          const rawFoodType = (
            row["Food Type (VEG/NON-VEG)"] ||
            row["Food Type"] ||
            row["Type"] ||
            row["isVeg"] ||
            ""
          ).toString().toUpperCase();
          const isVeg =
            rawFoodType.includes("VEG") && !rawFoodType.includes("NON");

          const rawAvail = (
            row["Availability (AVAILABLE/SOLD OUT)"] ||
            row["Availability"] ||
            row["Status"] ||
            ""
          ).toString().toUpperCase();
          const isAvailable = !rawAvail.includes("SOLD") && !rawAvail.includes("OUT") && !rawAvail.includes("FALSE");

          const rawPopular = (
            row["Chef Special (YES/NO)"] ||
            row["Chef Special"] ||
            row["Special"] ||
            row["Popular"] ||
            ""
          ).toString().toUpperCase();
          const isPopular = rawPopular.includes("YES") || rawPopular.includes("TRUE");

          const prepTimeVal =
            row["Prep Time (Minutes)"] ?? row["Prep Time"] ?? row["prepTimeMinutes"] ?? 15;
          const prepTimeMinutes = Number(prepTimeVal) || 15;

          const description = (
            row["Description"] ||
            row["description"] ||
            "Freshly prepared dish crafted by our master chefs."
          ).toString().trim();

          const ingredients = (
            row["Ingredients"] ||
            row["ingredients"] ||
            ""
          ).toString().trim();

          const imageUrl = (
            row["Image Name or URL"] ||
            row["Image"] ||
            row["imageUrl"] ||
            ""
          ).toString().trim();

          let isValid = true;
          let validationError = "";

          if (!name) {
            isValid = false;
            validationError = "Missing dish name";
          } else if (isNaN(price) || price <= 0) {
            isValid = false;
            validationError = "Invalid price (must be > 0)";
          }

          return {
            name,
            categoryName,
            price,
            originalPrice,
            isVeg,
            isPopular,
            isAvailable,
            prepTimeMinutes,
            description,
            ingredients,
            imageUrl,
            isValid,
            validationError,
          };
        });

        setParsedRows(parsed);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        setImportError(err.message || "Failed to read Excel file. Please use the sample template.");
        setParsedRows([]);
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. EXECUTE BATCH IMPORT API CALL
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportError("No valid dish rows found to import.");
      return;
    }

    try {
      setImporting(true);
      setImportError("");

      const res = await fetch("/api/admin/menu/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishes: validRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import dishes.");
      }

      setImportSuccessMsg(data.message || `Successfully imported ${validRows.length} dishes!`);
      onImportSuccess();

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
        setParsedRows([]);
        setImportFile(null);
        setImportSuccessMsg("");
      }, 1800);
    } catch (err: any) {
      console.error("Batch import error:", err);
      setImportError(err.message || "Failed to import dishes.");
    } finally {
      setImporting(false);
    }
  };

  // 4. EXPORT ALL DISHES TO EXCEL WORKBOOK
  const handleExportCurrentMenu = () => {
    try {
      const rows = products.map((p, idx) => ({
        "S.No": idx + 1,
        "Dish Name": p.name,
        "Category": p.category?.name || "Main Course",
        "Price (₹)": p.price,
        "Original Price (₹)": p.originalPrice || "-",
        "Food Type": p.isVeg ? "VEG" : "NON-VEG",
        "Availability": p.isAvailable ? "AVAILABLE" : "SOLD OUT",
        "Chef's Special": p.isPopular ? "YES" : "NO",
        "Prep Time (Mins)": p.prepTimeMinutes || 15,
        "Description": p.description || "-",
        "Ingredients": p.ingredients || "-",
        "Image URL / Path": p.imageUrl || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 6 },  // S.No
        { wch: 25 }, // Dish Name
        { wch: 18 }, // Category
        { wch: 12 }, // Price
        { wch: 16 }, // Original Price
        { wch: 12 }, // Food Type
        { wch: 15 }, // Availability
        { wch: 14 }, // Special
        { wch: 16 }, // Prep Time
        { wch: 45 }, // Description
        { wch: 35 }, // Ingredients
        { wch: 35 }, // Image
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Dishes");

      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Hotel_Annapoorna_Menu_${today}.xlsx`);
    } catch (err) {
      console.error("Menu export error:", err);
      alert("Failed to export menu. Please try again.");
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E5E2D9] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#12372A] to-[#1E4D3C] text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C9A227]/25 text-[#E2B755] border border-[#C9A227]/40 flex items-center justify-center font-black">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                Import / Export Menu
              </h2>
              <p className="text-[10px] text-emerald-200/80 font-medium">
                Add dishes in bulk using Excel (.xlsx) or download your menu catalog
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Import vs Export) */}
        <div className="flex items-center border-b border-[#E5E2D9] bg-[#FAF9F6] px-4 pt-2.5 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("IMPORT")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-xs font-black transition cursor-pointer border-t border-x ${
              activeTab === "IMPORT"
                ? "bg-white text-[#12372A] border-[#E5E2D9] shadow-xs"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#12372A]" />
            <span>Import Dishes</span>
            {parsedRows.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {validCount} ready
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("EXPORT")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-xs font-black transition cursor-pointer border-t border-x ${
              activeTab === "EXPORT"
                ? "bg-white text-[#12372A] border-[#E5E2D9] shadow-xs"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Export Dishes ({products.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: IMPORT EXCEL */}
          {activeTab === "IMPORT" && (
            <div className="space-y-4">
              {/* Sample Excel Helper Box */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#12372A]">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>Need the format? Download the Sample Template</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Pre-filled with correct column headers, sample dishes, and instructions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-[#12372A] border border-emerald-300 text-xs font-black shadow-2xs flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Download Sample (.xlsx)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer select-none ${
                  isDragging
                    ? "border-emerald-600 bg-emerald-50/60 ring-4 ring-emerald-500/10"
                    : "border-stone-300 hover:border-[#12372A] bg-[#FAF9F6] hover:bg-white"
                }`}
              >
                {parsing ? (
                  <div className="py-2 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-[#12372A] animate-spin" />
                    <p className="text-xs font-bold text-[#171717]">Reading and validating Excel sheet...</p>
                  </div>
                ) : importFile ? (
                  <div className="py-1 flex items-center justify-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-[#171717]">{importFile.name}</p>
                      <p className="text-[10px] text-stone-500">
                        {(importFile.size / 1024).toFixed(1)} KB · Click or drop another to replace
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center justify-center gap-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#12372A] border border-emerald-200 flex items-center justify-center shadow-xs">
                      <UploadCloud className="w-5 h-5 text-[#12372A]" />
                    </div>
                    <p className="text-xs font-bold text-[#171717]">
                      <span className="text-[#12372A] underline underline-offset-2">Click to choose Excel file</span> or drag & drop here
                    </p>
                    <p className="text-[10px] text-[#6B7280]">
                      Accepts standard .xlsx, .xls or .csv workbooks
                    </p>
                  </div>
                )}
              </div>

              {/* Status & Error Alerts */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* PREVIEW TABLE */}
              {parsedRows.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#171717]">
                        Parsed Sheet Preview
                      </span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {validCount} valid dishes
                      </span>
                      {invalidCount > 0 && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          {invalidCount} skipped
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 font-medium">
                      Review details before saving
                    </span>
                  </div>

                  <div className="border border-[#E5E2D9] rounded-2xl overflow-hidden max-h-64 overflow-y-auto thin-scrollbar shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#6B7280] uppercase tracking-wider text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3 font-bold">Dish Name</th>
                          <th className="py-2 px-3 font-bold">Category</th>
                          <th className="py-2 px-3 font-bold">Price</th>
                          <th className="py-2 px-3 font-bold">Type</th>
                          <th className="py-2 px-3 font-bold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 bg-white">
                        {parsedRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`transition ${
                              row.isValid ? "hover:bg-stone-50" : "bg-red-50/40"
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-[#171717]">
                              {row.name || (
                                <span className="text-red-500 italic">Empty Name</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-[#6B7280]">
                              {row.categoryName}
                            </td>
                            <td className="py-2 px-3 font-black text-[#12372A]">
                              ₹{row.price}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  row.isVeg
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {row.isVeg ? "VEG" : "NON-VEG"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  <span>Ready</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600"
                                  title={row.validationError}
                                >
                                  <AlertTriangle className="w-3 h-3 text-red-500" />
                                  <span>{row.validationError}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT EXCEL */}
          {activeTab === "EXPORT" && (
            <div className="space-y-4">
              <div className="bg-[#FAF9F6] border border-[#E5E2D9] rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-black text-[#12372A] text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-[#C9A227]" />
                  <span>Export Menu Catalog to Excel</span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px]">
                  Downloads a complete spreadsheet of all <strong>{products.length}</strong> menu items across all categories. Includes dish names, categories, pricing, veg/non-veg status, chef specials, preparation time, and descriptions.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Total Records:
                  </span>
                  <span className="text-xs font-black bg-stone-200 px-2 py-0.5 rounded-md text-stone-800">
                    {products.length} Dishes
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportCurrentMenu}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#12372A] to-[#1E4D3C] hover:from-[#0e2b21] hover:to-[#173e30] active:scale-98 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer group"
              >
                <Download className="w-4 h-4 text-[#E2B755] group-hover:scale-110 transition-transform" />
                <span>Download Menu Spreadsheet (.xlsx)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-[#FAF9F6] border-t border-[#E5E2D9] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition cursor-pointer"
          >
            Close
          </button>

          {activeTab === "IMPORT" && parsedRows.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || validCount === 0}
              className="px-5 py-2.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-black shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                  <span>Importing Dishes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#C9A227] stroke-[3]" />
                  <span>Confirm & Import ({validCount} Dishes)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

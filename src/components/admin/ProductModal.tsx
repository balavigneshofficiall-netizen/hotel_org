"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  X,
  Loader2,
  Sparkles,
  Check,
  UploadCloud,
  Image as ImageIcon,
  RotateCcw,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { id: string | number; name: string }[];
  editingProduct?: any | null;
  onSave: (productData: any) => Promise<void>;
}

export default function ProductModal({
  isOpen,
  onClose,
  categories,
  editingProduct,
  onSave,
}: ProductModalProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isVeg, setIsVeg] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("15");
  const [ingredients, setIngredients] = useState("");

  // Upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [showManualUrl, setShowManualUrl] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || "");
      setCategoryId(String(editingProduct.categoryId || categories[0]?.id || ""));
      setPrice(String(editingProduct.price || ""));
      setOriginalPrice(editingProduct.originalPrice ? String(editingProduct.originalPrice) : "");
      setDescription(editingProduct.description || "");
      const existingImg = editingProduct.imageUrl || "";
      setImageUrl(existingImg);
      // Extract filename if it was uploaded
      if (existingImg.startsWith("/uploads/menu/")) {
        setUploadedFileName(existingImg.replace("/uploads/menu/", ""));
      } else {
        setUploadedFileName("");
      }
      setIsVeg(Boolean(editingProduct.isVeg));
      setIsPopular(Boolean(editingProduct.isPopular));
      setPrepTimeMinutes(String(editingProduct.prepTimeMinutes || "15"));
      setIngredients(editingProduct.ingredients || "");
      setShowManualUrl(!existingImg.startsWith("/uploads/menu/") && existingImg.startsWith("http"));
    } else {
      setName("");
      setCategoryId(String(categories[0]?.id || ""));
      setPrice("");
      setOriginalPrice("");
      setDescription("");
      setImageUrl("");
      setUploadedFileName("");
      setIsVeg(false);
      setIsPopular(false);
      setPrepTimeMinutes("15");
      setIngredients("");
      setShowManualUrl(false);
    }
    setUploadError("");
    setError("");
  }, [editingProduct, categories, isOpen]);

  if (!isOpen) return null;

  // Handle direct file upload to /api/admin/upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (JPG, PNG, WEBP, AVIF).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size is too large (Maximum 10MB allowed).");
      return;
    }

    try {
      setUploadingImage(true);
      setUploadError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      // Store relative path URL in imageUrl & record filename
      setImageUrl(data.url);
      setUploadedFileName(data.fileName);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a food dish name.");
      return;
    }
    if (!price || Number(price) <= 0) {
      setError("Please enter a valid positive price.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    // Default fallback if no photo uploaded
    const finalImageUrl = imageUrl.trim() || "/images/placeholder-dish.jpg";

    try {
      setSubmitting(true);
      await onSave({
        id: editingProduct?.id,
        name: name.trim(),
        categoryId: Number(categoryId),
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        description: description.trim(),
        imageUrl: finalImageUrl,
        isVeg,
        isPopular,
        prepTimeMinutes: Number(prepTimeMinutes) || 15,
        ingredients: ingredients.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save dish";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E5E2D9] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#12372A] to-[#1E4D3C] text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C9A227]/25 text-[#E2B755] border border-[#C9A227]/40 flex items-center justify-center font-black text-sm">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                {editingProduct ? `Edit Dish: ${editingProduct.name}` : "Add New Dish to Menu"}
              </h2>
              <p className="text-[10px] text-emerald-200/80 font-medium">
                Upload photo, configure pricing, ingredients & kitchen tags
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. IMAGE UPLOAD SECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#171717] flex items-center gap-1.5">
                <span>Food Dish Photo</span>
                <span className="text-[10px] font-semibold text-stone-500">(Direct Upload)</span>
              </label>

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setUploadedFileName("");
                  }}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {/* Upload Area / Image Preview */}
            {imageUrl ? (
              <div className="relative rounded-2xl border-2 border-emerald-500/50 bg-[#F7F5EF] p-3 flex items-center gap-3.5 shadow-2xs group">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-200 border border-[#E5E2D9] shrink-0 shadow-xs">
                  <Image
                    src={imageUrl}
                    alt="Food Dish Preview"
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized={imageUrl.startsWith("/uploads/")}
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#12372A]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Photo Ready</span>
                  </div>

                  <p className="text-[11px] font-mono text-stone-600 truncate bg-white/80 border border-stone-200 px-2 py-0.5 rounded-md inline-block max-w-full">
                    {uploadedFileName || imageUrl.split("/").pop()}
                  </p>

                  <div className="pt-0.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#12372A] hover:bg-[#0e2b21] text-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5 text-[#C9A227]" />
                      <span>Change Photo</span>
                    </button>
                    <span className="text-[10px] text-stone-500">Stored locally on server</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone / Click to Upload */
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer select-none ${
                  isDragging
                    ? "border-emerald-600 bg-emerald-50/60 ring-4 ring-emerald-500/10"
                    : "border-stone-300 hover:border-[#12372A] bg-[#FAF9F6] hover:bg-white"
                }`}
              >
                {uploadingImage ? (
                  <div className="py-3 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-7 h-7 text-[#12372A] animate-spin" />
                    <p className="text-xs font-bold text-[#171717]">Uploading photo to server...</p>
                    <p className="text-[10px] text-[#6B7280]">Saving in local media storage</p>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center justify-center gap-1.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#12372A] border border-emerald-200/80 flex items-center justify-center shadow-xs">
                      <UploadCloud className="w-5 h-5 text-[#12372A]" />
                    </div>
                    <div className="mt-1">
                      <p className="text-xs font-bold text-[#171717]">
                        <span className="text-[#12372A] underline underline-offset-2">Click to upload photo</span> or drag & drop here
                      </p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        Supports PNG, JPG, WEBP, AVIF up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </p>
            )}

            {/* Optional URL Toggle */}
            <div className="pt-0.5">
              {!showManualUrl ? (
                <button
                  type="button"
                  onClick={() => setShowManualUrl(true)}
                  className="text-[10px] font-bold text-stone-500 hover:text-[#12372A] flex items-center gap-1 cursor-pointer transition"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Or enter external image URL</span>
                </button>
              ) : (
                <div className="space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-200 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-[#6B7280]">
                      External Image URL (Unsplash or CDN)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowManualUrl(false)}
                      className="text-[10px] text-stone-500 hover:text-stone-700"
                    >
                      Hide
                    </button>
                  </div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setUploadedFileName("");
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E2D9] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. DISH NAME & CATEGORY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#171717] block mb-1">
                Dish Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Special Mutton Biriyani"
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] font-semibold focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171717] block mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] font-semibold focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. PRICING & PREP TIME */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[#171717] block mb-1">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="290"
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] font-bold focus:outline-none focus:ring-1 focus:ring-[#12372A]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171717] block mb-1">
                Original Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="340"
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#171717] block mb-1">
                Prep Time (mins)
              </label>
              <input
                type="number"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                placeholder="15"
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
              />
            </div>
          </div>

          {/* 4. VEG / NON-VEG & POPULAR BADGES */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-[#FAF9F6] rounded-2xl border border-[#E5E2D9]">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#171717] select-none">
              <input
                type="checkbox"
                checked={isVeg}
                onChange={(e) => setIsVeg(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isVeg ? "bg-emerald-600" : "bg-red-600"
                  }`}
                />
                <span>{isVeg ? "Pure Veg Dish" : "Non-Veg Dish"}</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#171717] select-none">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="w-4 h-4 rounded text-[#C9A227] focus:ring-[#C9A227] cursor-pointer"
              />
              <span className="flex items-center gap-1 text-[#997A15]">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Chef&apos;s Special / Popular</span>
              </span>
            </label>
          </div>

          {/* 5. DESCRIPTION */}
          <div>
            <label className="text-xs font-bold text-[#171717] block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Freshly ground spices, tender meat, slow-cooked in traditional seeraga samba rice..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A] resize-none"
            />
          </div>

          {/* 6. INGREDIENTS */}
          <div>
            <label className="text-xs font-bold text-[#171717] block mb-1">
              Ingredients (comma separated)
            </label>
            <input
              type="text"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Seeraga samba rice, Mutton, Ghee, Mint, Cardamom"
              className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#12372A]"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-5 py-2.5 rounded-xl bg-[#12372A] hover:bg-[#0e2b21] active:scale-98 text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
              ) : (
                <Check className="w-4 h-4 text-[#C9A227]" />
              )}
              <span>{editingProduct ? "Save Dish Changes" : "Save & Add to Menu"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

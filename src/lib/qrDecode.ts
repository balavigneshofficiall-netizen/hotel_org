/**
 * High-performance QR Code Decoder for mobile photos and file uploads.
 * Multi-stage pipeline:
 * 1. Native BarcodeDetector (hardware accelerated, handles EXIF orientation)
 * 2. jsQR with multi-scale canvas downscaling (1000px, 750px, 1400px, 500px, center crop)
 * 3. Html5Qrcode ZXing fallback
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Stage 1: Native BarcodeDetector API (Available on Android Chrome, Edge, iOS 17+)
 */
async function decodeWithBarcodeDetector(file: File): Promise<string | null> {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }
  try {
    const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
    let source: ImageBitmap | HTMLImageElement;
    if ("createImageBitmap" in window) {
      source = await createImageBitmap(file, { imageOrientation: "from-image" });
    } else {
      source = await loadImage(file);
    }
    const barcodes = await detector.detect(source);
    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
      return barcodes[0].rawValue;
    }
  } catch (err) {
    console.warn("BarcodeDetector decode attempt failed:", err);
  }
  return null;
}

/**
 * Stage 2: jsQR with multi-scale downscaling and center-cropping
 */
async function decodeWithJsQR(file: File): Promise<string | null> {
  try {
    const jsQRModule = await import("jsqr");
    const jsQR = (jsQRModule as any).default || jsQRModule;

    let source: CanvasImageSource;
    let origW = 0;
    let origH = 0;

    if ("createImageBitmap" in window) {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
        source = bmp;
        origW = bmp.width;
        origH = bmp.height;
      } catch {
        const img = await loadImage(file);
        source = img;
        origW = img.naturalWidth || img.width;
        origH = img.naturalHeight || img.height;
      }
    } else {
      const img = await loadImage(file);
      source = img;
      origW = img.naturalWidth || img.width;
      origH = img.naturalHeight || img.height;
    }

    if (!origW || !origH) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    // Multi-scale passes:
    // Smartphone photos are often 3000-8000px wide. Downscaling to 1000px, 750px, 1400px, 500px
    // allows jsQR to reliably find the 1:1:3:1:1 finder patterns without memory exhaustion.
    const scales = [1000, 750, 1400, 500];

    for (const maxDim of scales) {
      let w = origW;
      let h = origH;
      if (Math.max(w, h) > maxDim) {
        const ratio = maxDim / Math.max(w, h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(source, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);

      // Pass 1: standard contrast
      let res = jsQR(imgData.data, w, h, { inversionAttempts: "dontInvert" });
      if (res?.data) return res.data;

      // Pass 2: inverted / high contrast
      res = jsQR(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
      if (res?.data) return res.data;
    }

    // Stage 2B: Center Crop
    // When users take a photo with a smartphone, the QR code is centered in the frame.
    const cropDim = Math.round(Math.min(origW, origH) * 0.65);
    const sx = Math.round((origW - cropDim) / 2);
    const sy = Math.round((origH - cropDim) / 2);

    canvas.width = 650;
    canvas.height = 650;
    ctx.drawImage(source, sx, sy, cropDim, cropDim, 0, 0, 650, 650);
    const cropData = ctx.getImageData(0, 0, 650, 650);
    const cropRes = jsQR(cropData.data, 650, 650, { inversionAttempts: "attemptBoth" });
    if (cropRes?.data) return cropRes.data;

  } catch (err) {
    console.warn("jsQR decode attempt failed:", err);
  }
  return null;
}

/**
 * Stage 3: Html5Qrcode ZXing fallback (without DOM display)
 */
async function decodeWithHtml5Qrcode(file: File): Promise<string | null> {
  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    const tempId = "qr-temp-node-" + Math.random().toString(36).substring(7);
    let div = document.getElementById(tempId);
    if (!div) {
      div = document.createElement("div");
      div.id = tempId;
      div.style.position = "fixed";
      div.style.left = "-9999px";
      div.style.top = "-9999px";
      div.style.width = "300px";
      div.style.height = "300px";
      document.body.appendChild(div);
    }
    const scanner = new Html5Qrcode(tempId);
    try {
      const res = await scanner.scanFile(file, false);
      scanner.clear();
      div.remove();
      return res;
    } catch {
      scanner.clear();
      div.remove();
    }
  } catch (err) {
    console.warn("Html5Qrcode fallback error:", err);
  }
  return null;
}

/**
 * Primary decoding function combining all engines
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  // 1. Native BarcodeDetector (instant, accurate, hardware ML)
  const native = await decodeWithBarcodeDetector(file);
  if (native) return native;

  // 2. jsQR with multi-scale & crop
  const jsqr = await decodeWithJsQR(file);
  if (jsqr) return jsqr;

  // 3. Html5Qrcode fallback
  const html5 = await decodeWithHtml5Qrcode(file);
  if (html5) return html5;

  throw new Error("Could not read QR code from photo. Please get closer to the QR code with clear lighting.");
}

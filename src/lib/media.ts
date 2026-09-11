/** Image helpers: downscale before storing so photos stay small everywhere. */

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image decode failed"));
      image.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

function fit(width: number, height: number, maxSize: number) {
  if (width <= maxSize && height <= maxSize) return { width, height };
  const scale = maxSize / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Returns a JPEG blob no larger than `maxSize` on its longest edge.
 * Falls back to the original file whenever anything goes wrong, and never
 * returns something bigger than what it was given.
 */
export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.82,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await loadBitmap(file);
    const source = bitmap as { width: number; height: number };
    const { width, height } = fit(source.width, source.height, maxSize);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size > 0 && blob.size < file.size) return blob;
    return file;
  } catch {
    return file;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

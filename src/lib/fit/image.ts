/** Size that fits within `max` on the long edge, keeping the aspect ratio, never enlarging. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (!long || long <= max) return { width, height };
  const k = max / long;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/**
 * Browser only: re-encode a photo as a JPEG no larger than 1600px on the long edge before it leaves the phone
 * (spec 4.5). Re-encoding also drops EXIF, including location.
 */
export async function downscaleImage(file: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const size = fitWithin(bitmap.width, bitmap.height, max);
    const canvas = document.createElement("canvas"); canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality));
  } finally {
    bitmap.close();
  }
}

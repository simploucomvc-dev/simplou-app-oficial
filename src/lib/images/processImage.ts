// Prepara fotos no próprio aparelho antes do envio (o plano Free do Supabase não redimensiona):
// decodifica (inclusive HEIC do iPhone), corrige a rotação, reduz o tamanho, gera a miniatura
// e reencoda em WebP. Reencodar pelo canvas também descarta EXIF (GPS, modelo do aparelho etc.).

export const IMAGE_INPUT_MAX_BYTES = 25 * 1024 * 1024;
export const IMAGE_INPUT_ACCEPT = "image/*,.heic,.heif";

const MAIN_MAX_DIMENSION = 1600;
const THUMB_MAX_DIMENSION = 400;
const MAIN_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

export interface EncodedImage {
  blob: Blob;
  width: number;
  height: number;
  extension: "webp" | "jpg";
}

export interface ProcessedImage {
  main: EncodedImage;
  thumb: EncodedImage;
}

export class ImageProcessingError extends Error {}

function isHeic(file: File): boolean {
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  // Alguns navegadores entregam HEIC sem tipo
  return /\.(heic|heif)$/i.test(file.name);
}

export function validateImageFile(file: File): string | null {
  const typeKnown = ACCEPTED_MIME_TYPES.has(file.type) || isHeic(file);
  if (!typeKnown) return "Formato não suportado. Use JPG, PNG, WebP ou HEIC.";
  if (file.size > IMAGE_INPUT_MAX_BYTES) return "Foto muito grande. Máximo: 25 MB.";
  return null;
}

async function decodeWithImageElement(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decode(blob: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      // cai pro <img> abaixo
    }
  }
  return decodeWithImageElement(blob);
}

async function decodeAny(file: File) {
  try {
    return await decode(file);
  } catch (err) {
    if (!isHeic(file)) throw err;
    // Navegador sem suporte a HEIC (ex.: Chrome no Windows): converte só quando precisa
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    return decode(Array.isArray(converted) ? converted[0] : converted);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(
  source: CanvasImageSource & { width: number; height: number },
  maxDimension: number,
  quality: number,
): Promise<EncodedImage> {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError("Não foi possível processar a foto neste aparelho.");
  // Fundo branco: PNG transparente não fica preto ao virar JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);

  // Safari antigo não gera WebP pelo canvas e devolve PNG: nesse caso usa JPEG
  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return { blob: webp, width, height, extension: "webp" };

  const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new ImageProcessingError("Não foi possível processar a foto neste aparelho.");
  return { blob: jpeg, width, height, extension: "jpg" };
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const validationError = validateImageFile(file);
  if (validationError) throw new ImageProcessingError(validationError);

  let source: Awaited<ReturnType<typeof decode>>;
  try {
    source = await decodeAny(file);
  } catch {
    throw new ImageProcessingError("Não foi possível abrir esta foto. Tente outra ou tire um print dela.");
  }

  try {
    const main = await encode(source, MAIN_MAX_DIMENSION, MAIN_QUALITY);
    const thumb = await encode(source, THUMB_MAX_DIMENSION, THUMB_QUALITY);
    return { main, thumb };
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
}

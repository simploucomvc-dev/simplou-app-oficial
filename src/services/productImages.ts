import { supabase } from "@/lib/supabase";
import type { ProcessedImage } from "@/lib/images/processImage";

const BUCKET = "product-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
// Renova o link um pouco antes de expirar
const SIGNED_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const REMOVE_BATCH_SIZE = 100;

export const MAX_IMAGES_PER_PRODUCT = 3;

export interface ProductImage {
  id: string;
  path: string;
  thumb_path: string;
  position: number;
  width: number;
  height: number;
}

// Colunas pra embutir na consulta de produtos: products.select(`*, ${PRODUCT_IMAGES_SELECT}`)
export const PRODUCT_IMAGES_SELECT = "product_images(id, path, thumb_path, position, width, height)";

export interface UploadedImage {
  path: string;
  thumb_path: string;
  width: number;
  height: number;
}

export type ImageSyncItem = { id: string } | UploadedImage;

export function sortImages(images: ProductImage[] | null | undefined): ProductImage[] {
  return [...(images ?? [])].sort((a, b) => a.position - b.position);
}

export async function uploadProductImage(params: {
  userId: string;
  productId: string;
  image: ProcessedImage;
}): Promise<UploadedImage> {
  const { userId, productId, image } = params;
  const id = crypto.randomUUID();
  const path = `${userId}/${productId}/${id}.${image.main.extension}`;
  const thumbPath = `${userId}/${productId}/${id}_thumb.${image.thumb.extension}`;

  const { error: mainError } = await supabase.storage
    .from(BUCKET)
    .upload(path, image.main.blob, { contentType: image.main.blob.type, cacheControl: "31536000" });
  if (mainError) throw mainError;

  const { error: thumbError } = await supabase.storage
    .from(BUCKET)
    .upload(thumbPath, image.thumb.blob, { contentType: image.thumb.blob.type, cacheControl: "31536000" });
  if (thumbError) {
    await removeImageFiles([path]);
    throw thumbError;
  }

  return { path, thumb_path: thumbPath, width: image.main.width, height: image.main.height };
}

// Grava a lista final (na ordem) numa transação só; devolve os arquivos que deixaram de ser usados
export async function syncProductImages(productId: string, items: ImageSyncItem[]): Promise<string[]> {
  const { data, error } = await supabase.rpc("sync_product_images", {
    p_product_id: productId,
    p_items: items,
  });
  if (error) throw error;
  return (data as string[] | null) ?? [];
}

export async function removeImageFiles(paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(i, i + REMOVE_BATCH_SIZE);
    // Falha aqui só deixa arquivo órfão, que a limpeza diária remove
    await supabase.storage.from(BUCKET).remove(batch);
  }
}

export function imageFilePaths(images: ProductImage[]): string[] {
  return images.flatMap((img) => [img.path, img.thumb_path]);
}

// Cache dos links temporários: mantém a mesma URL durante a sessão (o navegador reaproveita o cache)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getSignedImageUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const path of new Set(paths)) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt - SIGNED_URL_REFRESH_MARGIN_MS > now) result[path] = cached.url;
    else missing.push(path);
  }

  if (missing.length > 0) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    const expiresAt = now + SIGNED_URL_TTL_SECONDS * 1000;
    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl || item.error) continue;
      signedUrlCache.set(item.path, { url: item.signedUrl, expiresAt });
      result[item.path] = item.signedUrl;
    }
  }

  return result;
}

export async function listUserImagePaths(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("path, thumb_path")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).flatMap((row) => [row.path, row.thumb_path]);
}

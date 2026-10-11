import { useCallback, useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { ImageProcessingError, processImage, type ProcessedImage } from "@/lib/images/processImage";
import {
  MAX_IMAGES_PER_PRODUCT,
  removeImageFiles,
  sortImages,
  syncProductImages,
  uploadProductImage,
  type ImageSyncItem,
  type ProductImage,
  type UploadedImage,
} from "@/services/productImages";

export type DraftImage =
  | { key: string; kind: "existing"; image: ProductImage }
  | { key: string; kind: "processing"; previewUrl: string }
  | { key: string; kind: "new"; processed: ProcessedImage; previewUrl: string };

// Estado das fotos no formulário. Nada vai pro servidor até save(): Cancelar descarta tudo.
export function useProductImagesDraft(initialImages: ProductImage[] | undefined, open: boolean) {
  const [items, setItems] = useState<DraftImage[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const previewUrls = useRef(new Set<string>());

  const revokeAll = useCallback(() => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  // Recarrega só quando o modal abre ou as fotos salvas mudam de fato (não a cada novo array)
  const initialRef = useRef(initialImages);
  initialRef.current = initialImages;
  const initialKey = sortImages(initialImages).map((img) => img.id).join("|");

  useEffect(() => {
    if (!open) return;
    revokeAll();
    setItems(sortImages(initialRef.current).map((image) => ({ key: image.id, kind: "existing", image })));
  }, [open, initialKey, revokeAll]);

  useEffect(() => revokeAll, [revokeAll]);

  const addFiles = useCallback(async (files: File[]): Promise<string[]> => {
    const errors: string[] = [];
    const available = MAX_IMAGES_PER_PRODUCT - itemsRef.current.length;
    if (files.length > available) errors.push(`Máximo de ${MAX_IMAGES_PER_PRODUCT} fotos por produto.`);
    const accepted = files.slice(0, Math.max(0, available));

    await Promise.all(accepted.map(async (file) => {
      const key = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      setItems((prev) => [...prev, { key, kind: "processing", previewUrl }]);
      try {
        const processed = await processImage(file);
        const processedUrl = URL.createObjectURL(processed.thumb.blob);
        previewUrls.current.add(processedUrl);
        URL.revokeObjectURL(previewUrl);
        previewUrls.current.delete(previewUrl);
        setItems((prev) => prev.map((it) => it.key === key ? { key, kind: "new", processed, previewUrl: processedUrl } : it));
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        previewUrls.current.delete(previewUrl);
        setItems((prev) => prev.filter((it) => it.key !== key));
        errors.push(err instanceof ImageProcessingError ? err.message : "Não foi possível processar uma das fotos.");
      }
    }));

    return errors;
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }, []);

  const move = useCallback((fromKey: string, toKey: string) => {
    setItems((prev) => {
      const from = prev.findIndex((it) => it.key === fromKey);
      const to = prev.findIndex((it) => it.key === toKey);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  }, []);

  const makeCover = useCallback((key: string) => {
    setItems((prev) => {
      const index = prev.findIndex((it) => it.key === key);
      return index <= 0 ? prev : arrayMove(prev, index, 0);
    });
  }, []);

  const isProcessing = items.some((it) => it.kind === "processing");

  const hasChanges = (() => {
    const initial = sortImages(initialImages).map((img) => img.id);
    const current = items.map((it) => (it.kind === "existing" ? it.image.id : it.key));
    return initial.length !== current.length || initial.some((id, i) => id !== current[i]);
  })();

  // Envia as fotos novas, grava a ordem final e apaga os arquivos que saíram
  const save = useCallback(async (userId: string, productId: string): Promise<void> => {
    if (!hasChanges) return;
    const uploaded: UploadedImage[] = [];
    try {
      const syncItems: ImageSyncItem[] = [];
      for (const item of items) {
        if (item.kind === "existing") syncItems.push({ id: item.image.id });
        else if (item.kind === "new") {
          const result = await uploadProductImage({ userId, productId, image: item.processed });
          uploaded.push(result);
          syncItems.push(result);
        }
      }
      const removedPaths = await syncProductImages(productId, syncItems);
      if (removedPaths.length > 0) await removeImageFiles(removedPaths);
    } catch (err) {
      // Nada foi gravado no banco: apaga o que já subiu pra não sobrar arquivo
      if (uploaded.length > 0) await removeImageFiles(uploaded.flatMap((u) => [u.path, u.thumb_path]));
      throw err;
    }
  }, [items, hasChanges]);

  return {
    items,
    canAddMore: items.length < MAX_IMAGES_PER_PRODUCT,
    isProcessing,
    hasChanges,
    addFiles,
    remove,
    move,
    makeCover,
    save,
  };
}

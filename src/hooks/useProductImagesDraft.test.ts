import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ProductImage } from "@/services/productImages";

const uploadProductImage = vi.fn();
const syncProductImages = vi.fn();
const removeImageFiles = vi.fn();

vi.mock("@/services/productImages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/productImages")>();
  return {
    ...actual,
    uploadProductImage: (...args: unknown[]) => uploadProductImage(...args),
    syncProductImages: (...args: unknown[]) => syncProductImages(...args),
    removeImageFiles: (...args: unknown[]) => removeImageFiles(...args),
  };
});

vi.mock("@/lib/images/processImage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/images/processImage")>();
  const encoded = { blob: new Blob(["x"], { type: "image/webp" }), width: 10, height: 10, extension: "webp" as const };
  return { ...actual, processImage: vi.fn(async () => ({ main: encoded, thumb: encoded })) };
});

import { useProductImagesDraft } from "./useProductImagesDraft";

const existing: ProductImage[] = [
  { id: "img-b", path: "u/p/b.webp", thumb_path: "u/p/b_thumb.webp", position: 1, width: 1, height: 1 },
  { id: "img-a", path: "u/p/a.webp", thumb_path: "u/p/a_thumb.webp", position: 0, width: 1, height: 1 },
];

const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:${n++}`);
  URL.revokeObjectURL = vi.fn();
});

describe("useProductImagesDraft", () => {
  it("carrega as fotos existentes na ordem salva", () => {
    const { result } = renderHook(() => useProductImagesDraft(existing, true));
    expect(result.current.items.map((it) => it.key)).toEqual(["img-a", "img-b"]);
    expect(result.current.hasChanges).toBe(false);
  });

  it("não passa de 3 fotos e avisa", async () => {
    const { result } = renderHook(() => useProductImagesDraft(existing, true));
    let errors: string[] = [];
    await act(async () => { errors = await result.current.addFiles([file("1.jpg"), file("2.jpg")]); });
    expect(result.current.items).toHaveLength(3);
    expect(errors[0]).toMatch(/Máximo de 3/);
    expect(result.current.canAddMore).toBe(false);
  });

  it("define capa e remove fotos", () => {
    const { result } = renderHook(() => useProductImagesDraft(existing, true));
    act(() => result.current.makeCover("img-b"));
    expect(result.current.items.map((it) => it.key)).toEqual(["img-b", "img-a"]);
    act(() => result.current.remove("img-a"));
    expect(result.current.items.map((it) => it.key)).toEqual(["img-b"]);
    expect(result.current.hasChanges).toBe(true);
  });

  it("envia as novas, salva a ordem final e apaga os arquivos removidos", async () => {
    uploadProductImage.mockResolvedValue({ path: "u/p/n.webp", thumb_path: "u/p/n_thumb.webp", width: 10, height: 10 });
    syncProductImages.mockResolvedValue(["u/p/b.webp", "u/p/b_thumb.webp"]);

    const { result } = renderHook(() => useProductImagesDraft(existing, true));
    await act(async () => { await result.current.addFiles([file("nova.jpg")]); });
    act(() => result.current.remove("img-b"));
    const newKey = result.current.items[1].key;
    act(() => result.current.makeCover(newKey));

    await act(async () => { await result.current.save("u", "p"); });

    expect(uploadProductImage).toHaveBeenCalledTimes(1);
    expect(syncProductImages).toHaveBeenCalledWith("p", [
      { path: "u/p/n.webp", thumb_path: "u/p/n_thumb.webp", width: 10, height: 10 },
      { id: "img-a" },
    ]);
    expect(removeImageFiles).toHaveBeenCalledWith(["u/p/b.webp", "u/p/b_thumb.webp"]);
  });

  it("se a gravação falhar, apaga os arquivos que já tinham subido", async () => {
    uploadProductImage.mockResolvedValue({ path: "u/p/n.webp", thumb_path: "u/p/n_thumb.webp", width: 10, height: 10 });
    syncProductImages.mockRejectedValue(new Error("falhou"));

    const { result } = renderHook(() => useProductImagesDraft([], true));
    await act(async () => { await result.current.addFiles([file("nova.jpg")]); });

    await expect(result.current.save("u", "p")).rejects.toThrow("falhou");
    expect(removeImageFiles).toHaveBeenCalledWith(["u/p/n.webp", "u/p/n_thumb.webp"]);
  });

  it("não chama o servidor quando nada mudou", async () => {
    const { result } = renderHook(() => useProductImagesDraft(existing, true));
    await act(async () => { await result.current.save("u", "p"); });
    expect(syncProductImages).not.toHaveBeenCalled();
  });
});

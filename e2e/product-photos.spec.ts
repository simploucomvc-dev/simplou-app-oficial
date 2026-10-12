import { test, expect, type Page } from "@playwright/test";
import { makeJpeg, mockSupabase, USER_ID, type MockProduct } from "./support/supabaseMock";

const PRODUCT_ID = "33333333-3333-4333-8333-333333333333";

function existingProduct(imageCount: number): MockProduct {
  const images = Array.from({ length: imageCount }, (_, i) => {
    const id = `aaaaaaa${i}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
    return {
      id,
      path: `${USER_ID}/${PRODUCT_ID}/${id}.webp`,
      thumb_path: `${USER_ID}/${PRODUCT_ID}/${id}_thumb.webp`,
      position: i,
      width: 1600,
      height: 1200,
    };
  });
  return { id: PRODUCT_ID, name: "Relógio Clássico", cost_price: 100, selling_price: 250, entry_type: "product", product_images: images };
}

async function gotoProducts(page: Page) {
  await page.goto("/produtos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Produtos e Serviços" })).toBeVisible({ timeout: 30_000 });
}

async function openNewProductModal(page: Page) {
  await gotoProducts(page);
  await page.getByRole("button", { name: "Novo" }).click();
  await page.getByRole("button", { name: "Produto" }).click();
  await expect(page.getByRole("dialog").getByText("Cadastrar Produto")).toBeVisible();
}

async function openEditModal(page: Page) {
  await gotoProducts(page);
  await page.getByRole("button").filter({ has: page.locator("svg.lucide-ellipsis-vertical") }).first().click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page.getByRole("dialog").getByText("Editar Produto")).toBeVisible();
}

const galleryInput = (page: Page) => page.getByRole("dialog").locator('input[type="file"][multiple]');
const tiles = (page: Page) => page.getByRole("dialog").getByLabel(/Arraste para reordenar/);

test.describe("Fotos de produtos", () => {
  test("cria produto com 2 fotos, troca a capa e envia comprimido em WebP", async ({ page }) => {
    const mock = await mockSupabase(page);
    await openNewProductModal(page);

    const red = await makeJpeg(page, 2400, 1800, "#cc0000");
    const blue = await makeJpeg(page, 1800, 2400, "#0000cc");

    await page.getByPlaceholder("Ex: Bolo de chocolate").fill("Bolo de pote");
    await galleryInput(page).setInputFiles([
      { name: "IMG_0001.jpg", mimeType: "image/jpeg", buffer: red },
      { name: "IMG_0002.jpg", mimeType: "image/jpeg", buffer: blue },
    ]);
    await expect(tiles(page)).toHaveCount(2);
    await expect(tiles(page).first()).toHaveAttribute("aria-label", /capa/i);

    // Segunda foto vira capa
    await page.getByRole("dialog").getByRole("button", { name: "Definir como capa" }).click();

    await page.getByRole("button", { name: "Salvar Produto" }).click();
    await expect(page.getByText("Produto criado!")).toBeVisible();

    // 2 fotos = 2 arquivos principais + 2 miniaturas, todos WebP e pequenos
    expect(mock.uploads).toHaveLength(4);
    for (const upload of mock.uploads) {
      expect(upload.contentType).toBe("image/webp");
      expect(upload.path.startsWith(`${USER_ID}/${mock.createdProductId}/`)).toBe(true);
      expect(upload.size).toBeLessThan(600 * 1024);
    }
    expect(mock.uploads.filter((u) => u.path.endsWith("_thumb.webp"))).toHaveLength(2);

    // Ordem final: a segunda foto (retrato) primeiro; redimensionada pra no máximo 1600px
    expect(mock.syncCalls).toHaveLength(1);
    const items = mock.syncCalls[0].p_items as { width: number; height: number }[];
    expect(mock.syncCalls[0].p_product_id).toBe(mock.createdProductId);
    expect(items.map((i) => [i.width, i.height])).toEqual([[1200, 1600], [1600, 1200]]);
  });

  test("não deixa passar de 3 fotos", async ({ page }) => {
    await mockSupabase(page);
    await openNewProductModal(page);
    const img = await makeJpeg(page, 800, 600, "#00aa00");

    await galleryInput(page).setInputFiles(
      [1, 2, 3, 4].map((n) => ({ name: `foto${n}.jpg`, mimeType: "image/jpeg", buffer: img })),
    );

    await expect(page.getByText("Máximo de 3 fotos por produto.")).toBeVisible();
    await expect(tiles(page)).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Galeria ou arquivos" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tirar foto" })).toHaveCount(0);
  });

  test("recusa arquivo que não é imagem", async ({ page }) => {
    await mockSupabase(page);
    await openNewProductModal(page);

    await galleryInput(page).setInputFiles({ name: "nota.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });

    await expect(page.getByText(/Formato não suportado/)).toBeVisible();
    await expect(tiles(page)).toHaveCount(0);
  });

  test("botão de câmera abre a câmera traseira no celular", async ({ page }) => {
    await mockSupabase(page);
    await openNewProductModal(page);

    const camera = page.getByRole("dialog").locator('input[capture="environment"]');
    await expect(camera).toHaveAttribute("accept", "image/*");
    await expect(page.getByRole("button", { name: "Tirar foto" })).toBeVisible();
  });

  test("editar: remove uma foto e apaga os arquivos que saíram", async ({ page }) => {
    const product = existingProduct(2);
    const mock = await mockSupabase(page, [product]);
    const removed = [product.product_images[0].path, product.product_images[0].thumb_path];
    mock.syncResponse = removed;

    await openEditModal(page);
    await expect(tiles(page)).toHaveCount(2);

    await page.getByRole("dialog").getByRole("button", { name: "Remover foto" }).first().click();
    await expect(tiles(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Salvar Produto" }).click();
    await expect(page.getByText("Produto atualizado!")).toBeVisible();

    expect(mock.uploads).toHaveLength(0);
    expect(mock.syncCalls[0].p_items).toEqual([{ id: product.product_images[1].id }]);
    expect(mock.removedPaths.flat()).toEqual(removed);
  });

  test("editar sem mexer nas fotos não chama o servidor de fotos", async ({ page }) => {
    const mock = await mockSupabase(page, [existingProduct(2)]);
    await openEditModal(page);
    await page.getByRole("button", { name: "Salvar Produto" }).click();
    await expect(page.getByText("Produto atualizado!")).toBeVisible();
    expect(mock.syncCalls).toHaveLength(0);
  });

  test("reordena arrastando a foto", async ({ page, isMobile }) => {
    test.skip(isMobile, "arraste por toque é coberto pelo teste manual no aparelho");
    const product = existingProduct(3);
    const mock = await mockSupabase(page, [product]);
    await openEditModal(page);
    await expect(tiles(page)).toHaveCount(3);

    // Arrasta a terceira foto pra primeira posição
    const from = await tiles(page).nth(2).boundingBox();
    const to = await tiles(page).nth(0).boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width / 2 - 10, from!.y + from!.height / 2, { steps: 3 });
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 15 });
    await page.mouse.up();

    await page.getByRole("button", { name: "Salvar Produto" }).click();
    await expect(page.getByText("Produto atualizado!")).toBeVisible();

    const ids = product.product_images.map((img) => img.id);
    expect(mock.syncCalls[0].p_items).toEqual([{ id: ids[2] }, { id: ids[0] }, { id: ids[1] }]);
  });

  test("se a gravação das fotos falhar, o produto é salvo e os arquivos enviados são apagados", async ({ page }) => {
    const mock = await mockSupabase(page);
    mock.failNextSync = true;
    await openNewProductModal(page);
    const img = await makeJpeg(page, 1000, 1000, "#888888");

    await page.getByPlaceholder("Ex: Bolo de chocolate").fill("Produto com falha");
    await galleryInput(page).setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: img });
    await expect(tiles(page)).toHaveCount(1);
    await page.getByRole("button", { name: "Salvar Produto" }).click();

    await expect(page.getByText(/Produto salvo, mas as fotos não foram enviadas/)).toBeVisible();
    expect(mock.uploads).toHaveLength(2);
    expect(mock.removedPaths.flat().sort()).toEqual(mock.uploads.map((u) => u.path).sort());
  });

  test("lista mostra a capa e o detalhe mostra o carrossel", async ({ page }) => {
    const product = existingProduct(2);
    await mockSupabase(page, [product]);
    await gotoProducts(page);

    const coverThumb = product.product_images[0].thumb_path;
    await expect(page.locator(`img[src*="${coverThumb}"]`)).toBeVisible();

    await page.getByText("Relógio Clássico").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("img", { name: /foto 1/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Ver foto 2" })).toBeVisible();
  });
});

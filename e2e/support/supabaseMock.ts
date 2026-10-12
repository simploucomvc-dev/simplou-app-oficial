import type { Page, Route } from "@playwright/test";

// Simula o Supabase inteiro no navegador: nenhuma requisição do teste chega à produção.
// Uma rota "pega-tudo" responde vazio pro que não foi tratado explicitamente.

export const SUPABASE_URL = "https://bjhrbvzpkjgstgpmbtuc.supabase.co";
const STORAGE_KEY = "sb-bjhrbvzpkjgstgpmbtuc-auth-token";

export const USER_ID = "11111111-1111-4111-8111-111111111111";

// PNG 1x1 servido como "foto" nos links temporários
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

export interface MockProduct {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  entry_type: "product" | "service";
  product_images: {
    id: string;
    path: string;
    thumb_path: string;
    position: number;
    width: number;
    height: number;
  }[];
}

export interface UploadedFile {
  path: string;
  contentType: string;
  size: number;
}

export interface SupabaseMock {
  products: MockProduct[];
  uploads: UploadedFile[];
  syncCalls: { p_product_id: string; p_items: Record<string, unknown>[] }[];
  removedPaths: string[][];
  // O que a função sync_product_images devolve (caminhos removidos)
  syncResponse: string[];
  // Falha a próxima chamada da função de gravar fotos
  failNextSync: boolean;
  createdProductId: string;
}

function fakeJwt(): string {
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: USER_ID, role: "authenticated", exp })}.assinatura-falsa`;
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function wantsSingleObject(route: Route): boolean {
  return (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
}

export async function mockSupabase(page: Page, initialProducts: MockProduct[] = []): Promise<SupabaseMock> {
  const state: SupabaseMock = {
    products: initialProducts,
    uploads: [],
    syncCalls: [],
    removedPaths: [],
    syncResponse: [],
    failNextSync: false,
    createdProductId: "22222222-2222-4222-8222-222222222222",
  };

  const session = {
    access_token: fakeJwt(),
    refresh_token: "refresh-falso",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: {
      id: USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "teste-e2e@simplou.local",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };

  // Sessão já "logada" antes do app carregar
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(session)]);

  // Nada sai pra internet: Google Ads, fontes etc. são bloqueados
  // (registrada primeiro = menor prioridade; o Playwright usa a última rota que casar)
  await page.route((url) => url.hostname !== "localhost", (route) => route.abort());

  // Pega-tudo do Supabase
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    if (wantsSingleObject(route)) {
      return json(route, { code: "PGRST116", message: "Nenhuma linha" }, 406);
    }
    return json(route, []);
  });

  await page.route(`${SUPABASE_URL}/auth/v1/**`, (route) => json(route, session));

  await page.route(`${SUPABASE_URL}/rest/v1/profiles**`, (route) =>
    json(route, {
      id: USER_ID,
      name: "Teste E2E",
      role: "user",
      subscription_status: "active",
      onboarding_completed: true,
      created_at: new Date().toISOString(),
    }),
  );

  await page.route(`${SUPABASE_URL}/rest/v1/products**`, (route) => {
    const method = route.request().method();
    if (method === "GET") return json(route, state.products);
    if (method === "POST") return json(route, { id: state.createdProductId }, 201);
    if (method === "PATCH") return route.fulfill({ status: 204 });
    if (method === "DELETE") return route.fulfill({ status: 204 });
    return json(route, []);
  });

  await page.route(`${SUPABASE_URL}/rest/v1/rpc/sync_product_images`, (route) => {
    state.syncCalls.push(route.request().postDataJSON());
    if (state.failNextSync) {
      state.failNextSync = false;
      return json(route, { code: "P0001", message: "falha simulada" }, 400);
    }
    return json(route, state.syncResponse);
  });

  // Upload: POST /storage/v1/object/product-images/{caminho}
  await page.route(`${SUPABASE_URL}/storage/v1/object/product-images/**`, (route) => {
    const request = route.request();
    if (request.method() !== "POST") return json(route, []);
    const path = decodeURIComponent(new URL(request.url()).pathname.split("/object/product-images/")[1]);
    const body = request.postDataBuffer() ?? Buffer.alloc(0);
    // O supabase-js envia o arquivo como multipart: o tipo real fica no cabeçalho da parte do arquivo
    const headerType = request.headers()["content-type"] ?? "";
    const partType = /Content-Type:\s*(image\/[\w.+-]+)/i.exec(body.toString("latin1"))?.[1];
    state.uploads.push({
      path,
      contentType: headerType.startsWith("multipart/") ? partType ?? "" : headerType,
      size: body.length,
    });
    return json(route, { Key: `product-images/${path}`, Id: path });
  });

  // Remoção: DELETE /storage/v1/object/product-images  { prefixes: [...] }
  await page.route(`${SUPABASE_URL}/storage/v1/object/product-images`, (route) => {
    if (route.request().method() === "DELETE") {
      state.removedPaths.push(route.request().postDataJSON().prefixes);
    }
    return json(route, []);
  });

  // Links temporários em lote e a imagem servida por eles
  await page.route(`${SUPABASE_URL}/storage/v1/object/sign/**`, (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const { paths } = request.postDataJSON() as { paths: string[] };
      return json(route, paths.map((path) => ({
        path,
        signedURL: `/object/sign/product-images/${path}?token=falso`,
        error: null,
      })));
    }
    return route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG });
  });

  return state;
}

// Gera uma foto JPEG "de celular" (grande) no próprio navegador
export async function makeJpeg(page: Page, width: number, height: number, color: string): Promise<Buffer> {
  const base64 = await page.evaluate(async ({ width, height, color }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(width / 4, height / 4, width / 2, height / 2);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }, { width, height, color });
  return Buffer.from(base64, "base64");
}

import { describe, it, expect } from "vitest";
import { IMAGE_INPUT_MAX_BYTES, validateImageFile } from "./processImage";

function fakeFile(name: string, type: string, size = 1000): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it("aceita os formatos comuns de celular", () => {
    expect(validateImageFile(fakeFile("a.jpg", "image/jpeg"))).toBeNull();
    expect(validateImageFile(fakeFile("a.png", "image/png"))).toBeNull();
    expect(validateImageFile(fakeFile("a.webp", "image/webp"))).toBeNull();
    expect(validateImageFile(fakeFile("a.heic", "image/heic"))).toBeNull();
  });

  it("reconhece HEIC pela extensão quando o navegador não informa o tipo", () => {
    expect(validateImageFile(fakeFile("IMG_0001.HEIC", ""))).toBeNull();
  });

  it("recusa arquivos que não são imagem", () => {
    expect(validateImageFile(fakeFile("nota.pdf", "application/pdf"))).toMatch(/Formato/);
    expect(validateImageFile(fakeFile("foto.svg", "image/svg+xml"))).toMatch(/Formato/);
  });

  it("recusa arquivos acima do limite", () => {
    expect(validateImageFile(fakeFile("a.jpg", "image/jpeg", IMAGE_INPUT_MAX_BYTES + 1))).toMatch(/25 MB/);
    expect(validateImageFile(fakeFile("a.jpg", "image/jpeg", IMAGE_INPUT_MAX_BYTES))).toBeNull();
  });
});

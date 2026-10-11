import { useEffect, useState } from "react";
import { getSignedImageUrls } from "@/services/productImages";

export function useSignedImageUrls(paths: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  // Chave estável: só busca de novo quando a lista de arquivos muda
  const key = [...paths].sort().join("|");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    getSignedImageUrls(key.split("|"))
      .then((result) => { if (!cancelled) setUrls((prev) => ({ ...prev, ...result })); })
      .catch(() => { /* sem link a foto cai no ícone padrão */ });
    return () => { cancelled = true; };
  }, [key]);

  return urls;
}

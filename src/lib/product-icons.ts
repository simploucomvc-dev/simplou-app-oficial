import {
  Package, ShoppingBag, Coffee, Utensils, Cake, Cookie, Pizza,
  Shirt, Scissors, Wrench, Flower2, Gem, BookOpen, Music2, Camera,
  Home, Car, Laptop, Leaf, Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PRODUCT_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "Package", icon: Package, label: "Pacote" },
  { name: "ShoppingBag", icon: ShoppingBag, label: "Sacola" },
  { name: "Coffee", icon: Coffee, label: "Café" },
  { name: "Utensils", icon: Utensils, label: "Comida" },
  { name: "Cake", icon: Cake, label: "Bolo" },
  { name: "Cookie", icon: Cookie, label: "Doce" },
  { name: "Pizza", icon: Pizza, label: "Pizza" },
  { name: "Shirt", icon: Shirt, label: "Roupa" },
  { name: "Scissors", icon: Scissors, label: "Serviço" },
  { name: "Wrench", icon: Wrench, label: "Reparo" },
  { name: "Flower2", icon: Flower2, label: "Flor" },
  { name: "Gem", icon: Gem, label: "Joia" },
  { name: "BookOpen", icon: BookOpen, label: "Livro" },
  { name: "Music2", icon: Music2, label: "Música" },
  { name: "Camera", icon: Camera, label: "Foto" },
  { name: "Home", icon: Home, label: "Casa" },
  { name: "Car", icon: Car, label: "Carro" },
  { name: "Laptop", icon: Laptop, label: "Tech" },
  { name: "Leaf", icon: Leaf, label: "Natural" },
  { name: "Star", icon: Star, label: "Estrela" },
];

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PRODUCT_ICONS.map(({ name, icon }) => [name, icon])
);

const STORAGE_KEY = "simplou_product_icons";

function getStoredIcons(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setProductIcon(productId: string, iconName: string) {
  const icons = getStoredIcons();
  icons[productId] = iconName;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
}

export function getProductIconName(productId: string): string {
  return getStoredIcons()[productId] || "Package";
}

export function maskBRL(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseBRL(masked: string): number {
  if (!masked) return 0;
  return parseFloat(masked.replace(/\./g, "").replace(",", ".")) || 0;
}

export interface FixedCostLike {
  value: number;
  value_type?: string;
  percentage_base?: string;
  is_active?: boolean;
  type?: string;
}

/** Soma custos fixos (R$ e %) para um produto específico. */
export function calcFixedCostForProduct(
  fixedCosts: FixedCostLike[],
  sellingPrice: number,
  costPrice: number,
  usdRate: number = 1
): number {
  return fixedCosts
    .filter(c => (c.is_active !== false) && (!c.type || c.type === "fixed"))
    .reduce((sum, c) => {
      if (c.value_type === "percentage") {
        const base = c.percentage_base === "cost_price" ? costPrice : sellingPrice;
        return sum + (base * Number(c.value)) / 100;
      }
      if (c.value_type === "usd") {
        return sum + Number(c.value) * usdRate;
      }
      return sum + Number(c.value);
    }, 0);
}

/** Soma custos variáveis vinculados a um produto específico. */
export function calcVariableCostForProduct(
  linkedCosts: FixedCostLike[],
  sellingPrice: number,
  costPrice: number,
  usdRate: number = 1
): number {
  return linkedCosts.reduce((sum, c) => {
    if (c.value_type === "percentage") {
      const base = c.percentage_base === "cost_price" ? costPrice : sellingPrice;
      return sum + (base * Number(c.value)) / 100;
    }
    if (c.value_type === "usd") {
      return sum + Number(c.value) * usdRate;
    }
    return sum + Number(c.value);
  }, 0);
}

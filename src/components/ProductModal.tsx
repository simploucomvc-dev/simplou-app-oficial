import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lightbulb, Sparkles, Check } from "lucide-react";
import { PRODUCT_ICONS, ICON_MAP, setProductIcon, getProductIconName, maskBRL, parseBRL, calcFixedCostForProduct } from "@/lib/product-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExpandableInput } from "@/components/ui/expandable-input";
import { cn } from "@/lib/utils";
import type { Product, FixedCost } from "@/pages/ProductsPage";

interface Props {
  open: boolean;
  product?: Product;
  entryType?: "product" | "service";
  fixedCosts: FixedCost[];
  usdRate?: number;
  onClose: () => void;
  onSaved: () => void;
}

function toMask(value: number | undefined): string {
  if (!value) return "";
  return maskBRL(String(Math.round(value * 100)));
}

export default function ProductModal({ open, product, entryType = "product", fixedCosts, usdRate = 1, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [costPrice, setCostPrice] = useState(toMask(product?.cost_price));
  const [sellingPrice, setSellingPrice] = useState(toMask(product?.selling_price));
  const [selectedIcon, setSelectedIcon] = useState(() => product ? getProductIconName(product.id) : "Package");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ignoreFixedCosts, setIgnoreFixedCosts] = useState(product?.ignore_fixed_costs ?? false);
  const [localEntryType, setLocalEntryType] = useState<"product" | "service">(product?.entry_type || entryType);

  useEffect(() => {
    if (!open) return;
    setName(product?.name || "");
    setDescription(product?.description || "");
    setCostPrice(toMask(product?.cost_price));
    setSellingPrice(toMask(product?.selling_price));
    setSelectedIcon(product ? getProductIconName(product.id) : "Package");
    setIconPickerOpen(false);
    setLocalEntryType(product?.entry_type || entryType);
    setIgnoreFixedCosts(product?.ignore_fixed_costs ?? false);
  }, [open, product, entryType]);

  const cp = parseBRL(costPrice);
  const sp = parseBRL(sellingPrice);

  // Custos fixos: BRL (para preço sugerido, sem circularidade) + % sobre sp atual
  const fixedCostBRL = ignoreFixedCosts ? 0 : fixedCosts
    .filter(c => c.is_active && (!c.type || c.type === "fixed") && c.value_type !== "percentage")
    .reduce((s, c) => s + (c.value_type === "usd" ? Number(c.value) * usdRate : Number(c.value)), 0);
  const effectiveFixedCost = ignoreFixedCosts ? 0 : calcFixedCostForProduct(fixedCosts, sp, cp, usdRate);
  const fixedCostPctTotal = ignoreFixedCosts ? 0 : fixedCosts
    .filter(c => c.is_active && (!c.type || c.type === "fixed") && c.value_type === "percentage")
    .reduce((s, c) => s + Number(c.value), 0);

  // Sugerido usa apenas R$ fixos (sem % para evitar circularidade)
  const suggestedPrice = (cp + fixedCostBRL) * 2;
  const profit = sp - effectiveFixedCost - cp;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (cp < 0 || sp < 0) { toast.error("Valores não podem ser negativos"); return; }
    if (!user) return;

    setSaving(true);

    const data = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      cost_price: cp,
      selling_price: sp,
      ignore_fixed_costs: ignoreFixedCosts,
      entry_type: localEntryType,
    };

    if (product) {
      const { error } = await supabase.from("products").update(data).eq("id", product.id);
      if (error) {
        setSaving(false);
        toast.error("Erro ao salvar produto");
        return;
      }
      setProductIcon(product.id, selectedIcon);
    } else {
      const { data: saved, error } = await supabase.from("products").insert(data).select("id").single();
      if (error || !saved) {
        setSaving(false);
        toast.error("Erro ao salvar produto");
        return;
      }
      setProductIcon(saved.id, selectedIcon);
    }

    setSaving(false);
    const isService = localEntryType === "service";
    toast.success(product ? (isService ? "Serviço atualizado!" : "Produto atualizado!") : (isService ? "Serviço criado!" : "Produto criado!"));
    onSaved();
    onClose();
  };

  const SelectedIconComponent = ICON_MAP[selectedIcon] || ICON_MAP["Package"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[75dvh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
        {/* Header fixo */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <SelectedIconComponent size={20} className="text-brand-hover" />
            {product
              ? (localEntryType === "service" ? "Editar Serviço" : "Editar Produto")
              : (localEntryType === "service" ? "Cadastrar Serviço" : "Cadastrar Produto")}
          </DialogTitle>
        </DialogHeader>

        {/* Área com scroll interno */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Tipo Selector */}
          <div className="flex p-1 bg-muted rounded-lg gap-1 mb-2">
            <button
              onClick={() => setLocalEntryType("product")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                localEntryType === "product" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Produto
            </button>
            <button
              onClick={() => setLocalEntryType("service")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                localEntryType === "service" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Serviço
            </button>
          </div>

          <div className="space-y-4 mt-2">
            {/* Nome */}
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                {localEntryType === "service" ? "Nome do serviço" : "Nome do produto"}
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bolo de chocolate" className="h-11" />
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Descrição (opcional)</Label>
              <ExpandableInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o produto..."
                modalTitle="Descrição do Produto"
                className="shadow-sm border-input"
              />
            </div>

            {/* Ícone */}
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-2 block">
                {localEntryType === "service" ? "Ícone do serviço" : "Ícone do produto"}
              </Label>
              <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-12 h-12 rounded-xl bg-brand-light border-2 border-brand-primary/40 hover:border-brand-primary flex items-center justify-center transition-all"
                    title="Clique para trocar o ícone"
                  >
                    <SelectedIconComponent size={22} className="text-brand-hover" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start" sideOffset={8}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Escolha um ícone</p>
                  <div className="grid grid-cols-5 gap-1">
                    {PRODUCT_ICONS.map(({ name: iconName, icon: Icon, label }) => (
                      <button
                        key={iconName}
                        type="button"
                        title={label}
                        onClick={() => { setSelectedIcon(iconName); setIconPickerOpen(false); }}
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                          selectedIcon === iconName
                            ? "bg-brand-primary text-white shadow-sm"
                            : "text-muted-foreground hover:bg-brand-light hover:text-brand-hover"
                        )}
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Preço de custo */}
            {localEntryType === "product" && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Preço de compra (custo)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={costPrice}
                    onChange={(e) => setCostPrice(maskBRL(e.target.value))}
                    placeholder="0,00"
                    className="h-11 pl-9"
                  />
                </div>
              </div>
            )}

            {/* Custo fixo (automático) */}
            <div className="bg-muted border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Custo fixo total (automático)</p>
              <div className={cn("flex items-center gap-2 flex-wrap", ignoreFixedCosts && "opacity-40 line-through")}>
                {(fixedCostBRL > 0 || fixedCostPctTotal === 0) && (
                  <span className="text-lg font-bold">{formatCurrency(fixedCostBRL)}</span>
                )}
                {fixedCostPctTotal > 0 && (
                  <span className="inline-flex items-center text-sm font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-md">
                    + {fixedCostPctTotal}% <span className="ml-1 font-normal text-xs">{sp > 0 ? `= ${formatCurrency(effectiveFixedCost - fixedCostBRL)}` : "do preço"}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ignorar custos fixos */}
            <button
              type="button"
              onClick={() => setIgnoreFixedCosts((v) => !v)}
              className="flex items-center gap-2.5 w-full text-left"
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  ignoreFixedCosts
                    ? "bg-brand-primary border-brand-primary"
                    : "border-muted-foreground/40 bg-background"
                )}
              >
                {ignoreFixedCosts && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-sm text-muted-foreground">Ignorar custos fixos neste produto</span>
            </button>

            <div className="border-t border-border" />

            {/* Preço sugerido */}
            <div className="bg-success/10 border border-success/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Lightbulb size={12} /> Preço sugerido (markup 100%)
              </p>
              <p className="text-lg font-bold text-success">{formatCurrency(suggestedPrice)}</p>
            </div>

            {/* Preço de venda */}
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Preço de venda (seu preço final)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(maskBRL(e.target.value))}
                  placeholder="0,00"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Lucro estimado */}
            <div className="bg-muted border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles size={12} /> Lucro estimado por unidade
              </p>
              <p className={`text-lg font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(profit)}
              </p>
              {sp > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  (Preço {formatCurrency(sp)} - Custos {formatCurrency(effectiveFixedCost + cp)})
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1 bg-brand-primary hover:bg-brand-hover text-white" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : (localEntryType === "service" ? "Salvar Serviço" : "Salvar Produto")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

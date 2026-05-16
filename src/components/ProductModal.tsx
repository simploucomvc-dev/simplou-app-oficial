import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lightbulb, Sparkles, Pencil } from "lucide-react";
import { PRODUCT_ICONS, ICON_MAP, setProductIcon, getProductIconName, maskBRL, parseBRL } from "@/lib/product-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExpandableInput } from "@/components/ui/expandable-input";
import { cn } from "@/lib/utils";
import type { Product } from "@/pages/ProductsPage";

interface Props {
  open: boolean;
  product?: Product;
  entryType?: "product" | "service";
  onClose: () => void;
  onSaved: () => void;
}

function toMask(value: number | undefined): string {
  if (!value) return "";
  return maskBRL(String(Math.round(value * 100)));
}

export default function ProductModal({ open, product, entryType = "product", onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [costPrice, setCostPrice] = useState(toMask(product?.cost_price));
  const [sellingPrice, setSellingPrice] = useState(toMask(product?.selling_price));
  const [selectedIcon, setSelectedIcon] = useState(() => product ? getProductIconName(product.id) : "Package");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localEntryType, setLocalEntryType] = useState<"product" | "service">(product?.entry_type || entryType);
  const [stockQuantity, setStockQuantity] = useState<string>(product?.stock_quantity != null ? String(product.stock_quantity) : "");

  useEffect(() => {
    if (!open) return;
    setName(product?.name || "");
    setDescription(product?.description || "");
    setCostPrice(toMask(product?.cost_price));
    setSellingPrice(toMask(product?.selling_price));
    setSelectedIcon(product ? getProductIconName(product.id) : "Package");
    setIconPickerOpen(false);
    setLocalEntryType(product?.entry_type || entryType);
    setStockQuantity(product?.stock_quantity != null ? String(product.stock_quantity) : "");
  }, [open, product, entryType]);

  const cp = parseBRL(costPrice);
  const sp = parseBRL(sellingPrice);

  const suggestedPrice = cp * 2;
  const profit = sp - cp;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (cp < 0 || sp < 0) { toast.error("Valores não podem ser negativos"); return; }
    if (!user) return;

    setSaving(true);

    const parsedStock = stockQuantity.trim() !== "" ? parseInt(stockQuantity) : null;
    const data = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      cost_price: cp,
      selling_price: sp,
      entry_type: localEntryType,
      stock_quantity: localEntryType === "product" ? parsedStock : null,
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
            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Clique para trocar o ícone"
                  className="relative w-8 h-8 rounded-lg bg-brand-light hover:bg-brand-primary/20 border border-brand-primary/30 hover:border-brand-primary flex items-center justify-center transition-all shrink-0"
                >
                  <SelectedIconComponent size={16} className="text-brand-hover" />
                  <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-sm pointer-events-none">
                    <Pencil size={7} />
                  </span>
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
                {localEntryType === "service" ? "Nome do serviço" : "Nome do produto"} <span className="text-destructive">*</span>
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bolo de chocolate" className="h-11" />
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Descrição <span className="text-xs font-normal text-muted-foreground">(opcional)</span></Label>
              <ExpandableInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o produto..."
                modalTitle="Descrição do Produto"
                className="shadow-sm border-input"
              />
            </div>

            {/* Estoque (só produto) */}
            {localEntryType === "product" && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                  Quantidade em estoque <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Ex: 50"
                  className="h-11"
                />
              </div>
            )}

            {/* Preço de custo (só produto) */}
            {localEntryType === "product" && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Preço de compra (custo) <span className="text-xs font-normal text-muted-foreground">(opcional)</span></Label>
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
              <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Preço de venda (seu preço final) <span className="text-xs font-normal text-muted-foreground">(opcional)</span></Label>
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
                  (Preço {formatCurrency(sp)} - Custo {formatCurrency(cp)})
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-brand-primary hover:bg-brand-hover text-white" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : (localEntryType === "service" ? "Salvar Serviço" : "Salvar Produto")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

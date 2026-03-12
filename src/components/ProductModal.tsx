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
import { PRODUCT_ICONS, ICON_MAP, setProductIcon, getProductIconName, maskBRL, parseBRL } from "@/lib/product-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExpandableInput } from "@/components/ui/expandable-input";
import { cn } from "@/lib/utils";
import type { Product, FixedCost } from "@/pages/ProductsPage";

interface Props {
  open: boolean;
  product?: Product;
  entryType?: "product" | "service";
  totalFixedCost: number;
  onClose: () => void;
  onSaved: () => void;
  onOpenCosts?: () => void;
}

function toMask(value: number | undefined): string {
  if (!value) return "";
  return maskBRL(String(Math.round(value * 100)));
}

export default function ProductModal({ open, product, entryType = "product", totalFixedCost, onClose, onSaved, onOpenCosts }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [costPrice, setCostPrice] = useState(toMask(product?.cost_price));
  const [sellingPrice, setSellingPrice] = useState(toMask(product?.selling_price));
  const [selectedIcon, setSelectedIcon] = useState(() => product ? getProductIconName(product.id) : "Package");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ignoreFixedCosts, setIgnoreFixedCosts] = useState(product?.ignore_fixed_costs ?? false);
  const [variableCosts, setVariableCosts] = useState<FixedCost[]>([]);
  const [selectedVariableCostIds, setSelectedVariableCostIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    setName(product?.name || "");
    setDescription(product?.description || "");
    setCostPrice(toMask(product?.cost_price));
    setSellingPrice(toMask(product?.selling_price));
    setSelectedIcon(product ? getProductIconName(product.id) : "Package");
    setIconPickerOpen(false);
    setIgnoreFixedCosts(product?.ignore_fixed_costs ?? false);
    setSelectedVariableCostIds([]);

    const loadData = async () => {
      if (!user) return;

      const { data: vcData } = await supabase
        .from("fixed_costs")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "variable");

      setVariableCosts(vcData || []);

      if (product) {
        const { data: linked } = await supabase
          .from("product_variable_costs")
          .select("variable_cost_id")
          .eq("product_id", product.id);

        setSelectedVariableCostIds((linked || []).map((r: { variable_cost_id: string }) => r.variable_cost_id));
      }
    };

    loadData();
  }, [open, product, user]);

  const cp = parseBRL(costPrice);
  const sp = parseBRL(sellingPrice);

  const effectiveFixedCost = ignoreFixedCosts ? 0 : totalFixedCost;
  const selectedVarTotal = variableCosts
    .filter((c) => selectedVariableCostIds.includes(c.id))
    .reduce((s, c) => s + Number(c.value), 0);

  const suggestedPrice = (cp + effectiveFixedCost + selectedVarTotal) * 2;
  const profit = sp - selectedVarTotal - effectiveFixedCost - cp;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const toggleVariableCost = (id: string) => {
    setSelectedVariableCostIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
      variable_cost: selectedVarTotal,
      selling_price: sp,
      ignore_fixed_costs: ignoreFixedCosts,
      entry_type: product?.entry_type ?? entryType,
    };

    let productId: string | null = product?.id ?? null;

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
      productId = saved.id;
      setProductIcon(saved.id, selectedIcon);
    }

    if (productId) {
      await supabase.from("product_variable_costs").delete().eq("product_id", productId);

      if (selectedVariableCostIds.length > 0) {
        await supabase.from("product_variable_costs").insert(
          selectedVariableCostIds.map((vcId) => ({ product_id: productId, variable_cost_id: vcId }))
        );
      }
    }

    setSaving(false);
    const isService = (product?.entry_type ?? entryType) === "service";
    toast.success(product ? (isService ? "Serviço atualizado!" : "Produto atualizado!") : (isService ? "Serviço criado!" : "Produto criado!"));
    onSaved();
    onClose();
  };

  const SelectedIconComponent = ICON_MAP[selectedIcon] || ICON_MAP["Package"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <SelectedIconComponent size={20} className="text-brand-hover" />
            {product
              ? (product.entry_type === "service" ? "Editar Serviço" : "Editar Produto")
              : (entryType === "service" ? "Cadastrar Serviço" : "Cadastrar Produto")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Nome */}
          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              {(product?.entry_type ?? entryType) === "service" ? "Nome do serviço" : "Nome do produto"}
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
            <Label className="text-muted-foreground text-sm font-medium mb-2 block">Ícone do produto</Label>
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

          {/* Custos variáveis vinculados */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Custos Variáveis</p>
              {onOpenCosts && (
                <Button type="button" variant="ghost" size="sm" onClick={onOpenCosts} className="h-6 text-xs text-brand-hover hover:text-brand-primary px-2">
                  + Criar
                </Button>
              )}
            </div>

            {variableCosts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-1">Nenhum custo cadastrado.</p>
            ) : (
              <div className="space-y-1.5">
                {variableCosts.map((vc) => {
                  const checked = selectedVariableCostIds.includes(vc.id);
                  return (
                    <button
                      key={vc.id}
                      type="button"
                      onClick={() => toggleVariableCost(vc.id)}
                      className="w-full flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-brand-light transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            checked
                              ? "bg-brand-primary border-brand-primary"
                              : "border-muted-foreground/40 bg-background"
                          )}
                        >
                          {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm">{vc.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0">{formatCurrency(Number(vc.value))}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedVariableCostIds.length > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Subtotal selecionado</span>
                <span className="text-xs font-semibold text-brand-hover">{formatCurrency(selectedVarTotal)}</span>
              </div>
            )}
          </div>

          {/* Custo fixo (automático) */}
          <div className="bg-muted border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Custo fixo total (automático)</p>
            <p className={cn("text-lg font-bold", ignoreFixedCosts && "line-through text-muted-foreground")}>
              {formatCurrency(totalFixedCost)}
            </p>
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
                (Preço {formatCurrency(sp)} - Custos {formatCurrency(effectiveFixedCost + cp + selectedVarTotal)})
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-brand-primary hover:bg-brand-hover text-white" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : ((product?.entry_type ?? entryType) === "service" ? "Salvar Serviço" : "Salvar Produto")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

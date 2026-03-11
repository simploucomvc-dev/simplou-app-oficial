import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Product } from "@/pages/ProductsPage";

interface Props {
  open: boolean;
  product?: Product;
  totalFixedCost: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductModal({ open, product, totalFixedCost, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(product?.name || "");
  const [costPrice, setCostPrice] = useState(product?.cost_price?.toString() || "");
  const [variableCost, setVariableCost] = useState(product?.variable_cost?.toString() || "0");
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price?.toString() || "");
  const [saving, setSaving] = useState(false);

  const cp = parseFloat(costPrice) || 0;
  const vc = parseFloat(variableCost) || 0;
  const sp = parseFloat(sellingPrice) || 0;
  const suggestedPrice = (cp + totalFixedCost + vc) * 2;
  const taxes = sp * 0.06;
  const profit = sp - taxes - vc - totalFixedCost - cp;

  // Reset form when modal opens with different product
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
    else {
      setName(product?.name || "");
      setCostPrice(product?.cost_price?.toString() || "");
      setVariableCost(product?.variable_cost?.toString() || "0");
      setSellingPrice(product?.selling_price?.toString() || "");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (cp < 0 || vc < 0 || sp < 0) { toast.error("Valores não podem ser negativos"); return; }
    if (!user) return;

    setSaving(true);
    const data = {
      user_id: user.id,
      name: name.trim(),
      cost_price: cp,
      variable_cost: vc,
      selling_price: sp,
    };

    const { error } = product
      ? await supabase.from("products").update(data).eq("id", product.id)
      : await supabase.from("products").insert(data);

    setSaving(false);
    if (error) { toast.error("Erro ao salvar produto"); return; }
    toast.success(product ? "Produto atualizado!" : "Produto criado!");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{product ? "Editar Produto" : "Cadastrar Produto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Nome do produto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bolo de chocolate" className="h-11" />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Preço de compra (custo)</Label>
            <Input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="44.90" className="h-11" />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Custo variável do produto</Label>
            <Input type="number" step="0.01" min="0" value={variableCost} onChange={(e) => setVariableCost(e.target.value)} placeholder="0.00" className="h-11" />
          </div>

          <div className="bg-muted border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Custo fixo total (automático)</p>
            <p className="text-lg font-bold">{formatCurrency(totalFixedCost)}</p>
          </div>

          <div className="border-t border-border" />

          <div className="bg-success/10 border border-success/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">💡 Preço sugerido (markup 100%)</p>
            <p className="text-lg font-bold text-success">{formatCurrency(suggestedPrice)}</p>
          </div>

          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Preço de venda (seu preço final)</Label>
            <Input type="number" step="0.01" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="99.90" className="h-11" />
          </div>

          <div className="border-t border-border" />

          <div className="bg-muted border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">✨ Lucro estimado por unidade</p>
            <p className={`text-lg font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(profit)}</p>
            {sp > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                (Preço {formatCurrency(sp)} - Taxas {formatCurrency(taxes)} - Custos {formatCurrency(vc + totalFixedCost + cp)})
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

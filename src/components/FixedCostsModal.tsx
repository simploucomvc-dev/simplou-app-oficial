import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { FixedCost } from "@/pages/ProductsPage";

interface Props {
  open: boolean;
  fixedCosts: FixedCost[];
  onClose: () => void;
  onChanged: () => void;
}

export default function FixedCostsModal({ open, fixedCosts, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  const total = fixedCosts.filter((c) => c.is_active).reduce((s, c) => s + Number(c.value), 0);

  const addItem = async () => {
    if (!newName.trim() || !newValue || !user) return;
    const val = parseFloat(newValue);
    if (val < 0) { toast.error("Valor não pode ser negativo"); return; }
    const { error } = await supabase.from("fixed_costs").insert({
      user_id: user.id,
      name: newName.trim(),
      value: val,
      is_active: true,
    });
    if (error) toast.error("Erro ao adicionar");
    else { setNewName(""); setNewValue(""); onChanged(); }
  };

  const toggleActive = async (cost: FixedCost) => {
    await supabase.from("fixed_costs").update({ is_active: !cost.is_active }).eq("id", cost.id);
    onChanged();
  };

  const removeCost = async (id: string) => {
    await supabase.from("fixed_costs").delete().eq("id", id);
    toast.success("Item removido");
    onChanged();
  };

  const updateValue = async (id: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) return;
    await supabase.from("fixed_costs").update({ value: val }).eq("id", id);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Custos Fixos</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome do custo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 h-10"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-24 h-10"
            />
            <Button size="icon" onClick={addItem} className="shrink-0 h-10 w-10">
              <Plus size={16} />
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {fixedCosts.map((cost) => (
              <div key={cost.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={cost.is_active}
                  onChange={() => toggleActive(cost)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className={`flex-1 text-sm font-semibold ${!cost.is_active ? "line-through text-muted-foreground" : ""}`}>
                  {cost.name}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={cost.value}
                  onBlur={(e) => updateValue(cost.id, e.target.value)}
                  className="w-20 h-8 text-sm"
                />
                <button onClick={() => removeCost(cost.id)} className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
            {fixedCosts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo fixo cadastrado</p>
            )}
          </div>

          <div className="border-t border-border" />

          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">TOTAL:</span>
              <span className="text-2xl font-bold">{formatCurrency(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Este valor será aplicado automaticamente em todos os produtos</p>
          </div>

          <Button variant="outline" size="full" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

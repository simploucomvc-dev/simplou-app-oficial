import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, X, Info } from "lucide-react";
import type { FixedCost } from "@/pages/ProductsPage";

interface Props {
  open: boolean;
  fixedCosts: FixedCost[];
  onClose: () => void;
  onChanged: () => void;
}

export default function FixedCostsModal({ open, fixedCosts, onClose, onChanged }: Props) {
  const { user } = useAuth();

  const [fixedName, setFixedName] = useState("");
  const [fixedValue, setFixedValue] = useState("");
  const [variableName, setVariableName] = useState("");
  const [variableValue, setVariableValue] = useState("");

  const fixedItems = fixedCosts.filter((c) => !c.type || c.type === "fixed");
  const variableItems = fixedCosts.filter((c) => c.type === "variable");

  const fixedTotal = fixedItems.filter((c) => c.is_active).reduce((s, c) => s + Number(c.value), 0);
  const variableTotal = variableItems.reduce((s, c) => s + Number(c.value), 0);

  const addItem = async (type: "fixed" | "variable") => {
    const name = type === "fixed" ? fixedName : variableName;
    const rawValue = type === "fixed" ? fixedValue : variableValue;
    if (!name.trim() || !rawValue || !user) return;
    const val = parseFloat(rawValue);
    if (isNaN(val) || val < 0) { toast.error("Valor inválido"); return; }

    const { error } = await supabase.from("fixed_costs").insert({
      user_id: user.id,
      name: name.trim(),
      value: val,
      is_active: true,
      type,
    });

    if (error) {
      toast.error("Erro ao adicionar");
    } else {
      if (type === "fixed") { setFixedName(""); setFixedValue(""); }
      else { setVariableName(""); setVariableValue(""); }
      onChanged();
    }
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
          <DialogTitle className="text-xl">Custos</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="fixed" className="mt-2">
          <TabsList className="w-full rounded-lg p-1 bg-muted gap-1">
            <TabsTrigger
              value="fixed"
              className="flex-1 rounded-md text-sm font-medium transition-all data-[state=active]:bg-brand-primary data-[state=active]:text-white"
            >
              Custos Fixos
            </TabsTrigger>
            <TabsTrigger
              value="variable"
              className="flex-1 rounded-md text-sm font-medium transition-all data-[state=active]:bg-brand-primary data-[state=active]:text-white"
            >
              Custos Variáveis
            </TabsTrigger>
          </TabsList>

          {/* ── Fixed Costs Tab ── */}
          <TabsContent value="fixed" className="space-y-3 mt-4">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span className="text-xs">Aplicados automaticamente em todos os produtos</span>
            </div>

            {/* Add form */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do custo"
                value={fixedName}
                onChange={(e) => setFixedName(e.target.value)}
                className="flex-1 h-10"
                onKeyDown={(e) => { if (e.key === "Enter") addItem("fixed"); }}
              />
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={fixedValue}
                  onChange={(e) => setFixedValue(e.target.value)}
                  className="h-10 pl-8"
                  onKeyDown={(e) => { if (e.key === "Enter") addItem("fixed"); }}
                />
              </div>
              <Button size="icon" onClick={() => addItem("fixed")} className="shrink-0 h-10 w-10">
                <Plus size={16} />
              </Button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {fixedItems.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={cost.is_active}
                    onChange={() => toggleActive(cost)}
                    className="w-4 h-4 accent-primary rounded shrink-0"
                  />
                  <span
                    className={`flex-1 text-sm font-medium truncate ${
                      !cost.is_active ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {cost.name}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={cost.value}
                    onBlur={(e) => updateValue(cost.id, e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <button
                    onClick={() => removeCost(cost.id)}
                    className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {fixedItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum custo fixo cadastrado
                </p>
              )}
            </div>

            <div className="border-t border-border" />

            <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">TOTAL ATIVO:</span>
              <span className="text-xl font-bold">{formatCurrency(fixedTotal)}</span>
            </div>

            <Button variant="outline" size="full" onClick={onClose}>Fechar</Button>
          </TabsContent>

          {/* ── Variable Costs Tab ── */}
          <TabsContent value="variable" className="space-y-3 mt-4">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span className="text-xs">Podem ser vinculados a produtos específicos</span>
            </div>

            {/* Add form */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do custo"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
                className="flex-1 h-10"
                onKeyDown={(e) => { if (e.key === "Enter") addItem("variable"); }}
              />
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={variableValue}
                  onChange={(e) => setVariableValue(e.target.value)}
                  className="h-10 pl-8"
                  onKeyDown={(e) => { if (e.key === "Enter") addItem("variable"); }}
                />
              </div>
              <Button size="icon" onClick={() => addItem("variable")} className="shrink-0 h-10 w-10">
                <Plus size={16} />
              </Button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {variableItems.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2"
                >
                  <span className="flex-1 text-sm font-medium truncate">{cost.name}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={cost.value}
                    onBlur={(e) => updateValue(cost.id, e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <button
                    onClick={() => removeCost(cost.id)}
                    className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {variableItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum custo variável cadastrado
                </p>
              )}
            </div>

            <div className="border-t border-border" />

            <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm">TOTAL:</span>
              <span className="text-xl font-bold">{formatCurrency(variableTotal)}</span>
            </div>

            <Button variant="outline" size="full" onClick={onClose}>Fechar</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

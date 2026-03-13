import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, X, Info, RefreshCw } from "lucide-react";
import type { FixedCost } from "@/pages/ProductsPage";
import { maskBRL, parseBRL } from "@/lib/product-icons";
import { getUSDRate } from "@/lib/exchange-rate";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  fixedCosts: FixedCost[];
  onClose: () => void;
  onChanged: () => void;
}

type ValueType = "fixed" | "percentage" | "usd";

export default function FixedCostsModal({ open, fixedCosts, onClose, onChanged }: Props) {
  const { user } = useAuth();

  const [fixedName, setFixedName] = useState("");
  const [fixedValue, setFixedValue] = useState("");
  const [fixedValueType, setFixedValueType] = useState<ValueType>("fixed");
  const [variableName, setVariableName] = useState("");
  const [variableValue, setVariableValue] = useState("");
  const [variableValueType, setVariableValueType] = useState<ValueType>("fixed");
  const [saving, setSaving] = useState(false);
  const [usdRate, setUsdRate] = useState(5.50);
  const [rateLoading, setRateLoading] = useState(false);

  const fixedItems = fixedCosts.filter((c) => !c.type || c.type === "fixed");
  const variableItems = fixedCosts.filter((c) => c.type === "variable");

  useEffect(() => {
    if (open) {
      getUSDRate().then(setUsdRate).catch(() => { });
    }
  }, [open]);

  const loadRate = async (): Promise<number> => {
    setRateLoading(true);
    try {
      const rate = await getUSDRate();
      setUsdRate(rate);
      toast.success(`Cotação: US$ 1 = R$ ${rate.toFixed(2)}`);
      return rate;
    } catch {
      toast.error("Não foi possível buscar a cotação");
      return usdRate;
    } finally {
      setRateLoading(false);
    }
  };

  const handleSetValueType = async (tabType: "fixed" | "variable", vt: ValueType) => {
    const setValueType = tabType === "fixed" ? setFixedValueType : setVariableValueType;
    const setValue = tabType === "fixed" ? setFixedValue : setVariableValue;
    if (vt === "usd") await loadRate();
    setValueType(vt);
    setValue("");
  };

  const addItem = async (type: "fixed" | "variable") => {
    const name = type === "fixed" ? fixedName : variableName;
    const rawValue = type === "fixed" ? fixedValue : variableValue;
    const valueType = type === "fixed" ? fixedValueType : variableValueType;
    if (!name.trim() || !rawValue || !user) return;

    let val: number;
    if (valueType === "percentage") {
      val = parseFloat(rawValue);
      if (isNaN(val) || val < 0 || val > 100) { toast.error("Porcentagem deve ser entre 0 e 100"); return; }
    } else if (valueType === "usd") {
      val = parseBRL(rawValue);
      if (isNaN(val) || val < 0) { toast.error("Valor inválido"); return; }
    } else {
      val = parseBRL(rawValue);
      if (isNaN(val) || val < 0) { toast.error("Valor inválido"); return; }
    }

    setSaving(true);
    const { error } = await supabase.from("fixed_costs").insert({
      user_id: user.id,
      name: name.trim(),
      value: val,
      is_active: true,
      type,
      value_type: valueType,
      percentage_base: valueType === "percentage" ? "selling_price" : null,
    });
    setSaving(false);

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

  const renderAddForm = (tabType: "fixed" | "variable") => {
    const name = tabType === "fixed" ? fixedName : variableName;
    const setName = tabType === "fixed" ? setFixedName : setVariableName;
    const value = tabType === "fixed" ? fixedValue : variableValue;
    const setValue = tabType === "fixed" ? setFixedValue : setVariableValue;
    const valueType = tabType === "fixed" ? fixedValueType : variableValueType;

    const btnClass = (active: boolean) => cn(
      "px-3 text-xs font-bold transition-all",
      active ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Nome do custo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 h-11"
          onKeyDown={(e) => { if (e.key === "Enter") addItem(tabType); }}
        />

        <div className="flex gap-2 shrink-0">
          {/* Toggle R$ / % / US$ */}
          <div className="flex h-11 rounded-lg border-2 border-border overflow-hidden">
            <button type="button" onClick={() => handleSetValueType(tabType, "fixed")} className={btnClass(valueType === "fixed")}>R$</button>
            <div className="w-px bg-border" />
            <button type="button" onClick={() => handleSetValueType(tabType, "percentage")} className={btnClass(valueType === "percentage")}>%</button>
            <div className="w-px bg-border" />
            <button type="button" onClick={() => handleSetValueType(tabType, "usd")} disabled={rateLoading} className={btnClass(valueType === "usd")}>
              {rateLoading ? <RefreshCw size={10} className="animate-spin" /> : "US$"}
            </button>
          </div>

          {/* Value input */}
          <div className="relative w-28">
            {valueType === "fixed" || valueType === "usd" ? (
              <>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                  {valueType === "usd" ? "US$" : "R$"}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(maskBRL(e.target.value))}
                  className={cn("h-11", valueType === "usd" ? "pl-10" : "pl-8")}
                  onKeyDown={(e) => { if (e.key === "Enter") addItem(tabType); }}
                />
                {valueType === "usd" && parseBRL(value) > 0 && (
                  <p className="absolute -bottom-4 left-0 text-[10px] text-muted-foreground whitespace-nowrap">
                    ≈ {formatCurrency(parseBRL(value) * usdRate)}
                  </p>
                )}
              </>
            ) : (
              <>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-11 pr-7"
                  onKeyDown={(e) => { if (e.key === "Enter") addItem(tabType); }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">%</span>
              </>
            )}
          </div>

          <Button
            size="icon"
            onClick={() => addItem(tabType)}
            disabled={saving}
            className="shrink-0 h-11 w-11 bg-brand-primary text-white hover:bg-brand-hover"
          >
            <Plus size={18} />
          </Button>
        </div>
      </div>
    );
  };

  const renderCostItem = (cost: FixedCost, showCheckbox = true) => (
    <div key={cost.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
      {showCheckbox && (
        <input
          type="checkbox"
          checked={cost.is_active}
          onChange={() => toggleActive(cost)}
          className="w-4 h-4 accent-primary rounded shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <span className={cn("text-sm font-medium truncate block", !cost.is_active && "line-through text-muted-foreground")}>
          {cost.name}
        </span>
        {cost.value_type === "percentage" && (
          <span className="text-[10px] text-muted-foreground">do preço de venda</span>
        )}
        {cost.value_type === "usd" && (
          <span className="text-[10px] text-muted-foreground font-semibold text-blue-600/70 dark:text-blue-400">Origem: US$</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {cost.value_type === "percentage" ? (
          <span className="inline-flex items-center text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded-md">
            {Number(cost.value)}%
          </span>
        ) : (
          <div className="flex flex-col items-end">
            <div className="relative">
              {cost.value_type === "usd" && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground z-10 pointer-events-none">US$</span>}
              <Input
                type="number"
                step="0.01"
                min="0"
                defaultValue={cost.value}
                onBlur={(e) => updateValue(cost.id, e.target.value)}
                className={cn("w-24 h-8 text-sm", cost.value_type === "usd" && "pl-8")}
              />
            </div>
            {cost.value_type === "usd" && (
              <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                ≈ {formatCurrency(Number(cost.value) * usdRate)}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => removeCost(cost.id)}
          className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Custos</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="fixed" className="mt-2">
          <TabsList className="w-full rounded-lg p-1 bg-muted gap-1">
            <TabsTrigger value="fixed" className="flex-1 rounded-md text-sm font-medium transition-all data-[state=active]:bg-brand-primary data-[state=active]:text-white">
              Custos Fixos
            </TabsTrigger>
            <TabsTrigger value="variable" className="flex-1 rounded-md text-sm font-medium transition-all data-[state=active]:bg-brand-primary data-[state=active]:text-white">
              Custos Variáveis
            </TabsTrigger>
          </TabsList>

          {/* ── Fixed Costs Tab ── */}
          <TabsContent value="fixed" className="space-y-3 mt-4">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span className="text-xs">Aplicados automaticamente em todos os produtos</span>
            </div>

            {renderAddForm("fixed")}

            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {fixedItems.map((cost) => renderCostItem(cost, true))}
              {fixedItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo fixo cadastrado</p>
              )}
            </div>

            <div className="border-t border-border" />
            <Button variant="outline" size="full" onClick={onClose}>Fechar</Button>
          </TabsContent>

          {/* ── Variable Costs Tab ── */}
          <TabsContent value="variable" className="space-y-3 mt-4">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span className="text-xs">Podem ser vinculados a produtos específicos</span>
            </div>

            {renderAddForm("variable")}

            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {variableItems.map((cost) => renderCostItem(cost, false))}
              {variableItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo variável cadastrado</p>
              )}
            </div>

            <div className="border-t border-border" />
            <Button variant="outline" size="full" onClick={onClose}>Fechar</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, MONTHS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, ArrowDownCircle, ArrowUpCircle, Wallet, ClipboardList, Plus, Calendar, Search, X, Package, Check, ChevronsUpDown, RefreshCw, BookmarkPlus } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Drawer } from "vaul";
import { ExpandableInput } from "@/components/ui/expandable-input";
import { cn } from "@/lib/utils";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import ClickUpDatePicker from "@/components/ui/clickup-datepicker";
import { Switch } from "@/components/ui/switch";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { maskBRL, parseBRL } from "@/lib/product-icons";
import { getUSDRate } from "@/lib/exchange-rate";

export interface VariableCostRef {
  variable_cost_id: string;
  fixed_costs: { id: string; name: string; value: number; value_type: string; percentage_base?: string; is_active: boolean } | null;
}

export interface FixedCostRef {
  fixed_cost_id: string;
  fixed_costs: { id: string; name: string; value: number; value_type: string; percentage_base?: string } | null;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  description: string;
  value: number;
  date: string;
  product_id?: string | null;
  products?: { id: string; name: string } | null;
  transaction_products?: { product_id: string; products: { id: string; name: string } | null }[];
  attachment_url?: string | null;
  ignore_fixed_costs?: boolean;
  transaction_variable_costs?: VariableCostRef[];
  transaction_fixed_costs?: FixedCostRef[];
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedFutureMonths, setExpandedFutureMonths] = useState<Set<string>>(new Set());
  const [futureModalOpen, setFutureModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string; selling_price: number }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterText, setFilterText] = useState("");
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrentMonths, setRecurrentMonths] = useState("6");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [varCostDrawerOpen, setVarCostDrawerOpen] = useState(false);
  const [varCostSearch, setVarCostSearch] = useState("");
  const [varCostPopoverOpen, setVarCostPopoverOpen] = useState(false);
  const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUSD, setIsUSD] = useState(false);
  const [usdRate, setUsdRate] = useState(5.50);
  const [rateLoading, setRateLoading] = useState(false);

  // Custos por transação
  const [availableFixedCosts, setAvailableFixedCosts] = useState<{ id: string; name: string; value: number; value_type: string }[]>([]);
  const [availableVariableCosts, setAvailableVariableCosts] = useState<{ id: string; name: string; value: number; value_type: string }[]>([]);
  const [fixedCostMode, setFixedCostMode] = useState<"all" | "none" | "custom">("all");
  const [selectedFixedCostIds, setSelectedFixedCostIds] = useState<string[]>([]);
  // Modo de custo variável: "saved" = selecionar cadastrado, "manual" = digitar
  const [varCostMode, setVarCostMode] = useState<"saved" | "manual">("saved");
  const [selectedVariableCostIds, setSelectedVariableCostIds] = useState<string[]>([]);
  const [manualVarCosts, setManualVarCosts] = useState<{ id: string; name: string; value: string; isUSD: boolean }[]>([]);

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

  const toggleCurrency = async () => {
    if (!isUSD) {
      const rate = await loadRate();
      setIsUSD(true);
      const brlVal = parseBRL(value);
      if (brlVal > 0) setValue(maskBRL(String(Math.round((brlVal / rate) * 100))));
    } else {
      setIsUSD(false);
      const usdVal = parseBRL(value);
      if (usdVal > 0) setValue(maskBRL(String(Math.round(usdVal * usdRate * 100))));
    }
  };

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*, products(id, name), transaction_products(product_id, products(id, name)), transaction_variable_costs(variable_cost_id, fixed_costs(id, name, value, value_type, percentage_base, is_active)), transaction_fixed_costs(fixed_cost_id, fixed_costs(id, name, value, value_type, percentage_base))")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setTransactions(data || []);
    setLoading(false);
    if (data && data.length > 0) {
      const now = new Date();
      const currentYearMonth = now.getFullYear() * 12 + now.getMonth();

      const firstMonth = `${new Date(data[0].date).getFullYear()}-${new Date(data[0].date).getMonth()}`;
      setExpandedMonths(new Set([firstMonth]));

      const futureData = data.filter(tx => {
        const [y, m] = tx.date.split('-');
        return (parseInt(y) * 12 + (parseInt(m) - 1)) > currentYearMonth;
      });
      if (futureData.length > 0) {
        const firstFuture = `${new Date(futureData[0].date).getFullYear()}-${new Date(futureData[0].date).getMonth()}`;
        setExpandedFutureMonths(new Set([firstFuture]));
      }
    }
  }, [user]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("id, name, selling_price").eq("user_id", user.id)
      .then(({ data }) => setAvailableProducts(data || []));
    supabase.from("fixed_costs").select("id, name, value, value_type").eq("user_id", user.id).eq("is_active", true).eq("type", "fixed")
      .then(({ data }) => setAvailableFixedCosts(data || []));
    supabase.from("fixed_costs").select("id, name, value, value_type").eq("user_id", user.id).eq("is_active", true).eq("type", "variable")
      .then(({ data }) => setAvailableVariableCosts(data || []));
  }, [user]);

  const openModal = () => {
    setType("income");
    setDescription("");
    setValue("");
    setSelectedDate(new Date());
    setSelectedProducts([]);
    setIsRecurrent(false);
    setRecurrentMonths("6");
    setAttachmentFile(null);
    setIsUSD(false);
    setFixedCostMode("all");
    setSelectedFixedCostIds([]);
    setVarCostMode("saved");
    setSelectedVariableCostIds([]);
    setManualVarCosts([{ id: crypto.randomUUID(), name: "", value: "", isUSD: false }]);
    setModalOpen(true);
  };

  // Abre modal automaticamente quando navegado com ?new=1 (ex: botão flutuante)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const toggleProduct = (productId: string) => {
    if (!productId) {
      setSelectedProducts([]);
      return;
    }
    setSelectedProducts((prev) => {
      const isSelected = prev.includes(productId);
      if (isSelected) return prev.filter((id) => id !== productId);
      // Auto-preenche o preço apenas ao selecionar o primeiro produto
      if (prev.length === 0) {
        const prod = availableProducts.find((p) => p.id === productId);
        if (prod?.selling_price) {
          setIsUSD(false);
          setValue(maskBRL(String(Math.round(prod.selling_price * 100))));
        }
      }
      return [...prev, productId];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !value || !user) { toast.error("Preencha todos os campos"); return; }
    const val = parseBRL(value) * (isUSD ? usdRate : 1);
    if (val <= 0) { toast.error("Valor deve ser positivo"); return; }

    setSaving(true);
    const totalInstallments = isRecurrent ? parseInt(recurrentMonths) : 1;
    const transactionsToInsert = [];

    for (let i = 0; i < totalInstallments; i++) {
      const suffix = totalInstallments > 1 ? ` (Parcela ${i + 1}/${totalInstallments})` : '';
      const currentDesc = `${description.trim()}${suffix}`;
      const currentDate = addMonths(selectedDate, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      transactionsToInsert.push({
        user_id: user.id,
        type,
        description: currentDesc,
        value: val,
        date: dateStr,
        ignore_fixed_costs: type === "income" ? fixedCostMode === "none" : false,
      });
    }

    const { data: insertedData, error } = await supabase.from("transactions").insert(transactionsToInsert).select();

    if (error) { setSaving(false); toast.error("Erro ao salvar"); return; }

    // Vincular custos à(s) transação(ões) criada(s)
    if (insertedData && insertedData.length > 0 && type === "income") {
      // Custos fixos selecionados manualmente
      if (fixedCostMode === "custom" && selectedFixedCostIds.length > 0) {
        await supabase.from("transaction_fixed_costs").insert(
          insertedData.flatMap((tx) =>
            selectedFixedCostIds.map((fcId) => ({ transaction_id: tx.id, fixed_cost_id: fcId }))
          )
        );
      }

      // Custos variáveis — modo "salvo"
      if (varCostMode === "saved" && selectedVariableCostIds.length > 0) {
        await supabase.from("transaction_variable_costs").insert(
          insertedData.flatMap((tx) =>
            selectedVariableCostIds.map((vcId) => ({ transaction_id: tx.id, variable_cost_id: vcId }))
          )
        );
      }

      // Custos variáveis — modo "manual"
      if (varCostMode === "manual") {
        const validManual = manualVarCosts.filter((c) => parseBRL(c.value) > 0);
        if (validManual.length > 0) {
          const { data: newCosts } = await supabase
            .from("fixed_costs")
            .insert(
              validManual.map((c) => ({
                user_id: user.id,
                name: c.name.trim() || "Custo pontual",
                value: parseBRL(c.value),
                value_type: c.isUSD ? "usd" : "fixed",
                type: "variable",
                is_active: false,
              }))
            )
            .select("id, name");

          if (newCosts) {
            await supabase.from("transaction_variable_costs").insert(
              insertedData.flatMap((tx) =>
                newCosts.map((nc) => ({ transaction_id: tx.id, variable_cost_id: nc.id }))
              )
            );

            // Toast para salvar custos nomeados como reutilizáveis
            const namedIds = newCosts
              .filter((_, i) => validManual[i]?.name.trim())
              .map((nc) => nc.id);

            if (namedIds.length > 0) {
              setTimeout(() => {
                toast(
                  <span className="flex items-center gap-2">
                    <BookmarkPlus size={15} className="shrink-0 text-green-700" />
                    Deseja salvar esses custos para usar em outras transações?
                  </span>,
                  {
                    duration: 20000,
                    style: {
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: "#166534",
                    },
                    action: {
                      label: "Salvar",
                      onClick: async () => {
                        await supabase
                          .from("fixed_costs")
                          .update({ is_active: true })
                          .in("id", namedIds);
                        toast.success("Custos salvos para uso futuro!");
                      },
                    },
                    cancel: {
                      label: "Agora não",
                      onClick: () => {},
                    },
                  });
              }, 400);
            }
          }
        }
      }
    }

    // Vincular produtos selecionados
    if (insertedData && insertedData.length > 0 && selectedProducts.length > 0) {
      await supabase.from("transaction_products").insert(
        insertedData.flatMap((tx) =>
          selectedProducts.map((pid) => ({ transaction_id: tx.id, product_id: pid }))
        )
      );
    }

    if (attachmentFile && insertedData && insertedData.length > 0) {
      try {
        const firstTx = insertedData[0];
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `${user.id}/${firstTx.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('transaction-attachments')
          .upload(filePath, attachmentFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('transaction-attachments')
            .getPublicUrl(filePath);

          await supabase
            .from('transactions')
            .update({ attachment_url: publicUrlData.publicUrl })
            .eq('id', firstTx.id);
        }
      } catch (err) {
        toast.error("Erro ao enviar o anexo, mas a operação foi salva.");
      }
    }

    setSaving(false);
    toast.success(totalInstallments > 1 ? "Operações recorrentes salvas!" : "Operação salva!");
    setModalOpen(false);
    fetchTransactions();
  };

  const hasActiveFilters = filterType !== "all" || filterText.trim() !== "";
  const clearFilters = () => { setFilterType("all"); setFilterText(""); };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterText && !tx.description.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  const now = new Date();
  const currentYearMonth = now.getFullYear() * 12 + now.getMonth();

  const currentAndPastTransactions = filteredTransactions.filter((tx) => {
    const [y, m] = tx.date.split('-');
    return (parseInt(y) * 12 + (parseInt(m) - 1)) <= currentYearMonth;
  });

  const futureTransactions = filteredTransactions.filter((tx) => {
    const [y, m] = tx.date.split('-');
    return (parseInt(y) * 12 + (parseInt(m) - 1)) > currentYearMonth;
  });

  const grouped: Record<string, Transaction[]> = {};
  currentAndPastTransactions.forEach((tx) => {
    const [y, m] = tx.date.split('-');
    const key = `${parseInt(y)}-${parseInt(m) - 1}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  });

  const groupedFuture: Record<string, Transaction[]> = {};
  futureTransactions.forEach((tx) => {
    const [y, m] = tx.date.split('-');
    const key = `${parseInt(y)}-${parseInt(m) - 1}`;
    if (!groupedFuture[key]) groupedFuture[key] = [];
    groupedFuture[key].push(tx);
  });

  const toggleMonth = (key: string) => {
    const next = new Set(expandedMonths);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedMonths(next);
  };

  const toggleFutureMonth = (key: string) => {
    const next = new Set(expandedFutureMonths);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedFutureMonths(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Wallet size={20} /> Financeiro
        </h1>
        <Button onClick={openModal} size="sm" className="gap-2 bg-brand-primary hover:bg-brand-hover text-white">
          <Plus size={16} /> Nova Operação
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "income", "expense"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${filterType === t
                ? t === "income" ? "bg-success text-white" : t === "expense" ? "bg-destructive text-white" : "bg-brand-primary text-white"
                : "text-muted-foreground hover:bg-accent"
                }`}
            >
              {t === "all" ? "Todas" : t === "income" ? "Entradas" : "Saídas"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Buscar por descrição..."
            className="h-8 pl-8 text-sm"
          />
          {filterText && (
            <button onClick={() => setFilterText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X size={12} /> Limpar
          </button>
        )}
        <Button variant="outline" size="sm" onClick={() => setFutureModalOpen(true)} className="gap-2 h-8 text-xs font-semibold ml-auto border-brand-primary/20 text-brand-primary hover:bg-brand-light">
          <Calendar size={14} /> Faturas Futuras ({futureTransactions.length})
        </Button>
      </div>

      {/* History */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
          <ClipboardList size={16} /> Histórico
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-muted rounded w-40" />
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-10 text-center">
            <Wallet size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-semibold text-muted-foreground">Nenhuma operação encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters ? "Tente remover os filtros" : "Clique em \"Nova Operação\" para começar"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([key, txs]) => {
              const [year, month] = key.split("-").map(Number);
              const isExpanded = expandedMonths.has(key);
              const monthIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.value), 0);
              const monthExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.value), 0);
              return (
                <div key={key} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleMonth(key)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {isExpanded ? <ChevronDown size={15} className="text-muted-foreground shrink-0" /> : <ChevronRight size={15} className="text-muted-foreground shrink-0" />}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 text-left min-w-0">
                        <span className="font-semibold text-sm truncate">{MONTHS[month]} {year}</span>
                        <span className="text-xs text-muted-foreground truncate whitespace-nowrap">
                          {txs.length} {txs.length === 1 ? "operação" : "operações"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center items-end gap-0.5 sm:gap-3 text-xs font-medium shrink-0">
                      <span className="text-success whitespace-nowrap">+{formatCurrency(monthIncome)}</span>
                      <span className="text-destructive whitespace-nowrap">-{formatCurrency(monthExpense)}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border">
                      {txs.map((tx) => (
                        <button
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-success/10" : "bg-destructive/10"}`}>
                              {tx.type === "income"
                                ? <ArrowDownCircle size={15} className="text-success" />
                                : <ArrowUpCircle size={15} className="text-destructive" />}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{tx.description}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                                {tx.products?.name && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-brand-light text-brand-hover px-2 py-0.5 rounded-full">
                                    <Package size={10} /> {tx.products.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`font-bold text-sm ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.value))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nova Operação Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setProductPopoverOpen(false); }}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[75dvh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-2 border-b shrink-0">
            <DialogTitle className="text-lg font-bold">Nova Operação</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all ${type === "income" ? "bg-success text-white border-success" : "bg-card text-muted-foreground border-border hover:border-success/50"
                  }`}
              >
                <ArrowDownCircle size={15} /> Entrada
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all ${type === "expense" ? "bg-destructive text-white border-destructive" : "bg-card text-muted-foreground border-border hover:border-destructive/50"
                  }`}
              >
                <ArrowUpCircle size={15} /> Saída
              </button>
            </div>

            {type === "income" && availableProducts.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                  Produto vinculado <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </Label>
                {isTouchDevice ? (
                  /* ── MOBILE / TABLET: Bottom Sheet com multi-seleção ── */
                  <Drawer.Root
                    open={productDrawerOpen}
                    onOpenChange={(open) => {
                      setProductDrawerOpen(open);
                      if (!open) setProductSearch("");
                    }}
                  >
                    {/* Badges dos produtos selecionados */}
                    {selectedProducts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedProducts.map((pid) => {
                          const prod = availableProducts.find((p) => p.id === pid);
                          return prod ? (
                            <span key={pid} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                              {prod.name}
                              <button type="button" onClick={() => toggleProduct(pid)} className="ml-0.5">
                                <X size={11} />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <Drawer.Trigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-9 font-normal bg-background text-sm"
                      >
                        {selectedProducts.length === 0 ? "Nenhum produto selecionado" : `+ Adicionar produto`}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </Drawer.Trigger>
                    <Drawer.Portal>
                      <Drawer.Overlay className="fixed inset-0 bg-black/45 z-50" />
                      <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl outline-none">
                        <div className="flex justify-center pt-3 pb-1">
                          <div className="w-9 h-1 rounded-full bg-gray-300" />
                        </div>
                        <div className="flex justify-between items-center px-4 py-3">
                          <span className="text-base font-medium">Selecionar produtos</span>
                          <Drawer.Close asChild>
                            <button className="text-gray-400 p-1">
                              <X size={20} />
                            </button>
                          </Drawer.Close>
                        </div>
                        <div className="px-4 pb-3">
                          <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            autoFocus={false}
                            tabIndex={-1}
                            className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                          />
                        </div>
                        <div
                          className="overflow-y-scroll"
                          style={{
                            maxHeight: "45vh",
                            WebkitOverflowScrolling: "touch",
                            touchAction: "pan-y",
                            overscrollBehavior: "contain",
                          }}
                        >
                          {availableProducts
                            .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                            .map((p) => {
                              const isSelected = selectedProducts.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100",
                                    isSelected && "bg-blue-50"
                                  )}
                                  onClick={() => toggleProduct(p.id)}
                                >
                                  <span>{p.name}</span>
                                  <div className={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                                    isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
                                  )}>
                                    {isSelected && <Check size={12} className="text-white" />}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                        {/* Botão Confirmar fixo no rodapé */}
                        <div className="p-4 border-t border-gray-100">
                          <Drawer.Close asChild>
                            <Button className="w-full">
                              Confirmar{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ""}
                            </Button>
                          </Drawer.Close>
                        </div>
                      </Drawer.Content>
                    </Drawer.Portal>
                  </Drawer.Root>
                ) : (
                  /* ── DESKTOP: Badges + Popover multi-seleção ── */
                  <>
                    {selectedProducts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedProducts.map((pid) => {
                          const prod = availableProducts.find((p) => p.id === pid);
                          return prod ? (
                            <span key={pid} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                              {prod.name}
                              <button type="button" onClick={() => toggleProduct(pid)} className="ml-0.5">
                                <X size={11} />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productPopoverOpen}
                          className="w-full justify-between h-9 font-normal bg-background text-sm"
                        >
                          {selectedProducts.length === 0 ? "Nenhum produto selecionado" : "+ Adicionar produto"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                        <Command>
                          <CommandInput placeholder="Buscar produto..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {availableProducts.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name}
                                  onSelect={() => toggleProduct(p.id)}
                                >
                                  {p.name}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      selectedProducts.includes(p.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                        <div className="p-2 border-t">
                          <Button size="sm" className="w-full" onClick={() => setProductPopoverOpen(false)}>
                            Confirmar{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ""}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
                {selectedProducts.length > 0 && selectedProducts.length === 1 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    Preço do produto preenchido automaticamente (editável)
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Descrição</Label>
                <ExpandableInput
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === "income" ? "Ex: Venda do produto X" : "Ex: Conta de luz, Fornecedor..."}
                  modalTitle="Descrição da Operação"
                  rows={2}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between h-7 mb-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Valor</Label>
                    <div className="flex h-7 rounded-lg border-2 border-border overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => !isUSD || toggleCurrency()}
                        disabled={rateLoading}
                        className={`px-2.5 text-xs font-bold transition-all ${!isUSD ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        R$
                      </button>
                      <div className="w-px bg-border" />
                      <button
                        type="button"
                        onClick={() => isUSD || toggleCurrency()}
                        disabled={rateLoading}
                        className={`px-2 text-xs font-bold transition-all flex items-center gap-1 ${isUSD ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        {rateLoading ? <RefreshCw size={10} className="animate-spin" /> : "US$"}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
                      {isUSD ? "US$" : "R$"}
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={value}
                      onChange={(e) => setValue(maskBRL(e.target.value))}
                      placeholder="0,00"
                      className="h-11 pl-10"
                    />
                  </div>
                  {isUSD && (
                    <div className="flex items-center justify-between mt-1 px-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>US$ 1 = R$ {usdRate.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={loadRate}
                          disabled={rateLoading}
                          className="hover:text-brand-primary transition-colors h-3 w-3 flex items-center justify-center"
                        >
                          <RefreshCw size={9} className={rateLoading ? "animate-spin" : ""} />
                        </button>
                      </div>
                      {parseBRL(value) > 0 && (
                        <span className="text-[11px] font-semibold text-brand-hover">
                          ≈ R$ {maskBRL(String(Math.round(parseBRL(value) * usdRate * 100)))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center h-7 mb-1.5">
                    <Label className="text-muted-foreground text-sm font-medium">Data</Label>
                  </div>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-11 flex items-center justify-between text-sm bg-background border border-input rounded-md px-3 outline-none transition-all hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                      >
                        <span className="text-foreground">
                          {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <ClickUpDatePicker
                        hideSidebar
                        hideStartDate
                        dueDate={selectedDate}
                        onDueDateChange={(date) => {
                          if (date) { setSelectedDate(date); setDatePickerOpen(false); }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Custos desta entrada */}
              {type === "income" && (availableFixedCosts.length > 0 || availableVariableCosts.length > 0) && (
                <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/10">
                  <p className="text-sm font-semibold">Custos desta entrada</p>

                  {/* Custos Variáveis */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">Custos Variáveis</Label>
                      <div className="flex rounded-md border border-border overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setVarCostMode("saved")}
                          className={cn("px-2.5 py-1 font-medium transition-colors", varCostMode === "saved" ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent")}
                        >
                          Usar salvo
                        </button>
                        <div className="w-px bg-border" />
                        <button
                          type="button"
                          onClick={() => setVarCostMode("manual")}
                          className={cn("px-2.5 py-1 font-medium transition-colors", varCostMode === "manual" ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent")}
                        >
                          Manual
                        </button>
                      </div>
                    </div>

                    {varCostMode === "saved" ? (
                      availableVariableCosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1 py-2">Nenhum custo variável cadastrado. Use o modo Manual ou cadastre em Custos.</p>
                      ) : isTouchDevice ? (
                        /* ── MOBILE / TABLET: Bottom Sheet ── */
                        <Drawer.Root
                          open={varCostDrawerOpen}
                          onOpenChange={(open) => {
                            setVarCostDrawerOpen(open);
                            if (!open) setVarCostSearch("");
                          }}
                        >
                          {/* Badges dos custos selecionados */}
                          {selectedVariableCostIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {selectedVariableCostIds.map((id) => {
                                const vc = availableVariableCosts.find((c) => c.id === id);
                                if (!vc) return null;
                                const label = vc.value_type === "percentage" ? `${Number(vc.value)}%` : vc.value_type === "usd" ? `US$${Number(vc.value)}` : formatCurrency(Number(vc.value));
                                return (
                                  <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                                    {vc.name} {label}
                                    <button type="button" onClick={() => setSelectedVariableCostIds((p) => p.filter((x) => x !== id))} className="ml-0.5">
                                      <X size={11} />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <Drawer.Trigger asChild>
                            <Button variant="outline" className="w-full justify-between h-9 font-normal bg-background text-sm">
                              {selectedVariableCostIds.length === 0 ? "Nenhum custo selecionado" : "+ Adicionar custo"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </Drawer.Trigger>
                          <Drawer.Portal>
                            <Drawer.Overlay className="fixed inset-0 bg-black/45 z-50" />
                            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl outline-none">
                              <div className="flex justify-center pt-3 pb-1">
                                <div className="w-9 h-1 rounded-full bg-gray-300" />
                              </div>
                              <div className="flex justify-between items-center px-4 py-3">
                                <span className="text-base font-medium">Selecionar custos variáveis</span>
                                <Drawer.Close asChild>
                                  <button className="text-gray-400 p-1"><X size={20} /></button>
                                </Drawer.Close>
                              </div>
                              <div className="px-4 pb-3">
                                <input
                                  type="text"
                                  placeholder="Buscar custo..."
                                  value={varCostSearch}
                                  onChange={(e) => setVarCostSearch(e.target.value)}
                                  autoFocus={false}
                                  tabIndex={-1}
                                  className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                                />
                              </div>
                              <div
                                className="overflow-y-scroll"
                                style={{ maxHeight: "45vh", WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                              >
                                {availableVariableCosts
                                  .filter((vc) => vc.name.toLowerCase().includes(varCostSearch.toLowerCase()))
                                  .map((vc) => {
                                    const isSelected = selectedVariableCostIds.includes(vc.id);
                                    const valueLabel = vc.value_type === "percentage" ? `${Number(vc.value)}%` : vc.value_type === "usd" ? `US$ ${Number(vc.value).toFixed(2)}` : formatCurrency(Number(vc.value));
                                    return (
                                      <button
                                        key={vc.id}
                                        type="button"
                                        className={cn("w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100", isSelected && "bg-blue-50")}
                                        onClick={() => setSelectedVariableCostIds((p) => p.includes(vc.id) ? p.filter((x) => x !== vc.id) : [...p, vc.id])}
                                      >
                                        <span>{vc.name}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-400">{valueLabel}</span>
                                          <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0", isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300")}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                              </div>
                              <div className="p-4 border-t border-gray-100">
                                <Drawer.Close asChild>
                                  <Button className="w-full">
                                    Confirmar{selectedVariableCostIds.length > 0 ? ` (${selectedVariableCostIds.length})` : ""}
                                  </Button>
                                </Drawer.Close>
                              </div>
                            </Drawer.Content>
                          </Drawer.Portal>
                        </Drawer.Root>
                      ) : (
                        /* ── DESKTOP: Badges + Popover multi-select ── */
                        <>
                          {selectedVariableCostIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {selectedVariableCostIds.map((id) => {
                                const vc = availableVariableCosts.find((c) => c.id === id);
                                if (!vc) return null;
                                const label = vc.value_type === "percentage" ? `${Number(vc.value)}%` : vc.value_type === "usd" ? `US$${Number(vc.value)}` : formatCurrency(Number(vc.value));
                                return (
                                  <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                                    {vc.name} {label}
                                    <button type="button" onClick={() => setSelectedVariableCostIds((p) => p.filter((x) => x !== id))} className="ml-0.5">
                                      <X size={11} />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <Popover open={varCostPopoverOpen} onOpenChange={setVarCostPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between h-9 font-normal bg-background text-sm">
                                {selectedVariableCostIds.length === 0 ? "Nenhum custo selecionado" : "+ Adicionar custo"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                              <Command>
                                <CommandInput placeholder="Buscar custo..." className="h-9" />
                                <CommandList>
                                  <CommandEmpty>Nenhum custo encontrado.</CommandEmpty>
                                  <CommandGroup>
                                    {availableVariableCosts.map((vc) => {
                                      const valueLabel = vc.value_type === "percentage" ? `${Number(vc.value)}%` : vc.value_type === "usd" ? `US$${Number(vc.value)}` : formatCurrency(Number(vc.value));
                                      return (
                                        <CommandItem
                                          key={vc.id}
                                          value={vc.name}
                                          onSelect={() => setSelectedVariableCostIds((p) => p.includes(vc.id) ? p.filter((x) => x !== vc.id) : [...p, vc.id])}
                                        >
                                          <span className="flex-1">{vc.name}</span>
                                          <span className="text-xs text-muted-foreground mr-2">{valueLabel}</span>
                                          <Check className={cn("h-4 w-4", selectedVariableCostIds.includes(vc.id) ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                              <div className="p-2 border-t">
                                <Button size="sm" className="w-full" onClick={() => setVarCostPopoverOpen(false)}>
                                  Confirmar{selectedVariableCostIds.length > 0 ? ` (${selectedVariableCostIds.length})` : ""}
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </>
                      )
                    ) : (
                      <div className="space-y-2">
                        {manualVarCosts.map((row, idx) => (
                          <div key={row.id} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Nome (opcional)"
                              value={row.name}
                              onChange={(e) => setManualVarCosts((prev) => prev.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r))}
                              className="flex-1 h-9 min-w-0 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-brand-primary"
                            />
                            <div className="flex h-9 rounded-md border border-border overflow-hidden shrink-0">
                              <button
                                type="button"
                                onClick={() => setManualVarCosts((prev) => prev.map((r) => r.id === row.id ? { ...r, isUSD: false } : r))}
                                className={cn("px-2 text-xs font-bold transition-colors", !row.isUSD ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent")}
                              >R$</button>
                              <div className="w-px bg-border" />
                              <button
                                type="button"
                                onClick={() => setManualVarCosts((prev) => prev.map((r) => r.id === row.id ? { ...r, isUSD: true } : r))}
                                className={cn("px-2 text-xs font-bold transition-colors", row.isUSD ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent")}
                              >US$</button>
                            </div>
                            <div className="relative shrink-0 w-24">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0,00"
                                value={row.value}
                                onChange={(e) => setManualVarCosts((prev) => prev.map((r) => r.id === row.id ? { ...r, value: maskBRL(e.target.value) } : r))}
                                className="h-9 text-sm"
                              />
                            </div>
                            {manualVarCosts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setManualVarCosts((prev) => prev.filter((r) => r.id !== row.id))}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setManualVarCosts((prev) => [...prev, { id: crypto.randomUUID(), name: "", value: "", isUSD: false }])}
                          className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-hover transition-colors mt-1"
                        >
                          <Plus size={12} /> Adicionar outro custo
                        </button>
                      </div>
                    )}

                    {/* Total de custos variáveis */}
                    {(() => {
                      const grossVal = parseBRL(value) * (isUSD ? usdRate : 1);
                      let varTotal = 0;
                      if (varCostMode === "saved") {
                        varTotal = availableVariableCosts
                          .filter((c) => selectedVariableCostIds.includes(c.id))
                          .reduce((s, c) => {
                            if (c.value_type === "percentage") return s + (grossVal * Number(c.value)) / 100;
                            if (c.value_type === "usd") return s + Number(c.value) * usdRate;
                            return s + Number(c.value);
                          }, 0);
                      } else {
                        varTotal = manualVarCosts.reduce((s, c) => {
                          const v = parseBRL(c.value);
                          return s + (c.isUSD ? v * usdRate : v);
                        }, 0);
                      }
                      if (varTotal <= 0) return null;
                      return (
                        <div className="flex justify-between text-xs pt-2 border-t border-border mt-1">
                          <span className="text-muted-foreground">Total de custos variáveis</span>
                          <span className="font-semibold text-destructive">-{formatCurrency(varTotal)}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Custos Fixos */}
                  {availableFixedCosts.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Custos Fixos</Label>
                      <div className="flex flex-col gap-1 mb-2">
                        {(["all", "none", "custom"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => { setFixedCostMode(mode); if (mode !== "custom") setSelectedFixedCostIds([]); }}
                            className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left", fixedCostMode === mode ? "bg-brand-primary/10 text-brand-primary font-medium" : "hover:bg-accent text-muted-foreground")}
                          >
                            <div className={cn("w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center", fixedCostMode === mode ? "border-brand-primary" : "border-muted-foreground/40")}>
                              {fixedCostMode === mode && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                            </div>
                            {mode === "all" ? "Aplicar todos os custos fixos" : mode === "none" ? "Ignorar custos fixos" : "Selecionar manualmente"}
                          </button>
                        ))}
                      </div>
                      {fixedCostMode === "custom" && (
                        <div className="space-y-1 pl-1">
                          {availableFixedCosts.map((fc) => {
                            const checked = selectedFixedCostIds.includes(fc.id);
                            return (
                              <button
                                key={fc.id}
                                type="button"
                                onClick={() => setSelectedFixedCostIds((prev) =>
                                  prev.includes(fc.id) ? prev.filter((x) => x !== fc.id) : [...prev, fc.id]
                                )}
                                className="w-full flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors", checked ? "bg-brand-primary border-brand-primary" : "border-muted-foreground/40 bg-background")}>
                                    {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                                  </div>
                                  <span className="text-sm">{fc.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {fc.value_type === "percentage"
                                    ? `${Number(fc.value)}%`
                                    : fc.value_type === "usd"
                                    ? `US$ ${Number(fc.value).toFixed(2)} ≈ ${formatCurrency(Number(fc.value) * usdRate)}`
                                    : formatCurrency(Number(fc.value))}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumo de valor líquido */}
                  {(() => {
                    const grossVal = parseBRL(value) * (isUSD ? usdRate : 1);
                    if (grossVal <= 0) return null;

                    const calcCostVal = (c: { value: number; value_type: string }) => {
                      if (c.value_type === "percentage") return (grossVal * Number(c.value)) / 100;
                      if (c.value_type === "usd") return Number(c.value) * usdRate;
                      return Number(c.value);
                    };

                    const varTotal = varCostMode === "saved"
                      ? availableVariableCosts.filter((c) => selectedVariableCostIds.includes(c.id)).reduce((s, c) => s + calcCostVal(c), 0)
                      : manualVarCosts.reduce((s, c) => { const v = parseBRL(c.value); return s + (c.isUSD ? v * usdRate : v); }, 0);

                    const fixedCostsForCalc =
                      fixedCostMode === "none" ? [] :
                      fixedCostMode === "custom" ? availableFixedCosts.filter((c) => selectedFixedCostIds.includes(c.id)) :
                      availableFixedCosts;
                    const fixedTotal = fixedCostsForCalc.reduce((s, c) => s + calcCostVal(c), 0);

                    const totalDeducted = varTotal + fixedTotal;
                    if (totalDeducted <= 0) return null;

                    const netValue = grossVal - totalDeducted;
                    return (
                      <div className="border-t border-border pt-2 mt-1 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Receita bruta</span>
                          <span>{formatCurrency(grossVal)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-destructive">
                          <span>(-) Custos totais</span>
                          <span>-{formatCurrency(totalDeducted)}</span>
                        </div>
                        <div className={`flex justify-between text-sm font-bold pt-1 border-t border-border ${netValue >= 0 ? "text-success" : "text-destructive"}`}>
                          <span>Valor líquido estimado</span>
                          <span>{formatCurrency(netValue)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">É uma operação recorrente?</Label>
                    <p className="text-xs text-muted-foreground">Repetir automaticamente nos próximos meses</p>
                  </div>
                  <Switch checked={isRecurrent} onCheckedChange={setIsRecurrent} />
                </div>

                {isRecurrent && (
                  <div className="pt-2 border-t border-border">
                    <Label className="text-sm mb-1.5 block">Repetir por quantos meses?</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="2"
                        max="120"
                        value={recurrentMonths}
                        onChange={(e) => setRecurrentMonths(e.target.value)}
                        className="w-24 h-10"
                      />
                      <span className="text-sm text-muted-foreground">meses</span>
                    </div>
                    <p className="text-xs text-amber-500 mt-2">Isto criará faturas futuras preenchidas no seu painel.</p>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-3">
                <Label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  Anexar Comprovante (Opcional)
                </Label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error("O arquivo deve ter no máximo 2MB.");
                      e.target.value = "";
                      return;
                    }
                    setAttachmentFile(file);
                  }}
                  className="text-xs h-9 cursor-pointer file:cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">Max 2MB. Formatos: JPG, PNG, PDF.</p>
              </div>
              <Button
                type="submit"
                size="full"
                disabled={saving}
                className={type === "income" ? "bg-success hover:bg-success/90 text-white" : "bg-destructive hover:bg-destructive/90 text-white"}
              >
                {saving ? "Salvando..." : `Salvar ${type === "income" ? "Entrada" : "Saída"}`}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDetailModal
        transaction={selectedTx}
        availableProducts={availableProducts}
        usdRate={usdRate}
        onClose={() => setSelectedTx(null)}
        onChanged={fetchTransactions}
      />

      <Dialog open={futureModalOpen} onOpenChange={setFutureModalOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-6 rounded-xl overflow-hidden bg-background">
          <DialogHeader className="border-b border-border pb-4 mb-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Calendar size={22} className="text-brand-primary" /> Faturas Futuras
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Visualize e gerencie suas faturas recorrentes para os próximos meses.</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {Object.keys(groupedFuture).length === 0 ? (
              <div className="text-center text-muted-foreground py-10 mt-10">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                Nenhuma fatura futura encontrada com os filtros atuais.
              </div>
            ) : (
              Object.entries(groupedFuture)
                .sort((a, b) => {
                  const [ay, am] = a[0].split("-").map(Number);
                  const [by, bm] = b[0].split("-").map(Number);
                  return ay - by || am - bm; // sort ascending for future
                })
                .map(([key, txs]) => {
                  const [year, month] = key.split("-").map(Number);
                  const isExpanded = expandedFutureMonths.has(key);
                  const monthIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.value), 0);
                  const monthExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.value), 0);
                  return (
                    <div key={key} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => toggleFutureMonth(key)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {isExpanded ? <ChevronDown size={15} className="text-muted-foreground shrink-0" /> : <ChevronRight size={15} className="text-muted-foreground shrink-0" />}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 text-left min-w-0">
                            <span className="font-semibold text-sm truncate">{MONTHS[month]} {year}</span>
                            <span className="text-xs text-muted-foreground truncate whitespace-nowrap">
                              {txs.length} {txs.length === 1 ? "operação" : "operações"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center items-end gap-0.5 sm:gap-3 text-xs font-medium shrink-0">
                          <span className="text-success whitespace-nowrap">+{formatCurrency(monthIncome)}</span>
                          <span className="text-destructive whitespace-nowrap">-{formatCurrency(monthExpense)}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border">
                          {txs.map((tx) => (
                            <button
                              key={tx.id}
                              onClick={() => setSelectedTx(tx)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-success/10" : "bg-destructive/10"}`}>
                                  {tx.type === "income"
                                    ? <ArrowDownCircle size={15} className="text-success" />
                                    : <ArrowUpCircle size={15} className="text-destructive" />}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-medium">{tx.description}</p>
                                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                    <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                                  </div>
                                </div>
                              </div>
                              <p className={`text-sm font-bold ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                                {tx.type === "income" ? "+" : "-"}R$ {formatCurrency(Number(tx.value))}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { ChevronDown, ChevronRight, ArrowDownCircle, ArrowUpCircle, Wallet, ClipboardList, Plus, Calendar, Search, X, Package, Check, ChevronsUpDown, RefreshCw, AlignLeft, DollarSign, Paperclip, Repeat2, Boxes } from "lucide-react";
import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useIsMobile } from "@/hooks/use-mobile";
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

export interface TransactionCostItem {
  id: string;
  cost_name: string;
  cost_value: number;
  value_type: "fixed" | "percentage" | "usd";
  global_cost_id?: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  name: string;
  description?: string | null;
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
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedFutureMonths, setExpandedFutureMonths] = useState<Set<string>>(new Set());
  const [futureModalOpen, setFutureModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string; selling_price: number; stock_quantity: number | null; entry_type: string | null }[]>([]);
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({});
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterText, setFilterText] = useState("");
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrentMonths, setRecurrentMonths] = useState("6");
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUSD, setIsUSD] = useState(false);
  const [usdRate, setUsdRate] = useState(5.50);
  const [rateLoading, setRateLoading] = useState(false);

  // Custos globais disponíveis para seleção
  const [allGlobalCosts, setAllGlobalCosts] = useState<{ id: string; name: string; value: number; value_type: string }[]>([]);
  // Custos adicionados à transação atual
  const [transactionCosts, setTransactionCosts] = useState<TransactionCostItem[]>([]);
  const [costDrawerOpen, setCostDrawerOpen] = useState(false);
  const [costSearch, setCostSearch] = useState("");
  const [showCustomCostForm, setShowCustomCostForm] = useState(false);
  const [customCostName, setCustomCostName] = useState("");
  const [customCostValue, setCustomCostValue] = useState("");
  const [customCostValueType, setCustomCostValueType] = useState<"fixed" | "percentage" | "usd">("fixed");
  // Seções colapsáveis
  const [descSectionOpen, setDescSectionOpen] = useState(false);
  const [costsSectionOpen, setCostsSectionOpen] = useState(false);
  const [recurrenceSectionOpen, setRecurrenceSectionOpen] = useState(false);
  const [attachSectionOpen, setAttachSectionOpen] = useState(false);

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

      const [fy, fm] = data[0].date.split("-").map(Number);
      const firstMonth = `${fy}-${fm - 1}`;
      setExpandedMonths(new Set([firstMonth]));

      const futureData = data.filter(tx => {
        const [y, m] = tx.date.split('-');
        return (parseInt(y) * 12 + (parseInt(m) - 1)) > currentYearMonth;
      });
      if (futureData.length > 0) {
        const [fuy, fum] = futureData[0].date.split("-").map(Number);
        const firstFuture = `${fuy}-${fum - 1}`;
        setExpandedFutureMonths(new Set([firstFuture]));
      }
    }
  }, [user]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("id, name, selling_price, stock_quantity, entry_type").eq("user_id", user.id)
      .then(({ data }) => setAvailableProducts(data || []));
    supabase.from("fixed_costs").select("id, name, value, value_type").eq("user_id", user.id).eq("is_active", true)
      .then(({ data }) => setAllGlobalCosts(data || []));
  }, [user]);

  const openModal = () => {
    setType("income");
    setName("");
    setDescription("");
    setValue("");
    setSelectedDate(new Date());
    setSelectedProducts([]);
    setSelectedProductQuantities({});
    setIsRecurrent(false);
    setRecurrentMonths("6");
    setAttachmentFile(null);
    setIsUSD(false);
    setTransactionCosts([]);
    setShowCustomCostForm(false);
    setCustomCostName("");
    setCustomCostValue("");
    setCustomCostValueType("fixed");
    setDescSectionOpen(false);
    setCostsSectionOpen(false);
    setRecurrenceSectionOpen(false);
    setAttachSectionOpen(false);
    setModalOpen(true);
  };

  const addGlobalCost = (gc: { id: string; name: string; value: number; value_type: string }) => {
    setTransactionCosts((prev) => [...prev, {
      id: crypto.randomUUID(),
      cost_name: gc.name,
      cost_value: Number(gc.value),
      value_type: gc.value_type as "fixed" | "percentage" | "usd",
      global_cost_id: gc.id,
    }]);
  };

  const addCustomCost = () => {
    const val = customCostValueType === "percentage"
      ? parseFloat(customCostValue.replace(",", ".")) || 0
      : parseBRL(customCostValue);
    if (val <= 0) { toast.error("Informe um valor válido"); return; }
    setTransactionCosts((prev) => [...prev, {
      id: crypto.randomUUID(),
      cost_name: customCostName.trim() || "Custo personalizado",
      cost_value: val,
      value_type: customCostValueType,
    }]);
    setCustomCostName("");
    setCustomCostValue("");
    setCustomCostValueType("fixed");
    setShowCustomCostForm(false);
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
      setSelectedProductQuantities({});
      return;
    }
    setSelectedProducts((prev) => {
      const isSelected = prev.includes(productId);
      if (isSelected) {
        setSelectedProductQuantities((q) => { const next = { ...q }; delete next[productId]; return next; });
        return prev.filter((id) => id !== productId);
      }
      setSelectedProductQuantities((q) => ({ ...q, [productId]: 1 }));
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
    if (!name.trim()) { toast.error("Informe o nome da operação"); return; }
    if (!value || !user) { toast.error("Informe o valor da operação"); return; }
    const val = parseBRL(value) * (isUSD ? usdRate : 1);
    if (val <= 0) { toast.error("Valor deve ser positivo"); return; }

    setSaving(true);
    const totalInstallments = isRecurrent ? parseInt(recurrentMonths) : 1;
    const transactionsToInsert = [];

    for (let i = 0; i < totalInstallments; i++) {
      const suffix = totalInstallments > 1 ? ` (Parcela ${i + 1}/${totalInstallments})` : '';
      const currentName = `${name.trim()}${suffix}`;
      const currentDate = addMonths(selectedDate, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      transactionsToInsert.push({
        user_id: user.id,
        type,
        name: currentName,
        description: description.trim() || null,
        value: val,
        date: dateStr,
      });
    }

    const { data: insertedData, error } = await supabase.from("transactions").insert(transactionsToInsert).select();

    if (error) { setSaving(false); toast.error("Erro ao salvar"); return; }

    // Vincular custos à(s) transação(ões)
    if (insertedData && insertedData.length > 0 && transactionCosts.length > 0) {
      await supabase.from("transaction_costs").insert(
        insertedData.flatMap((tx) =>
          transactionCosts.map((cost) => ({
            transaction_id: tx.id,
            user_id: user.id,
            cost_name: cost.cost_name,
            cost_value: cost.cost_value,
            value_type: cost.value_type,
            global_cost_id: cost.global_cost_id || null,
          }))
        )
      );
    }

    // Vincular produtos selecionados
    if (insertedData && insertedData.length > 0 && selectedProducts.length > 0) {
      await supabase.from("transaction_products").insert(
        insertedData.flatMap((tx) =>
          selectedProducts.map((pid) => ({ transaction_id: tx.id, product_id: pid }))
        )
      );

      // Descontar estoque (só para tipo receita e produtos com stock_quantity)
      if (type === "income") {
        const stockUpdates = selectedProducts
          .map((pid) => ({ prod: availableProducts.find((p) => p.id === pid), qty: selectedProductQuantities[pid] ?? 1 }))
          .filter(({ prod }) => prod && prod.stock_quantity != null && prod.entry_type !== "service");

        if (stockUpdates.length > 0) {
          const hasInsufficient = stockUpdates.some(({ prod, qty }) => prod!.stock_quantity! - qty < 0);
          if (hasInsufficient) toast.warning("Atenção: um ou mais produtos ficaram com estoque negativo.");

          await Promise.all(stockUpdates.map(({ prod, qty }) =>
            supabase.from("products")
              .update({ stock_quantity: prod!.stock_quantity! - qty })
              .eq("id", prod!.id)
          ));
        }
      }
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
    if (filterText && !tx.name.toLowerCase().includes(filterText.toLowerCase())) return false;
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
              {t === "all" ? "Todas" : t === "income" ? "Receitas" : "Despesas"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Buscar por nome..."
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
                              <p className="text-sm font-medium">{tx.name}</p>
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[75dvh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-2 border-b shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${type === "income" ? "bg-success/10" : "bg-destructive/10"}`}>
                {type === "income"
                  ? <ArrowDownCircle size={18} className="text-success" />
                  : <ArrowUpCircle size={18} className="text-destructive" />}
              </div>
              Nova Operação
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 1. Tipo: Receita / Despesa */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all ${type === "income" ? "bg-success text-white border-success" : "bg-card text-muted-foreground border-border hover:border-success/50"}`}
              >
                <ArrowDownCircle size={15} /> Receita
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all ${type === "expense" ? "bg-destructive text-white border-destructive" : "bg-card text-muted-foreground border-border hover:border-destructive/50"}`}
              >
                <ArrowUpCircle size={15} /> Despesa
              </button>
            </div>

            {/* 2. Nome */}
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                placeholder={type === "income" ? "Ex: Venda do produto X" : "Ex: Conta de luz"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                required
              />
            </div>

            {/* 3. Valor + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between h-7 mb-1.5">
                  <Label className="text-muted-foreground text-sm font-medium">Valor <span className="text-destructive">*</span></Label>
                  <div className="flex h-7 rounded-lg border-2 border-border overflow-hidden shrink-0">
                    <button type="button" onClick={() => !isUSD || toggleCurrency()} disabled={rateLoading}
                      className={`px-2.5 text-xs font-bold transition-all ${!isUSD ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent"}`}>
                      R$
                    </button>
                    <div className="w-px bg-border" />
                    <button type="button" onClick={() => isUSD || toggleCurrency()} disabled={rateLoading}
                      className={`px-2 text-xs font-bold transition-all flex items-center gap-1 ${isUSD ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent"}`}>
                      {rateLoading ? <RefreshCw size={10} className="animate-spin" /> : "US$"}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
                    {isUSD ? "US$" : "R$"}
                  </span>
                  <Input type="text" inputMode="numeric" value={value}
                    onChange={(e) => setValue(maskBRL(e.target.value))}
                    placeholder="0,00" className="h-11 pl-10" />
                </div>
                {isUSD && (
                  <div className="flex items-center justify-between mt-1 px-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>US$ 1 = R$ {usdRate.toFixed(2)}</span>
                      <button type="button" onClick={loadRate} disabled={rateLoading}
                        className="hover:text-brand-primary transition-colors h-3 w-3 flex items-center justify-center">
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
                  <Label className="text-muted-foreground text-sm font-medium">Data <span className="text-destructive">*</span></Label>
                </div>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button type="button"
                      className="w-full h-11 flex items-center justify-between text-sm bg-background border border-input rounded-md px-3 outline-none transition-all hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20">
                      <span className="text-foreground">{format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ClickUpDatePicker hideSidebar hideStartDate dueDate={selectedDate}
                      onDueDateChange={(date) => { if (date) { setSelectedDate(date); setDatePickerOpen(false); } }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 3. Produto vinculado (opcional) */}
            {availableProducts.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                  Produto vinculado
                </Label>
                <>
                  {isMobile ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-9 font-normal bg-background text-sm"
                        onClick={() => setProductDrawerOpen(true)}
                      >
                        {selectedProducts.length === 0 ? "Nenhum produto selecionado" : "+ Adicionar produto"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      <BottomSheet
                        open={productDrawerOpen}
                        onOpenChange={(open) => { setProductDrawerOpen(open); if (!open) setProductSearch(""); }}
                        title="Selecionar produtos"
                        searchValue={productSearch}
                        onSearchChange={setProductSearch}
                        searchPlaceholder="Buscar produto..."
                        footer={
                          <BottomSheetClose>
                            <Button className="w-full">
                              Confirmar{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ""}
                            </Button>
                          </BottomSheetClose>
                        }
                      >
                        {availableProducts
                          .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          .map((p) => {
                            const isSelected = selectedProducts.includes(p.id);
                            const hasStock = p.stock_quantity != null && p.entry_type !== "service";
                            const stockQty = p.stock_quantity ?? 0;
                            const stockColor = stockQty <= 0 ? "bg-red-100 text-red-700" : stockQty <= 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                            return (
                              <button
                                key={p.id}
                                type="button"
                                className={cn("w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100", isSelected && "bg-success/5")}
                                onClick={() => toggleProduct(p.id)}
                              >
                                <div className="flex flex-col items-start gap-0.5">
                                  <span>{p.name}</span>
                                  {hasStock && (
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${stockColor}`}>
                                      <Boxes size={9} /> {stockQty} em estoque
                                    </span>
                                  )}
                                </div>
                                <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0", isSelected ? "bg-success border-success" : "border-gray-300")}>
                                  {isSelected && <Check size={12} className="text-white" />}
                                </div>
                              </button>
                            );
                          })}
                      </BottomSheet>
                    </>
                  ) : (
                    <Popover open={productDrawerOpen} onOpenChange={(open) => { setProductDrawerOpen(open); if (!open) setProductSearch(""); }}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between h-9 font-normal bg-background text-sm">
                          {selectedProducts.length === 0 ? "Nenhum produto selecionado" : "+ Adicionar produto"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent style={{ width: "var(--radix-popover-trigger-width)" }} className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar produto..." value={productSearch} onValueChange={setProductSearch} />
                          <CommandList>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {availableProducts.map((p) => {
                                const isSelected = selectedProducts.includes(p.id);
                                const hasStock = p.stock_quantity != null && p.entry_type !== "service";
                                const stockQty = p.stock_quantity ?? 0;
                                const stockColor = stockQty <= 0 ? "bg-red-100 text-red-700" : stockQty <= 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                                return (
                                  <CommandItem
                                    key={p.id}
                                    value={p.name}
                                    onSelect={() => toggleProduct(p.id)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0", isSelected ? "bg-success border-success" : "border-gray-300")}>
                                      {isSelected && <Check size={12} className="text-white" />}
                                    </div>
                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                      <span>{p.name}</span>
                                      {hasStock && (
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit ${stockColor}`}>
                                          <Boxes size={9} /> {stockQty} em estoque
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  {selectedProducts.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {selectedProducts.map((pid) => {
                        const prod = availableProducts.find((p) => p.id === pid);
                        if (!prod) return null;
                        const qty = selectedProductQuantities[pid] ?? 1;
                        const hasStock = prod.stock_quantity != null && prod.entry_type !== "service";
                        const stockAfter = hasStock ? prod.stock_quantity! - qty : null;
                        return (
                          <div key={pid} className="flex items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-primary truncate block">{prod.name}</span>
                              {hasStock && (
                                <span className={`text-[10px] ${stockAfter! < 0 ? "text-red-500" : stockAfter! <= 5 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                  {stockAfter! < 0 ? `⚠ Estoque insuficiente (${prod.stock_quantity} em estoque)` : `Estoque após: ${stockAfter}`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button"
                                onClick={() => setSelectedProductQuantities((q) => ({ ...q, [pid]: Math.max(1, qty - 1) }))}
                                className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors text-xs font-bold">
                                −
                              </button>
                              <span className="w-7 text-center text-xs font-bold">{qty}</span>
                              <button type="button"
                                onClick={() => setSelectedProductQuantities((q) => ({ ...q, [pid]: qty + 1 }))}
                                className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors text-xs font-bold">
                                +
                              </button>
                              <button type="button" onClick={() => toggleProduct(pid)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
                {selectedProducts.length > 0 && selectedProducts.length === 1 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    Preço do produto preenchido automaticamente (editável)
                  </p>
                )}
              </div>
            )}

            {/* 4. Seção colapsável: Descrição */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button type="button" onClick={() => setDescSectionOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-sm font-medium flex items-center gap-2">
                  <AlignLeft size={15} className="text-muted-foreground" /> Descrição
                </span>
                <ChevronDown size={15} className={cn("text-muted-foreground transition-transform duration-200", descSectionOpen && "rotate-180")} />
              </button>
              {descSectionOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-border">
                  <ExpandableInput
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={type === "income" ? "Ex: Venda do produto X" : "Ex: Conta de luz, Fornecedor..."}
                    modalTitle="Descrição da Operação"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* 5. Seção colapsável: Custos desta transação */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button type="button" onClick={() => setCostsSectionOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-sm font-medium flex items-center gap-2">
                  <DollarSign size={15} className="text-muted-foreground" />
                  Custos desta transação
                  {transactionCosts.length > 0 && (
                    <span className="bg-brand-primary text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                      {transactionCosts.length}
                    </span>
                  )}
                </span>
                <ChevronDown size={15} className={cn("text-muted-foreground transition-transform duration-200", costsSectionOpen && "rotate-180")} />
              </button>
              {costsSectionOpen && (
                <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
                  {/* Lista de custos adicionados */}
                  {transactionCosts.length > 0 && (
                    <div className="space-y-1.5">
                      {transactionCosts.map((cost) => (
                        <div key={cost.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{cost.cost_name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {cost.value_type === "percentage"
                                ? `${cost.cost_value}%`
                                : cost.value_type === "usd"
                                ? `US$ ${cost.cost_value.toFixed(2)}`
                                : formatCurrency(cost.cost_value)}
                            </span>
                          </div>
                          <button type="button"
                            onClick={() => setTransactionCosts((prev) => prev.filter((c) => c.id !== cost.id))}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-2 shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário de custo personalizado */}
                  {showCustomCostForm ? (
                    <div className="border border-dashed border-border rounded-lg p-3 space-y-2.5 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Custo personalizado</span>
                        <button type="button" onClick={() => setShowCustomCostForm(false)}
                          className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nome do custo (opcional)"
                        value={customCostName}
                        onChange={(e) => setCustomCostName(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-brand-primary"
                      />
                      <div className="flex gap-2">
                        <div className="flex h-9 rounded-md border border-border overflow-hidden shrink-0">
                          {(["fixed", "percentage", "usd"] as const).map((vt, i) => (
                            <span key={vt} className="contents">
                              {i > 0 && <div className="w-px bg-border" />}
                              <button
                                type="button"
                                onClick={() => { setCustomCostValueType(vt); setCustomCostValue(""); }}
                                className={cn("px-2 text-xs font-bold transition-colors",
                                  customCostValueType === vt ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-accent")}
                              >
                                {vt === "fixed" ? "R$" : vt === "percentage" ? "%" : "US$"}
                              </button>
                            </span>
                          ))}
                        </div>
                        {customCostValueType === "percentage" ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value={customCostValue}
                            onChange={(e) => setCustomCostValue(e.target.value)}
                            className="h-9 flex-1 text-sm"
                          />
                        ) : (
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0,00"
                            value={customCostValue}
                            onChange={(e) => setCustomCostValue(maskBRL(e.target.value))}
                            className="h-9 flex-1 text-sm"
                          />
                        )}
                      </div>
                      <Button type="button" size="sm" className="w-full" onClick={addCustomCost}>
                        + Adicionar custo
                      </Button>
                    </div>
                  ) : (
                    <>
                      {isMobile ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between h-9 font-normal bg-background text-sm"
                            onClick={() => setCostDrawerOpen(true)}
                          >
                            + Adicionar custo
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                          <BottomSheet
                            open={costDrawerOpen}
                            onOpenChange={(open) => { setCostDrawerOpen(open); if (!open) setCostSearch(""); }}
                            title="Adicionar custo"
                            searchValue={costSearch}
                            onSearchChange={setCostSearch}
                            searchPlaceholder="Buscar custo..."
                            footer={
                              <BottomSheetClose>
                                <Button variant="outline" className="w-full">Fechar</Button>
                              </BottomSheetClose>
                            }
                          >
                            {allGlobalCosts
                              .filter((gc) => gc.name.toLowerCase().includes(costSearch.toLowerCase()))
                              .map((gc) => {
                                const valueLabel = gc.value_type === "percentage" ? `${gc.value}%` : gc.value_type === "usd" ? `US$ ${Number(gc.value).toFixed(2)}` : formatCurrency(Number(gc.value));
                                return (
                                  <button key={gc.id} type="button"
                                    className="w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100"
                                    onClick={() => { addGlobalCost(gc); setCostDrawerOpen(false); }}>
                                    <span>{gc.name}</span>
                                    <span className="text-xs text-gray-400">{valueLabel}</span>
                                  </button>
                                );
                              })}
                            {allGlobalCosts.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-6">Nenhum custo global cadastrado.</p>
                            )}
                            <button type="button"
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-brand-primary font-medium"
                              onClick={() => { setCostDrawerOpen(false); setShowCustomCostForm(true); }}>
                              <Plus size={14} /> + Personalizado
                            </button>
                          </BottomSheet>
                        </>
                      ) : (
                        <Popover open={costDrawerOpen} onOpenChange={(open) => { setCostDrawerOpen(open); if (!open) setCostSearch(""); }}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="w-full justify-between h-9 font-normal bg-background text-sm">
                              + Adicionar custo
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar custo..." value={costSearch} onValueChange={setCostSearch} />
                              <CommandList>
                                <CommandEmpty>Nenhum custo encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {allGlobalCosts
                                    .filter((gc) => gc.name.toLowerCase().includes(costSearch.toLowerCase()))
                                    .map((gc) => {
                                      const valueLabel = gc.value_type === "percentage" ? `${gc.value}%` : gc.value_type === "usd" ? `US$ ${Number(gc.value).toFixed(2)}` : formatCurrency(Number(gc.value));
                                      return (
                                        <CommandItem
                                          key={gc.id}
                                          value={gc.name}
                                          onSelect={() => { addGlobalCost(gc); setCostDrawerOpen(false); }}
                                          className="flex items-center justify-between cursor-pointer"
                                        >
                                          <span>{gc.name}</span>
                                          <span className="text-xs text-muted-foreground">{valueLabel}</span>
                                        </CommandItem>
                                      );
                                    })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                            {allGlobalCosts.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-4">Nenhum custo global cadastrado.</p>
                            )}
                            <div className="border-t border-border p-1">
                              <button
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-primary font-medium hover:bg-accent rounded-md transition-colors"
                                onClick={() => { setCostDrawerOpen(false); setShowCustomCostForm(true); }}
                              >
                                <Plus size={14} /> + Personalizado
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </>
                  )}

                  {/* Resumo de valor líquido */}
                  {transactionCosts.length > 0 && (() => {
                    const grossVal = parseBRL(value) * (isUSD ? usdRate : 1);
                    if (grossVal <= 0) return null;
                    const totalCosts = transactionCosts.reduce((sum, c) => {
                      if (c.value_type === "percentage") return sum + (grossVal * c.cost_value) / 100;
                      if (c.value_type === "usd") return sum + c.cost_value * usdRate;
                      return sum + c.cost_value;
                    }, 0);
                    if (totalCosts <= 0) return null;
                    const netValue = grossVal - totalCosts;
                    return (
                      <div className="border-t border-border pt-2 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Valor bruto</span>
                          <span>{formatCurrency(grossVal)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-destructive">
                          <span>(-) Custos totais</span>
                          <span>-{formatCurrency(totalCosts)}</span>
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
            </div>

            {/* 6. Seção colapsável: Recorrência */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button type="button" onClick={() => setRecurrenceSectionOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Repeat2 size={15} className="text-muted-foreground" /> Recorrência
                  {isRecurrent && <span className="text-xs text-brand-primary font-normal">Ativada</span>}
                </span>
                <ChevronDown size={15} className={cn("text-muted-foreground transition-transform duration-200", recurrenceSectionOpen && "rotate-180")} />
              </button>
              {recurrenceSectionOpen && (
                <div className="px-4 pb-4 pt-3 border-t border-border space-y-4">
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
                        <Input type="number" min="2" max="120" value={recurrentMonths}
                          onChange={(e) => setRecurrentMonths(e.target.value)}
                          className="w-24 h-10" />
                        <span className="text-sm text-muted-foreground">meses</span>
                      </div>
                      <p className="text-xs text-amber-500 mt-2">Isto criará faturas futuras preenchidas no seu painel.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 7. Seção colapsável: Anexar comprovante */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button type="button" onClick={() => setAttachSectionOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Paperclip size={15} className="text-muted-foreground" />
                  Anexar comprovante
                  {attachmentFile && (
                    <span className="text-xs text-brand-primary font-normal truncate max-w-[120px]">{attachmentFile.name}</span>
                  )}
                </span>
                <ChevronDown size={15} className={cn("text-muted-foreground transition-transform duration-200", attachSectionOpen && "rotate-180")} />
              </button>
              {attachSectionOpen && (
                <div className="px-4 pb-4 pt-3 border-t border-border">
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
              )}
            </div>

          </div>

          {/* Rodapé fixo */}
          <div className="px-6 py-4 border-t border-border shrink-0">
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-brand-primary hover:bg-brand-hover text-white" disabled={saving}>
                {saving ? "Salvando..." : `Salvar ${type === "income" ? "Receita" : "Despesa"}`}
              </Button>
            </div>
          </div>
          </form>
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
                                  <p className="text-sm font-medium">{tx.name}</p>
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

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
import { ChevronDown, ChevronRight, ArrowDownCircle, ArrowUpCircle, Wallet, ClipboardList, Plus, Calendar, Search, X, Package, Check, ChevronsUpDown, RefreshCw } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ExpandableInput } from "@/components/ui/expandable-input";
import { cn } from "@/lib/utils";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import ClickUpDatePicker from "@/components/ui/clickup-datepicker";
import { Switch } from "@/components/ui/switch";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { maskBRL, parseBRL } from "@/lib/product-icons";
import { getUSDRate } from "@/lib/exchange-rate";

export interface Transaction {
  id: string;
  type: "income" | "expense";
  description: string;
  value: number;
  date: string;
  product_id?: string | null;
  products?: { id: string; name: string } | null;
  attachment_url?: string | null;
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
  const [linkedProductId, setLinkedProductId] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterText, setFilterText] = useState("");
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrentMonths, setRecurrentMonths] = useState("6");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUSD, setIsUSD] = useState(false);
  const [usdRate, setUsdRate] = useState(5.50);
  const [rateLoading, setRateLoading] = useState(false);

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
      .select("*, products(id, name)")
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
  }, [user]);

  const openModal = () => {
    setType("income");
    setDescription("");
    setValue("");
    setSelectedDate(new Date());
    setLinkedProductId("");
    setIsRecurrent(false);
    setRecurrentMonths("6");
    setAttachmentFile(null);
    setIsUSD(false);
    setModalOpen(true);
  };

  // Abre modal automaticamente quando navegado com ?new=1 (ex: botão flutuante)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleProductLink = (productId: string) => {
    setLinkedProductId(productId);
    if (productId) {
      const prod = availableProducts.find((p) => p.id === productId);
      if (prod?.selling_price) {
        setIsUSD(false);
        setValue(maskBRL(String(Math.round(prod.selling_price * 100))));
      }
    }
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
        product_id: linkedProductId || null,
      });
    }

    const { data: insertedData, error } = await supabase.from("transactions").insert(transactionsToInsert).select();

    if (error) { setSaving(false); toast.error("Erro ao salvar"); return; }

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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-11 font-normal bg-background"
                    >
                      {linkedProductId
                        ? availableProducts.find((p) => p.id === linkedProductId)?.name
                        : "Nenhum produto selecionado"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandInput placeholder="Buscar produto..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              handleProductLink("");
                            }}
                          >
                            Nenhum produto
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                !linkedProductId ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                          {availableProducts.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              onSelect={() => handleProductLink(p.id)}
                            >
                              {p.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  linkedProductId === p.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {linkedProductId && (
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
                  placeholder="Ex: Venda do produto X"
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

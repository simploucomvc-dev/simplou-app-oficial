import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, MONTHS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import TransactionDetailModal from "@/components/TransactionDetailModal";

export interface Transaction {
  id: string;
  type: "income" | "expense";
  description: string;
  value: number;
  date: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"income" | "expense">("income");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setTransactions(data || []);
    setLoading(false);
    // Auto-expand first month
    if (data && data.length > 0) {
      const firstMonth = `${new Date(data[0].date).getFullYear()}-${new Date(data[0].date).getMonth()}`;
      setExpandedMonths(new Set([firstMonth]));
    }
  }, [user]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !value || !user) { toast.error("Preencha todos os campos"); return; }
    const val = parseFloat(value);
    if (val <= 0) { toast.error("Valor deve ser positivo"); return; }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      description: description.trim(),
      value: val,
      date,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Operação salva!");
    setDescription("");
    setValue("");
    setDate(new Date().toISOString().split("T")[0]);
    fetchTransactions();
  };

  // Group by month
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  });

  const toggleMonth = (key: string) => {
    const next = new Set(expandedMonths);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedMonths(next);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">💰 Registrar Operação</h1>

      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setType("income")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm border-2 transition-colors ${
            type === "income"
              ? "bg-success text-success-foreground border-success"
              : "bg-card text-muted-foreground border-border hover:border-success"
          }`}
        >
          <ArrowDownCircle size={16} /> Entrada
        </button>
        <button
          onClick={() => setType("expense")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm border-2 transition-colors ${
            type === "expense"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-card text-muted-foreground border-border hover:border-destructive"
          }`}
        >
          <ArrowUpCircle size={16} /> Saída
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Descrição</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Venda do produto X" className="h-11" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Valor (R$)</Label>
            <Input type="number" step="0.01" min="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="99.90" className="h-11" />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>
        </div>
        <Button type="submit" size="full" disabled={saving}>
          {saving ? "Salvando..." : "Salvar Operação"}
        </Button>
      </form>

      {/* History */}
      <div>
        <h2 className="text-lg font-bold mb-4">📋 Histórico</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                <div className="h-5 bg-muted rounded w-40" />
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Nenhuma operação registrada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([key, txs]) => {
              const [year, month] = key.split("-").map(Number);
              const isExpanded = expandedMonths.has(key);
              return (
                <div key={key} className="bg-card border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleMonth(key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                  >
                    <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border">
                      {txs.map((tx) => (
                        <button
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b border-border last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${tx.type === "income" ? "bg-success" : "bg-destructive"}`} />
                            <div className="text-left">
                              <p className="text-sm font-semibold">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
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

      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onChanged={fetchTransactions}
      />
    </div>
  );
}

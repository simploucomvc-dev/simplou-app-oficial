import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { Transaction } from "@/pages/TransactionsPage";

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function TransactionDetailModal({ transaction, onClose, onChanged }: Props) {
  if (!transaction) return null;

  const isIncome = transaction.type === "income";

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta operação?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Operação excluída"); onChanged(); onClose(); }
  };

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Detalhes da Operação</DialogTitle>
        </DialogHeader>

        <div className="bg-card border border-border rounded-lg p-5 text-center">
          <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center ${isIncome ? "bg-success/10" : "bg-destructive/10"}`}>
            {isIncome ? <ArrowDownCircle size={28} className="text-success" /> : <ArrowUpCircle size={28} className="text-destructive" />}
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase">{isIncome ? "Entrada" : "Saída"}</p>
          <p className={`text-3xl font-bold mt-1 ${isIncome ? "text-success" : "text-destructive"}`}>
            {isIncome ? "+" : "-"}{formatCurrency(Number(transaction.value))}
          </p>
        </div>

        <div className="space-y-3 mt-2">
          <div>
            <p className="text-xs text-muted-foreground">Descrição</p>
            <p className="font-semibold">{transaction.description}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-semibold">{formatDateLong(transaction.date)}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="danger" className="flex-1" onClick={handleDelete}>🗑️ Excluir</Button>
        </div>
        <Button variant="outline" size="full" onClick={onClose}>Fechar</Button>
      </DialogContent>
    </Dialog>
  );
}

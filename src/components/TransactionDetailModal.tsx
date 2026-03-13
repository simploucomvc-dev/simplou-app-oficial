import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpandableInput } from "@/components/ui/expandable-input";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Trash2, Pencil, Calendar, Package, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import ClickUpDatePicker from "@/components/ui/clickup-datepicker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Transaction } from "@/pages/TransactionsPage";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import { Download, FileText, Link as LinkIcon, File, Loader2 } from "lucide-react";
import html2pdf from "html2pdf.js";

interface Props {
  transaction: Transaction | null;
  availableProducts: { id: string; name: string; selling_price: number }[];
  onClose: () => void;
  onChanged: () => void;
}

export default function TransactionDetailModal({ transaction, availableProducts, onClose, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editProductId, setEditProductId] = useState<string>("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recurringDeleteOpen, setRecurringDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!transaction) return null;
  const isIncome = transaction.type === "income";

  const openEdit = () => {
    setEditDesc(transaction.description);
    setEditValue(String(transaction.value));
    setEditDate(new Date(transaction.date + "T12:00:00"));
    setEditProductId(transaction.product_id || "");
    setEditing(true);
  };

  const handleProductChange = (productId: string) => {
    setEditProductId(productId);
    if (productId) {
      const prod = availableProducts.find((p) => p.id === productId);
      if (prod?.selling_price) setEditValue(String(prod.selling_price));
    }
  };

  const baseDesc = transaction.description.replace(/\s*\(Parcela \d+\/\d+\)$/, "");
  const isRecurring = baseDesc !== transaction.description;

  const handleDelete = async () => {
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Operação excluída"); onChanged(); onClose(); setDeleteDialogOpen(false); }
  };

  const handleDeleteWithFuture = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: toDelete } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userData.user.id)
      .ilike("description", `${baseDesc}%`)
      .gte("date", transaction.date);
    if (!toDelete || toDelete.length === 0) return;
    const { error } = await supabase.from("transactions").delete().in("id", toDelete.map((t) => t.id));
    if (error) toast.error("Erro ao excluir");
    else { toast.success(`${toDelete.length} operação(ões) excluída(s)`); onChanged(); onClose(); setRecurringDeleteOpen(false); }
  };

  const confirmDelete = async () => {
    if (isRecurring) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: futureItems } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", userData.user.id)
          .ilike("description", `${baseDesc}%`)
          .gt("date", transaction.date);
        if (futureItems && futureItems.length > 0) {
          setRecurringDeleteOpen(true);
          return;
        }
      }
    }
    setDeleteDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { // Proteção ao free tier - 2MB
      toast.error("O arquivo deve ter no máximo 2MB.");
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Apenas JPG, PNG e PDF são permitidos.");
      return;
    }

    try {
      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split('.').pop();
      const filePath = `${userData.user.id}/${transaction.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('transaction-attachments')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('transaction-attachments')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ attachment_url: publicUrlData.publicUrl })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      toast.success("Anexo salvo com sucesso!");
      onChanged(); // Refresh data
    } catch (err: any) {
      toast.error("Erro ao anexar arquivo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const generatePDF = () => {
    const element = document.createElement('div');
    element.innerHTML = `
        <div style="font-family: sans-serif; padding: 40px; color: #333;">
          <div style="text-align: center; margin-bottom: 40px; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0;">Recibo de Operação</h1>
            <div style="color: #666; margin-top: 5px;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
          </div>
          
          <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 30px 0; color: ${isIncome ? '#22c55e' : '#ef4444'};">
            ${isIncome ? "+" : "-"}${formatCurrency(Number(transaction.value))}
          </div>
          
          <div style="margin-top: 30px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee;">
              <span style="font-weight: bold;">Descrição:</span>
              <span style="font-size: 16px;">${transaction.description}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee;">
              <span style="font-weight: bold;">Data da Operação:</span>
              <span style="font-size: 16px;">${formatDateLong(transaction.date)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee;">
              <span style="font-weight: bold;">Tipo:</span>
              <span style="font-size: 16px;">${isIncome ? 'Entrada (Receita)' : 'Saída (Despesa)'}</span>
            </div>
          </div>
          <div style="margin-top: 60px; text-align: center; font-size: 12px; color: #999;">
            Documento gerado pelo sistema Simplou.
          </div>
        </div>
    `;

    const opt = {
      margin: 0,
      filename: `recibo-${transaction.id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const exportCSV = () => {
    // @ts-ignore
    const csvContent = "data:text/csv;charset=utf-8,"
      // @ts-ignore
      + "ID,Descricao,Valor,Data,Tipo,Produto,Anexo\n"
      // @ts-ignore
      + `${transaction.id},"${transaction.description}",${transaction.value},${transaction.date},${transaction.type},"${transaction.products?.name || ''}","${transaction.attachment_url || ''}"`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transacao-${transaction.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEdit = async () => {
    if (!editDesc.trim() || !editValue) { toast.error("Preencha todos os campos"); return; }
    const val = parseFloat(editValue);
    if (val <= 0) { toast.error("Valor deve ser positivo"); return; }
    const dateStr = `${editDate.getFullYear()}-${String(editDate.getMonth() + 1).padStart(2, "0")}-${String(editDate.getDate()).padStart(2, "0")}`;
    setSaving(true);
    const { error } = await supabase.from("transactions").update({
      description: editDesc.trim(),
      value: val,
      date: dateStr,
      product_id: editProductId || null,
    }).eq("id", transaction.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Operação atualizada!");
    onChanged();
    onClose();
  };

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => { if (!open) { onClose(); setEditing(false); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Operação" : "Detalhes da Operação"}</DialogTitle>
        </DialogHeader>

        {!editing ? (
          <>
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
              {transaction.products?.name && (
                <div>
                  <p className="text-xs text-muted-foreground">Produto vinculado</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand-light text-brand-hover px-3 py-1 rounded-full mt-1">
                    <Package size={13} /> {transaction.products.name}
                  </span>
                </div>
              )}
              {/* @ts-ignore */}
              {transaction.attachment_url && (
                <div>
                  <p className="text-xs text-muted-foreground">Comprovante / Anexo</p>
                  <a
                    // @ts-ignore
                    href={transaction.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold bg-accent text-accent-foreground px-3 py-1 rounded-full mt-1 hover:bg-accent/80 transition-colors"
                  >
                    <LinkIcon size={13} /> Ver Anexo
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full gap-2 text-xs" onClick={generatePDF}>
                <FileText size={14} /> Gerar PDF
              </Button>
              <Button variant="outline" className="w-full gap-2 text-xs" onClick={exportCSV}>
                <Download size={14} /> Exportar CSV
              </Button>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 gap-2" onClick={openEdit}>
                <Pencil size={15} /> Editar
              </Button>
              <Button variant="danger" className="flex-1 gap-2" onClick={confirmDelete}>
                <Trash2 size={15} /> Excluir
              </Button>
            </div>
            <Button variant="outline" size="full" onClick={onClose} className="mt-3">Fechar</Button>

            <SafeDeleteDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              onConfirm={handleDelete}
              title="Aviso: Exclusão Permanente"
              itemName={transaction.description}
            />

            <Dialog open={recurringDeleteOpen} onOpenChange={setRecurringDeleteOpen}>
              <DialogContent className="max-w-xs">
                <DialogHeader>
                  <DialogTitle className="text-destructive">Excluir operação recorrente</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Esta operação faz parte de uma série recorrente. O que deseja fazer?</p>
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                  >
                    Apagar somente essa
                  </Button>
                  <Button
                    className="w-full bg-destructive hover:bg-destructive/90 text-white"
                    onClick={handleDeleteWithFuture}
                  >
                    Apagar faturas futuras também
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setRecurringDeleteOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="space-y-4 mt-1">
            <div className="bg-muted/30 border border-border rounded-lg p-3">
              <Label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <File size={13} /> {transaction.attachment_url ? "Alterar Comprovante" : "Anexar Comprovante"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="text-xs flex-1 h-9 cursor-pointer file:cursor-pointer"
                />
                {uploading && <Loader2 size={14} className="text-muted-foreground animate-spin" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">Salvamento automático. Max 2MB.</p>
            </div>

            {isIncome && availableProducts.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                  Produto vinculado <span className="text-xs font-normal">(opcional)</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-11 font-normal bg-background"
                    >
                      {editProductId
                        ? availableProducts.find((p) => p.id === editProductId)?.name
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
                              handleProductChange("");
                              // We can't auto-close popover easily here without state, but user clicks away
                            }}
                          >
                            Nenhum produto
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                !editProductId ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                          {availableProducts.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              onSelect={() => handleProductChange(p.id)}
                            >
                              {p.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  editProductId === p.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Descrição</Label>
              <ExpandableInput
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                modalTitle="Descrição da Operação"
                rows={2}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Data</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-11 flex items-center justify-between text-sm bg-background border border-input rounded-md px-3 outline-none hover:border-brand-primary"
                    >
                      <span>{format(editDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <ClickUpDatePicker
                      hideSidebar
                      hideStartDate
                      dueDate={editDate}
                      onDueDateChange={(date) => { if (date) { setEditDate(date); setDatePickerOpen(false); } }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-brand-primary hover:bg-brand-hover text-white"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

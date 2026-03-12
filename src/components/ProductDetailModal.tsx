import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { ICON_MAP, getProductIconName } from "@/lib/product-icons";
import { Package, Pencil, Trash2, AlignLeft, Sparkles, AlertCircle } from "lucide-react";
import type { Product } from "@/pages/ProductsPage";

interface Props {
    product: Product | null;
    totalFixedCost: number;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function ProductDetailModal({ product, totalFixedCost, onClose, onEdit, onDelete }: Props) {
    if (!product) return null;

    const IconComponent = ICON_MAP[getProductIconName(product.id)] || Package;
    const fc = product.ignore_fixed_costs ? 0 : totalFixedCost;
    const profit = Number(product.selling_price) - Number(product.variable_cost) - fc - Number(product.cost_price);

    return (
        <Dialog open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-hover shrink-0">
                            <IconComponent size={20} />
                        </div>
                        {product.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {product.description && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground flex gap-2">
                            <AlignLeft size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                            <p>{product.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card border border-border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Custo de compra</p>
                            <p className="font-semibold">{formatCurrency(Number(product.cost_price))}</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Custo variável</p>
                            <p className="font-semibold">{formatCurrency(Number(product.variable_cost))}</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-3 col-span-2 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Custos fixos alocados</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-semibold">{formatCurrency(fc)}</p>
                                    {product.ignore_fixed_costs && (
                                        <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                            <AlertCircle size={10} /> Ignorado
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground mb-1">Preço de venda</p>
                                <p className="font-semibold text-brand-hover">{formatCurrency(Number(product.selling_price))}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted border border-border rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                            <Sparkles size={16} /> Lucro líquido estimado
                        </div>
                        <p className={`text-xl font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                            {formatCurrency(profit)}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 gap-2" onClick={onEdit}>
                            <Pencil size={15} /> Editar
                        </Button>
                        <Button variant="destructive" className="flex-1 gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-0" onClick={onDelete}>
                            <Trash2 size={15} /> Excluir
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

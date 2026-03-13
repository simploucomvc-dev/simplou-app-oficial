import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Pencil, Trash2, Package, ShoppingBag, MoreVertical, Wrench, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ICON_MAP, getProductIconName } from "@/lib/product-icons";
import { toast } from "sonner";
import ProductModal from "@/components/ProductModal";
import ProductDetailModal from "@/components/ProductDetailModal";
import FixedCostsModal from "@/components/FixedCostsModal";
import { calcFixedCostForProduct } from "@/lib/product-icons";
import { getUSDRate } from "@/lib/exchange-rate";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";

export interface Product {
  id: string;
  name: string;
  cost_price: number;
  variable_cost: number;
  selling_price: number;
  description?: string;
  ignore_fixed_costs?: boolean;
  entry_type?: "product" | "service";
}

export interface FixedCost {
  id: string;
  name: string;
  value: number;
  is_active: boolean;
  type?: "fixed" | "variable";
  value_type?: "fixed" | "percentage" | "usd";
  percentage_base?: "selling_price" | "cost_price";
}

type EntryType = "product" | "service";

function EntryTypeSelectorDialog({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (type: EntryType) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-xl">O que deseja cadastrar?</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => onSelect("product")}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-brand-primary hover:bg-brand-light transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-light group-hover:bg-brand-primary/20 flex items-center justify-center transition-colors">
              <Package size={24} className="text-brand-hover" />
            </div>
            <span className="text-sm font-semibold">Produto</span>
          </button>
          <button
            onClick={() => onSelect("service")}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-brand-primary hover:bg-brand-light transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-light group-hover:bg-brand-primary/20 flex items-center justify-center transition-colors">
              <Wrench size={24} className="text-brand-hover" />
            </div>
            <span className="text-sm font-semibold">Serviço</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [productModal, setProductModal] = useState<{ open: boolean; product?: Product; entryType?: EntryType }>({ open: false });
  const [fixedCostsModal, setFixedCostsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterType, setFilterType] = useState<"all" | "product" | "service">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [usdRate, setUsdRate] = useState(5.50);

  const getProductCosts = (p: Product) => {
    const fc = p.ignore_fixed_costs ? 0 : calcFixedCostForProduct(fixedCosts, Number(p.selling_price), Number(p.cost_price), usdRate);
    const variable = Number(p.variable_cost) || 0;
    const purchase = Number(p.cost_price) || 0;
    return { fc, variable, purchase, total: fc + variable + purchase };
  };

  const calcProfit = (p: Product) => {
    const { total } = getProductCosts(p);
    return Number(p.selling_price) - total;
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    const rateP = getUSDRate().catch(() => 5.50);
    const [{ data: prods }, { data: costs }, rate] = await Promise.all([
      supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("fixed_costs").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      rateP
    ]);
    setProducts(prods || []);
    setFixedCosts(costs || []);
    setUsdRate(rate);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success(`Excluído com sucesso`);
      fetchData();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const confirmDelete = (p: Product) => {
    setProductToDelete(p);
    setDeleteDialogOpen(true);
  };

  const filteredProducts = products.filter((p) => {
    if (filterType === "all") return true;
    return (p.entry_type || "product") === filterType;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header row: title + buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="h-7 bg-muted rounded w-44" />
          <div className="flex gap-2">
            <div className="h-9 bg-muted rounded w-20" />
            <div className="h-9 bg-muted rounded w-28" />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          <div className="h-7 bg-background/60 rounded-md w-14" />
          <div className="h-7 bg-muted-foreground/10 rounded-md w-20" />
          <div className="h-7 bg-muted-foreground/10 rounded-md w-18" />
        </div>

        {/* Product cards */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-4 bg-muted rounded w-14" />
                  </div>
                  <div className="h-3.5 bg-muted rounded w-52" />
                  <div className="h-3.5 bg-muted rounded w-24" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag size={20} /> Produtos e Serviços
          </h1>
          {profile?.company_name && (
            <p className="text-sm text-muted-foreground mt-0.5">{profile.company_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSelectorOpen(true)} size="sm" className="bg-brand-primary hover:bg-brand-hover text-white">
            <Plus size={16} /> Novo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFixedCostsModal(true)}>
            <Settings size={16} /> Meus Custos
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {(["all", "product", "service"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterType === t
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t === "all" ? "Todos" : t === "product" ? "Produtos" : "Serviços"}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center">
          <Package size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-semibold mb-1">Nenhum item cadastrado</p>
          <p className="text-sm text-muted-foreground">Clique em "+ Novo" para cadastrar seu primeiro item</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const profit = calcProfit(p);
            const isService = p.entry_type === "service";
            const DefaultIcon = isService ? Wrench : Package;
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 hover:border-brand-primary/30 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                    <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
                      {(() => { const I = ICON_MAP[getProductIconName(p.id)] || DefaultIcon; return <I size={18} className="text-brand-hover" />; })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold group-hover:text-brand-hover transition-colors">{p.name}</h3>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isService ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}>
                          {isService ? "Serviço" : "Produto"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Custo: {formatCurrency(getProductCosts(p).total)} · Preço: {formatCurrency(Number(p.selling_price))}
                      </p>
                      <p className={`text-sm font-semibold mt-0.5 ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                        Lucro: {formatCurrency(profit)}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setProductModal({ open: true, product: p, entryType: p.entry_type || "product" })}>
                        <Pencil size={14} className="mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => confirmDelete(p)} className="text-destructive focus:text-destructive">
                        <Trash2 size={14} className="mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Entry type selector */}
      <EntryTypeSelectorDialog
        open={selectorOpen}
        onSelect={(type) => {
          setSelectorOpen(false);
          setProductModal({ open: true, entryType: type });
        }}
        onClose={() => setSelectorOpen(false)}
      />

      <ProductModal
        open={productModal.open}
        product={productModal.product}
        entryType={productModal.entryType || "product"}
        fixedCosts={fixedCosts}
        usdRate={usdRate}
        onClose={() => setProductModal({ open: false })}
        onSaved={fetchData}
        onOpenCosts={() => {
          setProductModal({ open: false, product: productModal.product });
          setFixedCostsModal(true);
        }}
      />

      <FixedCostsModal
        open={fixedCostsModal}
        fixedCosts={fixedCosts}
        onClose={() => setFixedCostsModal(false)}
        onChanged={fetchData}
      />

      <ProductDetailModal
        product={selectedProduct}
        fixedCosts={fixedCosts}
        usdRate={usdRate}
        onClose={() => setSelectedProduct(null)}
        onEdit={() => {
          if (selectedProduct) {
            setProductModal({ open: true, product: selectedProduct, entryType: selectedProduct.entry_type || "product" });
            setSelectedProduct(null);
          }
        }}
        onDelete={() => {
          if (selectedProduct) {
            confirmDelete(selectedProduct);
            setSelectedProduct(null);
          }
        }}
      />

      <SafeDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => productToDelete && deleteProduct(productToDelete.id)}
        title="Aviso: Exclusão Permanente"
        itemName={productToDelete?.name || ""}
      />
    </div >
  );
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import ProductModal from "@/components/ProductModal";
import FixedCostsModal from "@/components/FixedCostsModal";

export interface Product {
  id: string;
  name: string;
  cost_price: number;
  variable_cost: number;
  selling_price: number;
}

export interface FixedCost {
  id: string;
  name: string;
  value: number;
  is_active: boolean;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [fixedCostsModal, setFixedCostsModal] = useState(false);

  const totalFixedCost = fixedCosts.filter((c) => c.is_active).reduce((s, c) => s + Number(c.value), 0);

  const calcProfit = (p: Product) => {
    const taxes = Number(p.selling_price) * 0.06;
    return Number(p.selling_price) - taxes - Number(p.variable_cost) - totalFixedCost - Number(p.cost_price);
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [{ data: prods }, { data: costs }] = await Promise.all([
      supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("fixed_costs").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    ]);
    setProducts(prods || []);
    setFixedCosts(costs || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Produto excluído"); fetchData(); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-40 mb-2" />
            <div className="h-4 bg-muted rounded w-60" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">🛍️ Meus Produtos</h1>
        <div className="flex gap-2">
          <Button onClick={() => setProductModal({ open: true })} size="sm">
            <Plus size={16} /> Novo Produto
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFixedCostsModal(true)}>
            <Settings size={16} /> Custos Fixos
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Package size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold mb-1">Nenhum produto cadastrado</p>
          <p className="text-sm text-muted-foreground">Clique em "Novo Produto" para cadastrar seu primeiro item</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const profit = calcProfit(p);
            return (
              <div key={p.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Custo: {formatCurrency(Number(p.cost_price))} | Preço: {formatCurrency(Number(p.selling_price))}
                    </p>
                    <p className={`text-sm font-semibold mt-1 ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                      Lucro: {formatCurrency(profit)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setProductModal({ open: true, product: p })}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="text-destructive hover:text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductModal
        open={productModal.open}
        product={productModal.product}
        totalFixedCost={totalFixedCost}
        onClose={() => setProductModal({ open: false })}
        onSaved={fetchData}
      />

      <FixedCostsModal
        open={fixedCostsModal}
        fixedCosts={fixedCosts}
        onClose={() => setFixedCostsModal(false)}
        onChanged={fetchData}
      />
    </div>
  );
}

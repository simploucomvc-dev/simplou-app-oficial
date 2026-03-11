import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, MONTHS_SHORT } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  value: number;
  date: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      const year = new Date().getFullYear();
      const { data } = await supabase
        .from("transactions")
        .select("id, type, value, date")
        .eq("user_id", user.id)
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);
      setTransactions(data || []);
      setLoading(false);
    };
    fetchTransactions();
  }, [user]);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.value), 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.value), 0);
  const profit = totalIncome - totalExpense;

  const monthlyData = MONTHS_SHORT.map((month, i) => {
    const monthTransactions = transactions.filter((t) => new Date(t.date).getMonth() === i);
    const income = monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.value), 0);
    const expense = monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.value), 0);
    return { name: month, receitas: income, despesas: expense, resultado: income - expense };
  });

  const cards = [
    { label: "Receita total", value: totalIncome, icon: TrendingUp, color: "text-success" },
    { label: "Despesa total", value: totalExpense, icon: TrendingDown, color: "text-destructive" },
    { label: "Lucro líquido", value: profit, icon: Sparkles, color: profit >= 0 ? "text-success" : "text-destructive" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-3" />
              <div className="h-8 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">📊 Resumo do Ano {new Date().getFullYear()}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} className={card.color} />
              <span className="text-sm text-muted-foreground font-medium">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">Evolução Mensal</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
              />
              <Line type="monotone" dataKey="receitas" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resultado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">Receitas vs Despesas</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
              />
              <Legend />
              <Bar dataKey="receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

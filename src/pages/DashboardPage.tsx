import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, MONTHS_SHORT } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, TrendingDown, Sparkles, BarChart2 } from "lucide-react";

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
  const [profileName, setProfileName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const year = new Date().getFullYear();
      const [{ data: txData }, { data: profile }] = await Promise.all([
        supabase.from("transactions").select("id, type, value, date").eq("user_id", user.id).gte("date", `${year}-01-01`).lte("date", `${year}-12-31`),
        supabase.from("profiles").select("name, company_name, profile_photo_url, company_logo_url").eq("id", user.id).single(),
      ]);
      setTransactions(txData || []);
      if (profile) {
        setProfileName(profile.name || "");
        setCompanyName(profile.company_name || "");
        setProfilePhoto(profile.profile_photo_url || null);
        setCompanyLogo(profile.company_logo_url || null);
      }
      setLoading(false);
    };
    fetchData();
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
      <div className="space-y-6 animate-pulse">
        {/* Header row skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted shrink-0" />
          <div className="space-y-2">
            <div className="h-7 bg-muted rounded w-40" />
            <div className="h-4 bg-muted rounded w-56" />
          </div>
        </div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border-2 border-border rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-muted" />
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-8 bg-muted rounded w-32" />
            </div>
          ))}
        </div>

        {/* Line chart panel */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-64 bg-muted/50 rounded-xl" />
        </div>

        {/* Bar chart panel */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="h-4 bg-muted rounded w-40" />
          <div className="h-64 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {companyLogo ? (
          <img src={companyLogo} alt="Logo da Empresa" className="w-16 h-16 rounded-2xl object-cover border-4 border-background shadow-md shadow-black/5" />
        ) : profilePhoto ? (
          <img src={profilePhoto} alt="Foto de Perfil" className="w-16 h-16 rounded-full object-cover border-4 border-background shadow-md shadow-black/5" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand-hover shadow-sm border border-brand-primary/10">
            <BarChart2 size={24} />
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {profileName ? `Olá, ${profileName.split(" ")[0]}!` : "Dashboard"}
          </h1>
          {companyName ? (
            <p className="text-sm text-muted-foreground mt-0.5">{companyName} · Visão geral {new Date().getFullYear()}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">Visão geral financeira de {new Date().getFullYear()}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border-2 border-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color === "text-success" ? "bg-success/10" : card.color === "text-destructive" ? "bg-destructive/10" : "bg-primary/10"}`}>
              <card.icon size={20} className={card.color} />
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
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
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
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

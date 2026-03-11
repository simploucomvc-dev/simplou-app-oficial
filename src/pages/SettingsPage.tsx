import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setCompanyName(data.company_name || "");
        setCnpj(data.cnpj || "");
        setBusinessType(data.business_type || "");
      }
    };
    fetchProfile();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      company_name: companyName.trim(),
      cnpj: cnpj.trim(),
      business_type: businessType.trim(),
    });
    setSaving(false);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Dados salvos!");
  };

  const saveCompany = saveProfile;

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-bold">⚙️ Configurações</h1>

      {/* Profile */}
      <section className="space-y-4">
        <h2 className="text-base font-bold">👤 Perfil</h2>
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Nome completo</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        </div>
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Email</Label>
          <Input value={user?.email || ""} disabled className="h-11 bg-muted" />
        </div>
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Telefone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(91) 99999-9999" className="h-11" />
        </div>
        <Button onClick={saveProfile} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </section>

      <div className="border-t border-border" />

      {/* Company */}
      <section className="space-y-4">
        <h2 className="text-base font-bold">🏢 Dados da Empresa</h2>
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Nome da empresa</Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Loja da Maria" className="h-11" />
        </div>
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">CNPJ (opcional)</Label>
          <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="h-11" />
        </div>
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-1.5 block">Ramo de atividade</Label>
          <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Ex: Confeitaria" className="h-11" />
        </div>
        <Button onClick={saveCompany} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </section>

      <div className="border-t border-border" />

      {/* Security */}
      <section className="space-y-4">
        <h2 className="text-base font-bold">🔒 Segurança</h2>
        <Button variant="outline" disabled>Alterar senha</Button>
        <Button variant="outline" disabled>Alterar email</Button>
      </section>

      <div className="border-t border-border" />

      {/* Subscription */}
      <section className="space-y-4">
        <h2 className="text-base font-bold">💳 Assinatura & Pagamentos</h2>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">Plano atual</p>
          <p className="text-xl font-bold mb-3">Gratuito</p>
          <Button className="bg-success hover:bg-success/90 text-success-foreground">Fazer upgrade para Pro</Button>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Danger zone */}
      <section className="space-y-4">
        <h2 className="text-base font-bold">🗑️ Zona de Perigo</h2>
        <div className="border-2 border-destructive/30 bg-destructive/5 rounded-lg p-5 space-y-3">
          <p className="text-sm font-semibold">Ações irreversíveis</p>
          <Button variant="danger" disabled>Exportar meus dados</Button>
          <Button variant="danger" disabled>Limpar todos os dados</Button>
          <Button variant="destructive" onClick={signOut}>Excluir conta permanentemente</Button>
        </div>
      </section>
    </div>
  );
}

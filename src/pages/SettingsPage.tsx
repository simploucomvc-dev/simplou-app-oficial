import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Settings2, User, Building2, Lock, CreditCard, AlertTriangle,
  Upload, X, ImageIcon, Camera, Eye, EyeOff, Mail, Download, Trash2, Check
} from "lucide-react";
import { X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import AvatarCropModal from "@/components/AvatarCropModal";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: "Uma letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Um número", met: /[0-9]/.test(password) },
    { label: "Um símbolo (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
    { label: "Pelo menos 6 caracteres", met: password.length >= 6 },
  ];

  return (
    <div className="space-y-1.5 mt-3">
      {requirements.map((req, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px] font-medium transition-colors">
          <div className={cn(
            "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border",
            req.met ? "bg-success/10 border-success text-success" : "bg-muted border-border text-muted-foreground"
          )}>
            {req.met ? <Check size={10} strokeWidth={3} /> : <XIcon size={8} strokeWidth={3} />}
          </div>
          <span className={req.met ? "text-success" : "text-muted-foreground"}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface UploadButtonProps {
  currentUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
  uploading: boolean;
  label: string;
  accept?: string;
}

function UploadButton({ currentUrl, onUpload, onRemove, uploading, label, accept = "image/*" }: UploadButtonProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      {currentUrl ? (
        <img src={currentUrl} alt={label} className="w-20 h-20 rounded-xl object-cover border border-border" />
      ) : (
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted">
          <ImageIcon size={24} className="text-muted-foreground" />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="gap-2"
        >
          <Upload size={14} /> {uploading ? "Enviando..." : label}
        </Button>
        {currentUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="px-2">
            <X size={14} />
          </Button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut, profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Security Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
  const [otpToken, setOtpToken] = useState("");

  // Danger Zone states
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [safeDialog, setSafeDialog] = useState<{ open: boolean; type: "clear" | "delete"; title: string; itemName: string; requiredText: string }>({
    open: false,
    type: "clear",
    title: "",
    itemName: "",
    requiredText: "excluir",
  });

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfileData = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setCompanyName(data.company_name || "");
        setCnpj(data.cnpj || "");
        setBusinessType(data.business_type || "");
        setProfilePhotoUrl(data.profile_photo_url || null);
        setCompanyLogoUrl(data.company_logo_url || null);
      }
    };
    fetchProfileData();
  }, [user]);

  const uploadFile = async (file: File | Blob, path: string): Promise<string | null> => {
    if (file.size > 2097152) { toast.error("Arquivo muito grande. Máximo: 2MB"); return null; }
    const { error } = await supabase.storage.from("user-uploads").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar arquivo"); return null; }
    const { data } = supabase.storage.from("user-uploads").getPublicUrl(path);
    return data.publicUrl + `?t=${Date.now()}`;
  };

  // Open file picker → show crop modal
  const handleAvatarFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // After cropping: upload circular blob
  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;
    setUploadingPhoto(true);
    const url = await uploadFile(blob, `${user.id}/avatar`);
    if (url) {
      setProfilePhotoUrl(url);
      await supabase.from("profiles").upsert({ id: user.id, profile_photo_url: url });
      await refreshProfile();
      toast.success("Foto atualizada!");
    }
    setUploadingPhoto(false);
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setUploadingLogo(true);
    const url = await uploadFile(file, `${user.id}/logo`);
    if (url) {
      setCompanyLogoUrl(url);
      await supabase.from("profiles").upsert({ id: user.id, company_logo_url: url });
      toast.success("Logo atualizada!");
    }
    setUploadingLogo(false);
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    await supabase.storage.from("user-uploads").remove([`${user.id}/avatar`]);
    await supabase.from("profiles").upsert({ id: user.id, profile_photo_url: null });
    setProfilePhotoUrl(null);
    await refreshProfile();
    toast.success("Foto removida");
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    await supabase.storage.from("user-uploads").remove([`${user.id}/logo`]);
    await supabase.from("profiles").upsert({ id: user.id, company_logo_url: null });
    setCompanyLogoUrl(null);
    toast.success("Logo removida");
  };

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
    else {
      await refreshProfile();
      toast.success("Dados salvos!");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem ou estão vazias");
      return;
    }

    const isPasswordValid =
      /[A-Z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword) &&
      newPassword.length >= 6;

    if (!isPasswordValid) {
      toast.error("Sua nova senha não atende aos requisitos de segurança");
      return;
    }

    setIsUpdatingSecurity(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingSecurity(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setIsPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Insira um email válido");
      return;
    }

    setIsUpdatingSecurity(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setIsUpdatingSecurity(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Código de confirmação enviado para o novo endereço!");
      setEmailStep("verify");
    }
  };

  const verifyEmailOTP = async () => {
    if (otpToken.length < 6) {
      toast.error("Insira o código de 6 dígitos");
      return;
    }

    setIsUpdatingSecurity(true);
    const { error } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: otpToken,
      type: "email_change",
    });
    setIsUpdatingSecurity(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email alterado com sucesso!");
      setIsEmailModalOpen(false);
      setOtpToken("");
      setEmailStep("request");
      await refreshProfile();
    }
  };

  const getTrialTimeRemaining = () => {
    if (!profile) return null;
    const created = new Date(profile.created_at);
    const trialEnd = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    if (diff <= 0) return "Expirado";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} dias e ${hours} horas restantes`;
  };

  const handleExportData = async () => {
    if (!user) return;
    toast.loading("Preparando dados para exportação...");

    try {
      const [{ data: txs }, { data: prods }, { data: costs }] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id),
        supabase.from("products").select("*").eq("user_id", user.id),
        supabase.from("fixed_costs").select("*").eq("user_id", user.id),
      ]);

      const data = {
        transacoes: txs || [],
        produtos: prods || [],
        custos_fixos: costs || [],
      };

      const csvContent = "data:text/csv;charset=utf-8," +
        "Tabela,Data,Nome/Descricao,Valor\n" +
        (data.transacoes.map(t => `Transacao,${t.date},${t.description},${t.value}`).join("\n")) + "\n" +
        (data.produtos.map(p => `Produto,,${p.name},${p.selling_price}`).join("\n")) + "\n" +
        (data.custos_fixos.map(c => `Custo Fixo,,${c.name},${c.value}`).join("\n"));

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `simplou_backup_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss();
      toast.success("Dados exportados com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao exportar dados.");
    }
  };

  const handleClearData = async () => {
    if (!user) return;
    setIsDeletingData(true);
    try {
      await Promise.all([
        supabase.from("transactions").delete().eq("user_id", user.id),
        supabase.from("products").delete().eq("user_id", user.id),
        supabase.from("fixed_costs").delete().eq("user_id", user.id),
      ]);
      toast.success("Todos os seus dados foram limpos!");
      setSafeDialog(prev => ({ ...prev, open: false }));
    } catch (error) {
      toast.error("Erro ao limpar dados.");
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // 1. Clear all data first
      await Promise.all([
        supabase.from("transactions").delete().eq("user_id", user.id),
        supabase.from("products").delete().eq("user_id", user.id),
        supabase.from("fixed_costs").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);

      // 2. Sign out
      await signOut();
      toast.success("Sua conta e dados foram excluídos permanentemente.");
    } catch (error) {
      toast.error("Erro ao excluir conta.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold flex items-center gap-2"><Settings2 size={20} /> Configurações</h1>

      {/* Profile */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold flex items-center gap-2 pb-2 border-b border-border"><User size={16} /> Perfil</h2>

        {/* Avatar with crop */}
        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-2 block">Foto de perfil</Label>
          <div className="flex items-center gap-4">
            {/* Clickable avatar */}
            <button
              type="button"
              className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-border hover:border-brand-primary transition-colors focus:outline-none"
              onClick={() => avatarInputRef.current?.click()}
              title="Clique para alterar foto"
            >
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-brand-light flex items-center justify-center">
                  <User size={28} className="text-brand-hover" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarFileSelect(file);
                e.target.value = "";
              }}
            />
            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingPhoto}
                onClick={() => avatarInputRef.current?.click()}
                className="gap-2"
              >
                <Upload size={14} /> {uploadingPhoto ? "Enviando..." : "Alterar foto"}
              </Button>
              {profilePhotoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto} className="gap-2 text-destructive hover:text-destructive">
                  <X size={14} /> Remover
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">JPG, PNG ou WebP · Máx 2MB · Imagem será recortada em formato circular</p>
        </div>

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
          <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(91) 99999-9999" className="h-11" maxLength={15} />
        </div>
        <Button onClick={saveProfile} disabled={saving} className="bg-brand-primary hover:bg-brand-hover text-white">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </section>

      {/* Company */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold flex items-center gap-2 pb-2 border-b border-border"><Building2 size={16} /> Dados da Empresa</h2>

        <div>
          <Label className="text-muted-foreground text-sm font-medium mb-2 block">Logo da empresa</Label>
          <UploadButton
            currentUrl={companyLogoUrl}
            onUpload={handleLogoUpload}
            onRemove={handleRemoveLogo}
            uploading={uploadingLogo}
            label="Upload logo"
          />
          <p className="text-xs text-muted-foreground mt-2">JPG, PNG ou WebP · Máx 2MB · Recomendado: 200×200px</p>
        </div>

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
        <Button onClick={saveProfile} disabled={saving} className="bg-brand-primary hover:bg-brand-hover text-white">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </section>

      {/* Security */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm">
        <h2 className="text-base font-bold flex items-center gap-2 pb-2 border-b border-border"><Lock size={16} /> Segurança</h2>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>Alterar senha</Button>
          <Button variant="outline" onClick={() => setIsEmailModalOpen(true)}>Alterar email</Button>
        </div>

        {/* Password Modal */}
        <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alterar Senha</DialogTitle>
              <DialogDescription>
                Digite sua nova senha abaixo para atualizar sua segurança.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword.length > 0 && <PasswordRequirements password={newPassword} />}
              </div>
              <div className="space-y-2">
                <Label>Confirmar Nova Senha</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleChangePassword}
                disabled={isUpdatingSecurity || !newPassword || newPassword !== confirmPassword || !(/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) && newPassword.length >= 6)}
                className="bg-brand-primary hover:bg-brand-hover text-white"
              >
                {isUpdatingSecurity ? "Atualizando..." : "Confirmar Troca"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEmailModalOpen} onOpenChange={(open) => {
          setIsEmailModalOpen(open);
          if (!open) {
            setEmailStep("request");
            setOtpToken("");
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{emailStep === "request" ? "Alterar Email" : "Verificar Código"}</DialogTitle>
              <DialogDescription>
                {emailStep === "request"
                  ? "Você receberá um código de confirmação no novo endereço de email."
                  : `Digite o código enviado para ${newEmail}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {emailStep === "request" ? (
                <div className="space-y-2">
                  <Label>Novo Email</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="novo@email.com"
                      className="pl-9"
                    />
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Label>Código de 6 dígitos</Label>
                  <InputOTP
                    maxLength={6}
                    value={otpToken}
                    onChange={(value) => setOtpToken(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setEmailStep("request")}
                  >
                    Mudar email digitado
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmailModalOpen(false)}>Cancelar</Button>
              {emailStep === "request" ? (
                <Button onClick={handleChangeEmail} disabled={isUpdatingSecurity} className="bg-brand-primary hover:bg-brand-hover text-white">
                  {isUpdatingSecurity ? "Enviando..." : "Enviar Código"}
                </Button>
              ) : (
                <Button onClick={verifyEmailOTP} disabled={isUpdatingSecurity || otpToken.length < 6} className="bg-brand-primary hover:bg-brand-hover text-white">
                  {isUpdatingSecurity ? "Verificando..." : "Verificar Código"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Subscription */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold flex items-center gap-2 pb-2 border-b border-border"><CreditCard size={16} /> Assinatura & Pagamentos</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Plano atual</p>
            <p className="text-xl font-bold mt-0.5">
              {profile?.role === "super_admin" ? "Administrador" : profile?.role === "partner" ? "Parceiro" : "Período de Teste"}
            </p>
            {(!profile?.role || (profile?.role !== "super_admin" && profile?.role !== "partner")) && (
              <p className="text-sm text-brand-hover font-medium mt-1">
                {getTrialTimeRemaining()}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Data & Backup */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold flex items-center gap-2 pb-2 border-b border-border"><Download size={16} /> Dados & Backup</h2>
        <p className="text-sm text-muted-foreground">Exporte seus dados para um arquivo CSV para manter uma cópia de segurança.</p>
        <Button variant="outline" onClick={handleExportData} className="gap-2">
          <Download size={14} /> Exportar meus dados (.csv)
        </Button>
      </section>

      {/* Danger zone */}
      <section className="border-2 border-destructive/30 bg-destructive/5 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2 text-destructive"><AlertTriangle size={16} /> Zona de Perigo</h2>
        <p className="text-sm text-muted-foreground">Estas ações são permanentes e não podem ser desfeitas.</p>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => setSafeDialog({
              open: true,
              type: "clear",
              title: "Limpar todos os dados",
              itemName: "Esta ação excluirá todos os seus produtos, serviços, custos e transações. Você começará do zero.",
              requiredText: "limpar"
            })}
          >
            <Trash2 size={14} className="mr-2" /> Começar do zero (limpar tudo)
          </Button>
          <Button
            variant="destructive"
            onClick={() => setSafeDialog({
              open: true,
              type: "delete",
              title: "Excluir conta permanentemente",
              itemName: "Sua conta, perfil e todos os seus dados serão apagados de nossos servidores para sempre.",
              requiredText: "excluir"
            })}
          >
            Excluir minha conta
          </Button>
        </div>
      </section>

      <SafeDeleteDialog
        open={safeDialog.open}
        onOpenChange={(open: boolean) => setSafeDialog(prev => ({ ...prev, open }))}
        onConfirm={safeDialog.type === "clear" ? handleClearData : handleDeleteAccount}
        title={safeDialog.title}
        itemName={safeDialog.itemName}
        requiredText={safeDialog.requiredText}
      />

      {/* Avatar crop modal */}
      {
        cropSrc && (
          <AvatarCropModal
            open={cropOpen}
            imageSrc={cropSrc}
            onClose={() => { setCropOpen(false); setCropSrc(null); }}
            onCropped={handleCroppedUpload}
          />
        )
      }
    </div >
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

export default function RegisterPage() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const isPasswordValid =
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    password.length >= 6;

  const isNameValid = name.trim().split(/\s+/).filter(Boolean).length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !companyName || !phone || !email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (!isNameValid) {
      toast.error("Informe nome e sobrenome");
      return;
    }
    if (!isPasswordValid) {
      toast.error("Sua senha não atende aos requisitos de segurança");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp(email, password, name, phone, companyName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Código de verificação enviado! Confira seu email.");
        setStep("otp");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpToken.length < 6) {
      toast.error("Insira o código de 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpToken, type: "signup" });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta confirmada com sucesso!");
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-10">
            <img src="/simplo-verde.png" alt="simplou." className="h-14" />
          </div>
          <h2 className="text-xl font-bold mb-2">Verifique seu email</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Enviamos um código de 6 dígitos para <span className="font-semibold text-foreground">{email}</span>.
            <br />
            <span className="text-xs mt-2 block">Não recebeu? Verifique sua pasta de <strong>Spam</strong>.</span>
          </p>
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpToken} onChange={setOtpToken}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" size="full" disabled={loading || otpToken.length < 6}>
              {loading ? "Verificando..." : "Confirmar Código"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar para o cadastro
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/simplo-verde.png" alt="simplou." className="h-14" />
        </div>

        {/* Trial banner */}
        <div className="bg-[#56CC06]/10 border border-[#56CC06]/30 rounded-xl px-4 py-3 mb-6 text-center">
          <p className="text-sm font-bold text-[#56CC06]">7 dias grátis</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sem cartão de crédito &middot; Cancele quando quiser</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-2 block">Nome completo</Label>
            <Input
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                "h-12 bg-card border-border rounded-lg px-4 transition-colors",
                name.length > 0 && !isNameValid && "border-destructive focus-visible:ring-destructive"
              )}
              autoFocus
            />
            {name.length > 0 && !isNameValid && (
              <p className="text-[10px] text-destructive mt-1.5 font-medium ml-1 flex items-center gap-1">
                <XIcon size={10} /> Informe nome e sobrenome
              </p>
            )}
          </div>

          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-2 block">Nome da empresa</Label>
            <Input
              type="text"
              placeholder="Sua empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="h-12 bg-card border-border rounded-lg px-4"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-2 block">Telefone</Label>
            <Input
              type="text"
              placeholder="(91) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              className="h-12 bg-card border-border rounded-lg px-4"
              maxLength={15}
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-2 block">Email</Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-card border-border rounded-lg px-4"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-sm font-medium mb-2 block">Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-card border-border rounded-lg pl-4 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && <PasswordRequirements password={password} />}
          </div>

          <Button
            type="submit"
            size="full"
            disabled={loading || (password.length > 0 && !isPasswordValid) || (name.length > 0 && !isNameValid)}
            className="bg-brand-primary hover:bg-brand-hover text-white mt-2"
          >
            {loading ? "Criando conta..." : "Criar conta grátis"}
          </Button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="px-4 text-sm text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button variant="outline" size="full" asChild>
          <Link to="/login">Já tenho conta</Link>
        </Button>
      </div>
    </div>
  );
}

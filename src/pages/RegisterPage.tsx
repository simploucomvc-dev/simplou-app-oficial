import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X as XIcon, ArrowLeft, Sparkles } from "lucide-react";
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
            req.met ? "bg-green-50 border-green-500 text-green-500" : "bg-slate-100 border-slate-300 text-slate-400"
          )}>
            {req.met ? <Check size={10} strokeWidth={3} /> : <XIcon size={8} strokeWidth={3} />}
          </div>
          <span className={req.met ? "text-green-600" : "text-slate-400"}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const HEADS_IMAGES = [
  { src: "/heads/1.png" },
  { src: "/heads/2.png" },
  { src: "/heads/3.png" },
  { src: "/heads/4.png" },
  { src: "/heads/5.png" },
];

function HeadsCarousel() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % HEADS_IMAGES.length);
        setFading(false);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const goTo = (index: number) => {
    if (index === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 400);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl"
        style={{ opacity: fading ? 0 : 1, transition: "opacity 0.4s ease" }}
      >
        <img
          src={HEADS_IMAGES[current].src}
          alt={`Slide ${current + 1}`}
          className="w-full h-auto object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div className="flex gap-2">
        {HEADS_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300 focus:outline-none"
            style={{
              width: i === current ? "24px" : "8px",
              height: "8px",
              background: i === current ? "#22c55e" : "#cbd5e1",
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
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
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: checkoutError } = await supabase.functions.invoke("create-checkout-session", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (checkoutError) throw checkoutError;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formColumn = (
    <div className="w-full md:w-[40%] flex flex-col items-center px-8 bg-white md:border-r border-slate-100 md:overflow-y-auto md:justify-center">
      <div className="w-full max-w-sm py-10">
        <a
          href="https://home.simplou.app.br"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          Ver landing page
        </a>

        <div className="flex justify-center mb-8">
          <img src="/simplo-verde.png" alt="simplou." className="h-12" />
        </div>

        {step === "otp" ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800 mb-1">Verifique seu email</h2>
            <p className="text-sm text-slate-500 mb-8">
              Enviamos um código de 6 dígitos para{" "}
              <span className="font-semibold text-slate-700">{email}</span>.
              <br />
              <span className="text-xs mt-2 block text-slate-400">
                Não recebeu? Verifique sua pasta de <strong>Spam</strong>.
              </span>
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
              <Button
                type="submit"
                disabled={loading || otpToken.length < 6}
                className="w-full h-11 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg"
              >
                {loading ? "Aguarde..." : "Confirmar e ir para pagamento"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Voltar para o cadastro
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Sparkles size={12} /> 7 dias grátis — sem cobrança agora
            </div>
            <h1 className="text-xl font-semibold text-slate-800 mb-1">Crie sua conta</h1>
            <p className="text-sm text-slate-500 mb-6">
              Teste grátis por 7 dias. Depois, R$19,90/mês. Cancele quando quiser.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-600 text-sm font-medium mb-2 block">Nome completo</Label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "h-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg px-4",
                    name.length > 0 && !isNameValid && "border-red-400 focus-visible:ring-red-400/20"
                  )}
                  autoFocus
                />
                {name.length > 0 && !isNameValid && (
                  <p className="text-[10px] text-red-500 mt-1.5 font-medium ml-1 flex items-center gap-1">
                    <XIcon size={10} /> Informe nome e sobrenome
                  </p>
                )}
              </div>

              <div>
                <Label className="text-slate-600 text-sm font-medium mb-2 block">Nome da empresa</Label>
                <Input
                  type="text"
                  placeholder="Sua empresa"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg px-4"
                />
              </div>

              <div>
                <Label className="text-slate-600 text-sm font-medium mb-2 block">Telefone</Label>
                <Input
                  type="text"
                  placeholder="(91) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  className="h-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg px-4"
                  maxLength={15}
                />
              </div>

              <div>
                <Label className="text-slate-600 text-sm font-medium mb-2 block">Email</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg px-4"
                />
              </div>

              <div>
                <Label className="text-slate-600 text-sm font-medium mb-2 block">Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg pl-4 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && <PasswordRequirements password={password} />}
              </div>

              <Button
                type="submit"
                disabled={loading || (password.length > 0 && !isPasswordValid) || (name.length > 0 && !isNameValid)}
                className="w-full h-11 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg mt-2"
              >
                {loading ? "Criando conta..." : "Começar 7 dias grátis"}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Já tem conta?{" "}
              <Link to="/login" className="text-green-600 hover:text-green-500 transition-colors font-medium">
                Entrar
              </Link>
            </p>
          </>
        )}
      </div>

    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-white md:overflow-hidden">
      {formColumn}

      <div
        className="hidden md:flex md:w-[60%] flex-col items-center justify-center relative"
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 60%, #ecfdf5 100%)",
        }}
      >
        <HeadsCarousel />
      </div>
    </div>
  );
}

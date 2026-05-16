import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const HEADS_IMAGES = [
  { src: "/heads/1.png", label: "1" },
  { src: "/heads/2.png", label: "2" },
  { src: "/heads/3.png", label: "3" },
  { src: "/heads/4.png", label: "4" },
  { src: "/heads/5.png", label: "5" },
];

function MobileMarquee() {
  const doubled = [...HEADS_IMAGES, ...HEADS_IMAGES];
  return (
    <div className="relative overflow-hidden py-3 md:hidden">
      {/* Fade esquerda */}
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, white, transparent)" }} />
      {/* Fade direita */}
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, white, transparent)" }} />

      <div
        className="flex gap-3"
        style={{ animation: "marquee-scroll 40s linear infinite", width: "max-content" }}
      >
        {doubled.map((img, i) => (
          <img
            key={i}
            src={img.src}
            alt={img.label}
            className="h-14 w-auto rounded-xl shadow-sm object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ))}
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

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
          alt={HEADS_IMAGES[current].label}
          className="w-full h-auto object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Dots */}
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Email ou senha incorretos");
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Coluna esquerda — Formulário */}
      <div className="w-full md:w-[40%] flex flex-col bg-white border-r border-slate-100 relative">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="mb-10">
          <img src="/simplo-verde.png" alt="simplou." className="h-12" />
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-slate-800 mb-1">Bem-vindo de volta</h1>
          <p className="text-sm text-slate-500 mb-8">Entre na sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-600 text-sm font-medium mb-2 block">Email</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg px-4 focus:border-green-500 focus:ring-green-500/20"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-600 text-sm font-medium">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-green-600 transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg pl-4 pr-10 focus:border-green-500 focus:ring-green-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Não tem conta?{" "}
            <Link to="/registro" className="text-green-600 hover:text-green-500 transition-colors font-medium">
              Cadastre-se
            </Link>
          </p>
        </div>

        {/* Botão landing page */}
        <a
          href="https://home.simplou.app.br"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-8 left-8 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={14} />
          Ver landing page
        </a>
      </div>

      {/* Marquee mobile */}
      <MobileMarquee />
      </div>

      {/* Coluna direita — Carrossel */}
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

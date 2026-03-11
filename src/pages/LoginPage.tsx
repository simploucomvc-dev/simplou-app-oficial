import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/simplou-logo.png";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error("Email ou senha incorretos");
        } else {
          navigate("/");
        }
      } else {
        if (!name) {
          toast.error("Preencha seu nome");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Conta criada! Verifique seu email para confirmar.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <div className="bg-foreground rounded-2xl p-4 px-6">
            <img src={logo} alt="simplou." className="h-8" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label className="text-muted-foreground text-sm font-medium mb-2 block">Nome completo</Label>
              <Input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-card border-border rounded-lg px-4"
              />
            </div>
          )}
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
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-card border-border rounded-lg px-4"
            />
          </div>

          <Button type="submit" size="full" disabled={loading}>
            {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
          </Button>

          {isLogin && (
            <p className="text-center">
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Esqueci minha senha
              </button>
            </p>
          )}
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="px-4 text-sm text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          variant="outline"
          size="full"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Criar nova conta" : "Já tenho conta"}
        </Button>
      </div>
    </div>
  );
}

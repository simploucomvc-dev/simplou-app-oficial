import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { trackSubscription } from "@/lib/tracking";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export default function ObrigadoPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);

  const isActive = ["active", "trialing"].includes(profile?.subscription_status ?? "");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) trackSubscription(sessionId);
  }, [searchParams]);

  // O webhook do Stripe pode levar alguns segundos pra atualizar o perfil
  useEffect(() => {
    if (!user || isActive) return;
    const interval = setInterval(refreshProfile, POLL_INTERVAL_MS);
    const timeout = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const timeout = setTimeout(() => navigate("/dashboard", { replace: true }), 3000);
    return () => clearTimeout(timeout);
  }, [isActive, navigate]);

  const ready = isActive || timedOut || !user;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-brand-light flex items-center justify-center">
            <CheckCircle2 size={36} className="text-brand-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Obrigado pela sua assinatura!</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {isActive
              ? "Pagamento confirmado. Estamos te levando para o Simplou..."
              : timedOut
                ? "Seu pagamento foi recebido e está sendo processado. Se o acesso não liberar em alguns minutos, fale com o suporte."
                : "Confirmando seu pagamento, só um instante..."}
          </p>
        </div>

        {ready ? (
          <Button
            className="w-full bg-brand-primary hover:bg-brand-hover text-white h-11"
            onClick={() => navigate(user ? "/dashboard" : "/login", { replace: true })}
          >
            {user ? "Acessar o Simplou" : "Fazer login"}
          </Button>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

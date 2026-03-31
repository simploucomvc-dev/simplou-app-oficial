import { useState } from "react";
import { Lock, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";


export default function TrialExpiredScreen() {
    const { signOut, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const isWaiting = profile?.subscription_status === "waiting";

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke("create-checkout-session", {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (error) throw error;
            if (data?.url) window.location.href = data.url;
        } catch {
            toast.error("Erro ao iniciar pagamento. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
                        <Lock size={36} className="text-destructive" />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">
                        {isWaiting ? "Complete seu cadastro" : "Acesso bloqueado"}
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                        {isWaiting
                            ? "Para começar a usar o Simplou, finalize o pagamento da sua assinatura."
                            : "Sua assinatura está inativa. Assine o Plano Simplou para continuar acessando."}
                    </p>
                </div>

                {/* Plan card */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Plano Simplou</p>
                            <p className="text-3xl font-bold mt-1">R$ 19,90<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-brand-light flex items-center justify-center">
                            <CreditCard size={20} className="text-brand-hover" />
                        </div>
                    </div>
                    <div className="space-y-2 pt-1">
                        {[
                            "Controle financeiro completo",
                            "Gestão de produtos e custos",
                            "Dashboard e relatórios",
                            "Suporte incluído",
                        ].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check size={14} className="text-brand-primary shrink-0" />
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <Button
                        className="w-full bg-brand-primary hover:bg-brand-hover text-white h-11"
                        onClick={handleSubscribe}
                        disabled={loading}
                    >
                        <CreditCard size={16} className="mr-2" />
                        {loading ? "Aguarde..." : isWaiting ? "Concluir pagamento — R$ 19,90/mês" : "Assinar agora — R$ 19,90/mês"}
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full h-11"
                        onClick={signOut}
                    >
                        Sair da conta
                    </Button>
                </div>
            </div>
        </div>
    );
}

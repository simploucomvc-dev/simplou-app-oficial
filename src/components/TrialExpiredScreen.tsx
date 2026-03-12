import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function TrialExpiredScreen() {
    const { signOut } = useAuth();

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
                        Período de teste encerrado
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                        Seu período de teste de <strong>7 dias</strong> expirou. Para continuar
                        usando o Simplou, entre em contato conosco para assinar um plano.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                            <Mail size={18} className="text-brand-hover" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Fale conosco</p>
                            <p className="text-xs text-muted-foreground">simplou@suporte.com.br</p>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Nossa equipe está pronta para ajudá-lo a escolher o plano ideal para o seu negócio.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <Button
                        className="w-full bg-brand-primary hover:bg-brand-hover text-white h-11"
                        onClick={() => window.open("mailto:simplou@suporte.com.br", "_blank")}
                    >
                        <Mail size={16} className="mr-2" />
                        Entrar em contato
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

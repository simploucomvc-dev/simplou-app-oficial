import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export function SafeDeleteDialog({ open, onOpenChange, onConfirm, title, itemName, requiredText = "excluir" }: any) {
    const [confirmText, setConfirmText] = useState("");
    const isValid = confirmText.toLowerCase() === requiredText.toLowerCase();

    return (
        <AlertDialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setConfirmText(""); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                        {title || "Aviso: Exclusão Permanente"}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="flex flex-col gap-2">
                            <p className="font-semibold text-foreground my-2 bg-muted p-2 rounded-md">{itemName}</p>
                            <p>Esta ação não pode ser desfeita. Para confirmar, digite abaixo a palavra <strong className="text-foreground">{requiredText}</strong>:</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={`Digite ${requiredText} para confirmar...`}
                    className="border-destructive/50 focus-visible:ring-destructive"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!isValid}
                        onClick={onConfirm}
                        className="bg-destructive hover:bg-destructive/90 text-white transition-opacity disabled:opacity-50"
                    >
                        Confirmar Exclusão
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

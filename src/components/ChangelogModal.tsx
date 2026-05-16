import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Wrench, Star } from "lucide-react";
import type { Changelog, ChangelogItem } from "@/hooks/use-changelog";

interface Props {
  changelog: Changelog;
  onClose: () => void;
}

const categoryConfig = {
  feature: { label: "Novidade", icon: Star, className: "bg-brand-light text-brand-hover" },
  improvement: { label: "Melhoria", icon: Zap, className: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  fix: { label: "Correção", icon: Wrench, className: "bg-muted text-muted-foreground" },
};

function ChangelogItemRow({ item }: { item: ChangelogItem }) {
  const config = categoryConfig[item.category] ?? categoryConfig.improvement;
  const Icon = config.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${config.className}`}>
        <Icon size={9} /> {config.label}
      </span>
      <p className="text-sm text-foreground leading-snug">{item.text}</p>
    </div>
  );
}

export default function ChangelogModal({ changelog, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-[95vw] p-0 rounded-2xl overflow-hidden flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="bg-brand-primary px-6 pt-6 pb-5 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-white/80" />
            <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">Versão {changelog.version}</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold leading-snug">
              {changelog.title}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {changelog.items.map((item, i) => (
            <ChangelogItemRow key={i} item={item} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          <Button className="w-full bg-brand-primary hover:bg-brand-hover text-white" onClick={onClose}>
            Entendi, vamos lá!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

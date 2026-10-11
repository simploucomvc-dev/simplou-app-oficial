import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Miniatura da capa; sem foto (ou enquanto o link não chega) mostra o ícone do produto
export default function ProductCover({
  src,
  Icon,
  className,
  iconSize = 18,
}: {
  src?: string;
  Icon: LucideIcon;
  className?: string;
  iconSize?: number;
}) {
  return (
    <div className={cn("rounded-xl bg-brand-light flex items-center justify-center shrink-0 overflow-hidden", className)}>
      {src ? (
        <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <Icon size={iconSize} className="text-brand-hover" />
      )}
    </div>
  );
}

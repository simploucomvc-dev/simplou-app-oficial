import { GraduationCap } from "lucide-react";
import { startOnboarding } from "@/lib/onboarding";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function OnboardingButton({ className, side = "left" }: Props) {
  const location = useLocation();

  if (location.pathname !== "/dashboard") {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={startOnboarding}
            aria-label="Repetir tour de boas-vindas"
            className={cn(
              "z-50 h-9 w-9 rounded-full flex items-center justify-center bg-card border border-border shadow-sm hover:shadow-md hover:border-brand-primary text-muted-foreground hover:text-brand-hover transition-all duration-200 shrink-0",
              className
            )}
          >
            <GraduationCap className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p>Repetir tour de boas-vindas</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

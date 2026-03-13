import { ArrowRightLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export function QuickActionButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (location.pathname === "/financeiro") {
      navigate("/financeiro?new=1", { replace: true });
    } else {
      navigate("/financeiro?new=1");
    }
  };

  return (
    <button
      id="quick-action-button"
      onClick={handleClick}
      aria-label="Nova operação"
      className="
        fixed
        bottom-4 right-4
        sm:bottom-6 sm:right-6
        z-50
        h-14 w-14
        rounded-full
        flex items-center justify-center
        shadow-lg hover:shadow-xl
        bg-brand-primary hover:bg-brand-hover
        text-white
        transition-all duration-200
        hover:scale-110
      "
    >
      <ArrowRightLeft className="h-6 w-6" />
    </button>
  );
}

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, ArrowLeftRight, Settings, Menu, X, LogOut } from "lucide-react";
import logo from "@/assets/simplou-logo.png";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/operacoes", label: "Operações", icon: ArrowLeftRight },
  { to: "/configuracoes", label: "", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="bg-foreground rounded-lg p-2 px-3">
            <img src={logo} alt="simplou." className="h-5" />
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-foreground text-card"
                      : "text-muted-foreground hover:bg-accent"
                  )
                }
              >
                <item.icon size={16} />
                {item.label || "Config"}
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
            >
              <LogOut size={16} />
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden border-t border-border bg-card px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-foreground text-card"
                      : "text-muted-foreground hover:bg-accent"
                  )
                }
              >
                <item.icon size={18} />
                {item.label || "Configurações"}
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-destructive hover:bg-accent transition-colors"
            >
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        )}
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

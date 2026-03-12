import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
  User,
  ShieldCheck,
  Clock,
  Handshake,
} from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos e Serviços", icon: Package },
  { to: "/operacoes", label: "Operações", icon: ArrowLeftRight },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function RoleBadge({ role }: { role: string | undefined }) {
  if (role === "super_admin") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <ShieldCheck size={10} /> Administrador
      </span>
    );
  }
  if (role === "partner") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-light text-brand-hover">
        <Handshake size={10} /> Parceiro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      <Clock size={10} /> Período de Teste
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-expanded") !== "false";
    }
    return true;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleExpanded = () => {
    setExpanded((prev) => {
      localStorage.setItem("sidebar-expanded", String(!prev));
      return !prev;
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const avatarUrl = profile?.profile_photo_url;
  const displayName = profile?.name || user?.email || "";
  const firstLetter = displayName.charAt(0).toUpperCase();

  const Avatar = ({ size = 36 }: { size?: number }) => (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 overflow-hidden",
        !avatarUrl && "bg-brand-light"
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
      ) : (
        <span className="text-brand-hover font-bold" style={{ fontSize: size * 0.4 }}>
          {firstLetter}
        </span>
      )}
    </div>
  );

  const UserMenu = () => (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-accent transition-colors"
        title={displayName}
      >
        <Avatar size={34} />
        {(expanded || isMobile) && (
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-semibold truncate leading-tight">{profile?.name || "Usuário"}</p>
            <RoleBadge role={profile?.role} />
          </div>
        )}
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className={cn(
              "absolute z-50 bg-card border border-border rounded-xl shadow-lg py-1.5 min-w-[180px]",
              isMobile ? "bottom-full mb-2 left-0" : expanded ? "bottom-full mb-2 left-0" : "left-full bottom-0 ml-3"
            )}
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-xs font-semibold truncate">{profile?.name || user?.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); navigate("/configuracoes"); isMobile && setMobileOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <Settings size={14} /> Configurações
            </button>
            <button
              onClick={() => { setMenuOpen(false); navigate("/ajuda"); isMobile && setMobileOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <HelpCircle size={14} /> Ajuda
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => { setMenuOpen(false); handleSignOut(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </>
      )}
    </div>
  );

  const sidebarContent = (mobile = false) => (
    <div className="flex flex-col h-full">
      {/* Top: Logo + toggle */}
      <div className="flex items-center justify-between border-b border-border h-14 px-3 shrink-0">
        {(expanded || mobile) ? (
          <img src="/simplo-verde.png" alt="simplou" className="h-8" />
        ) : (
          <img src="/simplo-verde.png" alt="simplou" className="h-6 w-6 object-contain" />
        )}
        {!mobile && (
          <button
            onClick={toggleExpanded}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        )}
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-brand-light text-brand-hover font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                !expanded && !mobile && "justify-center px-2"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={cn("shrink-0", isActive ? "text-brand-hover" : "text-muted-foreground")}
                />
                {(expanded || mobile) && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Help link */}
        <NavLink
          to="/ajuda"
          onClick={() => mobile && setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-brand-light text-brand-hover font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              !expanded && !mobile && "justify-center px-2"
            )
          }
        >
          {({ isActive }) => (
            <>
              <HelpCircle
                size={18}
                className={cn("shrink-0", isActive ? "text-brand-hover" : "text-muted-foreground")}
              />
              {(expanded || mobile) && <span>Ajuda</span>}
            </>
          )}
        </NavLink>
      </nav>

      {/* Bottom: User avatar + mini menu */}
      <div className="border-t border-border px-2 py-3 shrink-0">
        <UserMenu />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            "fixed left-0 top-0 h-full bg-card border-r border-border z-30 transition-all duration-300 overflow-hidden",
            expanded ? "w-60" : "w-[72px]"
          )}
        >
          {sidebarContent()}
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50">
            {sidebarContent(true)}
          </aside>
        </>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-30 flex items-center justify-between px-4">
          {/* Hambúrguer à ESQUERDA no mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <Menu size={20} />
          </button>
          <img src="/simplo-verde.png" alt="simplou" className="h-8" />
          {/* Avatar no canto direito no mobile top bar */}
          <button onClick={() => setMenuOpen((v) => !v)} className="relative">
            <Avatar size={32} />
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-xl shadow-lg py-1.5 min-w-[180px]">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-semibold truncate">{profile?.name || user?.email}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    <div className="mt-1"><RoleBadge role={profile?.role} /></div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/configuracoes"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <Settings size={14} /> Configurações
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/ajuda"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <HelpCircle size={14} /> Ajuda
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => { setMenuOpen(false); handleSignOut(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                  >
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              </>
            )}
          </button>
        </header>
      )}

      {/* Main content */}
      <main
        className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          isMobile ? "pt-14" : expanded ? "ml-60" : "ml-[72px]"
        )}
      >
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

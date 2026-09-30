import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, ArrowLeftRight, Users, Receipt, Scale,
  BarChart3, History, LogOut, Menu, X
} from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/", label: "Genel Bakış", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/transferler", label: "Para Transferleri", icon: ArrowLeftRight, testid: "nav-transfers" },
  { to: "/muvekkiller", label: "Müvekkil Hesapları", icon: Users, testid: "nav-clients" },
  { to: "/masraflar", label: "Masraflar", icon: Receipt, testid: "nav-expenses" },
  { to: "/alacaklar", label: "Vekalet Alacakları", icon: Scale, testid: "nav-receivables" },
  { to: "/raporlar", label: "Raporlar & Analiz", icon: BarChart3, testid: "nav-reports" },
  { to: "/hareketler", label: "İşlem Günlüğü", icon: History, testid: "nav-ledger" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav_ = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = () => { logout(); nav_("/giris"); };

  const Sidebar = () => (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <Scale className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-serif-legal text-xl tracking-tight text-slate-900">LexKasa</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-amber-800 font-semibold">Hukuk Muhasebe</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            data-testid={n.testid}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <n.icon className="w-4 h-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <div className="px-3 py-2 mb-2">
          <div className="text-xs text-slate-500">Oturum</div>
          <div className="text-sm font-medium text-slate-900 truncate">{user?.name || user?.email}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={doLogout}
          data-testid="logout-button"
          className="w-full justify-start text-slate-600 hover:text-slate-900"
        >
          <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="hidden lg:block"><Sidebar /></div>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center">
            <Scale className="w-4 h-4 text-amber-300" />
          </div>
          <span className="font-serif-legal text-lg">LexKasa</span>
        </div>
        <button onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle" className="p-2">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 top-14 z-30 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white h-full w-64" onClick={(e) => e.stopPropagation()}><Sidebar /></div>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

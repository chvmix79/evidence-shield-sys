import { useState } from "react";
import { hardCacheClear } from "@/lib/safeCacheClear";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, LayoutDashboard, Building2, AlertTriangle, ClipboardList,
  FileText, Bell, BarChart3, LogOut, Menu, X, ChevronRight, Eye, Webhook,
  RefreshCw, ShieldAlert, CreditCard, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SecuritySettings } from "./SecuritySettings";
import { useCompany } from "@/contexts/CompanyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBoundary } from "./ErrorBoundary";
import chvLogo from "@/assets/CHV_Logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";


const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Empresas", href: "/companies", icon: Building2 },
  { label: "Riesgos", href: "/risks", icon: AlertTriangle },
  { label: "Plan de Acción", href: "/actions", icon: ClipboardList },
  { label: "Evidencias", href: "/evidences", icon: FileText, plans: ["professional", "enterprise"] as const },
  { label: "Alertas", href: "/alerts", icon: Bell },
  { label: "Reportes", href: "/reports", icon: BarChart3, plans: ["professional", "enterprise"] as const },
  { label: "Ciberseguridad", href: "/inventory", icon: Shield, plans: ["enterprise"] as const },
  { label: "Integraciones", href: "/webhooks", icon: Webhook, roles: ["admin", "superadmin"] as const, plans: ["enterprise"] as const },
  { label: "Auditor", href: "/auditor", icon: Eye, roles: ["auditor", "superadmin"] as const, plans: ["professional", "enterprise"] as const },
  { label: "Super Admin", href: "/superadmin", icon: Shield, roles: ["superadmin"] as const },
  { label: "Logs Auditoría", href: "/audit", icon: ClipboardList, roles: ["superadmin"] as const },
];

function CompanySelector() {
  const { selectedCompanyId, setSelectedCompanyId, companies } = useCompany();
  
  if (companies.length === 0) return null;

  return (
    <div className="px-4 py-2 mb-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 opacity-40 px-2" style={{ color: "hsl(var(--sidebar-foreground))" }}>
        Empresa Seleccionada
      </p>
      <Select value={selectedCompanyId || ""} onValueChange={setSelectedCompanyId}>
        <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground h-9 text-xs">
          <SelectValue placeholder="Seleccionar empresa" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c: any) => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SidebarContent({ user, role, signOut, setSidebarOpen, location }: any) {
  const { selectedCompanyId, companies } = useCompany();
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            <img src={chvLogo} alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <p className="text-sm font-black leading-tight tracking-tight text-white">
              CHV RiskInsight
            </p>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              AI Powered
            </p>
          </div>
        </div>
      </div>

      <ErrorBoundary variant="mini">
        <CompanySelector />
      </ErrorBoundary>

      {/* Navigation */}
      <ErrorBoundary variant="mini">
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 px-3" style={{ color: "hsl(var(--sidebar-foreground) / 0.4)" }}>
            Menú Principal
          </p>
          {navItems.filter(item => {
            // Simplificación absoluta: Si eres admin o superadmin, ves todo.
            if (role === "superadmin" || role === "admin" || user?.email === 'chvmix79@gmail.com') return true;
            
            // Si el ítem tiene roles específicos, verificamos
            if (item.roles && !item.roles.includes(role as any)) return false;
            
            return true;
          }).map(({ label, href, icon: Icon }) => {
            try {
              const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn("sidebar-nav-item group", isActive && "active")}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              );
            } catch (e) {
              return null; // Skip broken nav items
            }
          })}
        </nav>
      </ErrorBoundary>

      {/* User info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--sidebar-accent))" }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
                {user?.email?.split("@")[0] ?? "Usuario"}
              </p>
              <p className="text-xs truncate" style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}>
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-sidebar-border/30">
            <SecuritySettings />
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-[11px] hover:bg-orange-500/10 hover:text-orange-500"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}
              onClick={() => {
                const qc = (window as any).__QUERY_CLIENT__;
                if (qc) qc.clear();
                window.location.reload();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>⚡ Reparar Vista</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-[11px]"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}
              onClick={() => {
                hardCacheClear();
                window.location.href = "/auth";
              }}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Restablecimiento Total</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-[11px] hover:bg-blue-500/10 hover:text-blue-500"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}
              onClick={async () => {
                toast({ title: "Iniciando diagnóstico...", description: "Probando conexión con el servidor de datos..." });
                try {
                  const start = Date.now();
                  const { error } = await supabase.from("companies").select("id", { count: "exact", head: true });
                  const duration = Date.now() - start;
                  if (error) throw error;
                  toast({ title: "Conexión Exitosa", description: `El servidor respondió en ${duration}ms. La red está operativa.`, variant: "default" });
                } catch (err: any) {
                  console.error("Diagnostic Error:", err);
                  toast({ 
                    title: "Red Bloqueada", 
                    description: "Tu red local está impidiendo la conexión con la base de datos. Por favor, usa una VPN o cambia de red.", 
                    variant: "destructive" 
                  });
                }
              }}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Diagnóstico de Red</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-[11px]"
              style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut, subscription } = useAuth();
  const { loading: authLoading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // PANTALLA DE BLOQUEO (Solo para usuarios normales)
  const isSuperAdmin = role === 'superadmin' || user?.email === 'chvmix79@gmail.com';
  
  if (subscription?.isBlocked && !isSuperAdmin) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[9999] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-red-50/50">
            <CreditCard className="w-10 h-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900">Aplicación Bloqueada</h1>
            <p className="text-slate-500">Tu suscripción ha vencido y el periodo de gracia de 48 horas ha finalizado.</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-600">
            Para recuperar el acceso, por favor contacta al administrador del sistema para la renovación de tu plan.
          </div>
          <Button onClick={() => signOut()} variant="outline" className="w-full h-12 rounded-xl">
            Cerrar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-64 flex-shrink-0 flex-col h-full"
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <ErrorBoundary variant="mini" fallback={<div className="p-10 text-destructive text-xs">Error en Navegación. <Button onClick={() => window.location.reload()} size="sm" variant="link">Recargar</Button></div>}>
          <SidebarContent user={user} role={role} signOut={signOut} setSidebarOpen={setSidebarOpen} location={location} />
        </ErrorBoundary>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside
            className="relative w-64 h-full flex flex-col"
            style={{ background: "hsl(var(--sidebar-background))" }}
          >
            <button
              className="absolute top-4 right-4"
              style={{ color: "hsl(var(--sidebar-foreground))" }}
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <ErrorBoundary variant="mini">
              <SidebarContent user={user} role={role} signOut={signOut} setSidebarOpen={setSidebarOpen} location={location} />
            </ErrorBoundary>
          </aside>
        </div>
      ) : null}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
        
        {/* GRACE PERIOD BANNER */}
        {subscription?.isGracePeriod && role !== 'superadmin' && (
          <div className="bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-3 text-sm font-bold animate-in slide-in-from-top duration-500 relative z-50">
            <AlertTriangle className="w-4 h-4" />
            Plan Vencido. Tienes un periodo de gracia de 48h para realizar el pago antes del bloqueo.
            <Button variant="link" className="text-white underline p-0 h-auto font-black">Pagar Ahora</Button>
          </div>
        )}

        {/* 7 DAYS REMINDER */}
        {subscription && !subscription.isGracePeriod && (subscription.daysRemaining ?? 0) <= 7 && (subscription.daysRemaining ?? 0) > 0 && role !== 'superadmin' && (
          <div className="bg-primary text-white py-2 px-4 flex items-center justify-center gap-3 text-sm font-medium animate-in slide-in-from-top duration-500 relative z-50">
            <Info className="w-4 h-4" />
            Tu plan expira en {subscription.daysRemaining} {subscription.daysRemaining === 1 ? 'día' : 'días'}. ¡Renueva pronto!
          </div>
        )}

        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <img src={chvLogo} alt="Logo" className="w-6 h-6 object-contain bg-white rounded-lg p-0.5" />
            <span className="font-bold text-sm text-primary">Risk Manager</span>
          </div>
          <div className="w-5" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto relative h-full bg-slate-50/50">
          <ErrorBoundary resetKey={location.pathname}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

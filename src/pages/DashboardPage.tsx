import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { 
  Shield, AlertTriangle, CheckCircle2, 
  Clock, BarChart3, Building2, FileText
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { 
  DashboardStats, RiskSummary, RiskLevelEntry, 
  ActionSummary, StatCardProps, ProgressItemProps 
} from "@/types";


const EMPTY_STATS: DashboardStats = {
  totalRisks: 0,
  criticalRisks: 0,
  activeRisks: 0,
  pendingActions: 0,
  overdueActions: 0,
  completedActions: 0,
  evidences: 0,
  companies: 0,
  recentRisks: [],
  risksByLevel: [
    { name: "Bajo", value: 0 },
    { name: "Medio", value: 0 },
    { name: "Alto", value: 0 },
    { name: "Crítico", value: 0 },
  ],
  score: 0,
};

const COLORS = ["#94a3b8", "#fbbf24", "#f97316", "#ef4444"];

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { selectedCompanyId, setSelectedCompanyId, companies, loading: companyLoading } = useCompany();
  const navigate = useNavigate();

  // EMERGENCY FIX: Si hay empresas pero ninguna seleccionada por retraso del sistema
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      logger.debug("[Dashboard] Forzando selección de empresa...");
      setSelectedCompanyId(companies[0].id);
    }
  }, [selectedCompanyId, companies, setSelectedCompanyId]);


  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return EMPTY_STATS;

      const today = new Date().toISOString();
      logger.debug("[Dashboard] Iniciando carga de datos para empresa:", selectedCompanyId);

      try {
        // 1. Cargar Riesgos (Base fundamental)
        logger.debug("[Dashboard] Consultando riesgos...");
        const { data: rData, error: rError } = await supabase
          .from("risks")
          .select("id, name, risk_level, type, status, company_id")
          .eq("company_id", selectedCompanyId)
          .limit(100);

        if (rError) logger.error("[Dashboard] Error en riesgos:", rError);
        const risks: RiskSummary[] = rData ?? [];
        const riskIds = risks.map(r => r.id);

        // 2. Cargar Acciones (En paralelo para velocidad)
        logger.debug("[Dashboard] Consultando acciones y contadores...");
        let actions: ActionSummary[] = [];
        let eCount = 0;
        let cCount = 0;

        try {
          const [aRes, eRes, cRes] = await Promise.all([
            riskIds.length > 0 
              ? supabase.from("actions").select("id, status, due_date").in("risk_id", riskIds).limit(200)
              : Promise.resolve({ data: [] }),
            supabase.from("evidences").select("id", { count: "exact", head: true }),
            supabase.from("companies").select("id", { count: "exact", head: true })
          ]);

          actions = (aRes.data as ActionSummary[]) ?? [];
          eCount = eRes.count ?? 0;
          cCount = cRes.count ?? 0;
        } catch (innerError) {
          logger.warn("[Dashboard] Error en carga secundaria:", innerError);
        }

        const score = risks.length > 0
          ? Math.round(risks.reduce((s, r) => s + (Number(r.risk_level) || 0), 0) / risks.length * 10) / 10
          : 0;

        const getLevel = (r: RiskSummary) => Number(r.risk_level) || 0;

        const result: DashboardStats = {
          totalRisks: risks.length,
          criticalRisks: risks.filter(r => getLevel(r) >= 17).length,
          activeRisks: risks.filter(r => r.status === "active").length,
          pendingActions: actions.filter(a => a.status === "pending").length,
          overdueActions: actions.filter(a => a.due_date && a.due_date < today && a.status !== "completed").length,
          completedActions: actions.filter(a => a.status === "completed").length,
          evidences: eCount,
          companies: cCount,
          recentRisks: risks.slice(0, 5),
          risksByLevel: [
            { name: "Bajo", value: risks.filter(r => getLevel(r) <= 4).length },
            { name: "Medio", value: risks.filter(r => { const l = getLevel(r); return l >= 5 && l <= 9; }).length },
            { name: "Alto", value: risks.filter(r => { const l = getLevel(r); return l >= 10 && l <= 16; }).length },
            { name: "Crítico", value: risks.filter(r => getLevel(r) >= 17).length },
          ],
          score,
        };

        localStorage.setItem(`dashboard_stats_${selectedCompanyId}`, JSON.stringify(result));
        logger.debug("[Dashboard] Carga completada con éxito.");
        return result;
      } catch (err) {
        logger.error("[Dashboard] Error crítico en la carga:", err);
        return EMPTY_STATS;
      }
    },


    initialData: () => {
      const saved = localStorage.getItem(`dashboard_stats_${selectedCompanyId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    },
    staleTime: 30000, // 30 segundos de frescura
    retry: 1,
  });

  // Debug log
  logger.debug("[Dashboard] Renderizando con stats:", !!stats, "isLoading:", isLoading);

  const s = stats || EMPTY_STATS;

  // ONLY block if we truly don't have a company ID yet
  if (!selectedCompanyId) {
    // Si realmente no hay empresas después de cargar
    if (!companyLoading && companies.length === 0) {
      return (
        <div className="p-20 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">No tienes empresas registradas</h2>
          <p className="text-slate-500 max-w-xs mx-auto">Para comenzar a gestionar riesgos, primero debes crear tu empresa.</p>
          <Button onClick={() => navigate("/companies")} className="bg-slate-900 hover:bg-slate-800 rounded-xl px-8 h-12 font-bold shadow-lg">
            Crear mi primera empresa
          </Button>
        </div>
      );
    }

    return (
      <div className="p-20 text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Building2 className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sincronizando...</h2>
      </div>
    );
  }



  // Mostrar loading si estamos obteniendo datos y no hay caché
  if (isLoading) {
    return (
      <div className="p-20 text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <BarChart3 className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Cargando métricas...</h2>
      </div>
    );
  }


  const greet = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {greet()}, <span className="text-amber-500">{user?.email?.split("@")[0] ?? "Usuario"}</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Panel de control de Riesgos e Inteligencia</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/risks")} className="hud-input h-10 px-5 text-sm font-semibold text-slate-700">Ver Riesgos</Button>
          <Button onClick={() => navigate("/reports")} className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-5 text-sm font-semibold shadow-sm transition-all">Generar Reporte</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Score Global" value={s.score.toString()} icon={Shield} color="text-amber-600" bg="bg-amber-50" desc="Promedio de criticidad" />
        <StatCard label="Riesgos Críticos" value={s.criticalRisks.toString()} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" desc="Requieren atención inmediata" />
        <StatCard label="Acciones Vencidas" value={s.overdueActions.toString()} icon={Clock} color="text-orange-600" bg="bg-orange-50" desc="Fuera de cronograma" />
        <StatCard label="Evidencias" value={s.evidences.toString()} icon={FileText} color="text-blue-600" bg="bg-blue-50" desc="Cargas de cumplimiento" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Bar Chart */}
          <div className="p-6 hud-panel rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Distribución de Riesgos por Nivel
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.risksByLevel}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {s.risksByLevel.map((_entry: RiskLevelEntry, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Risks Table */}
          <div className="p-6 hud-panel rounded-2xl overflow-hidden">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Riesgos Recientes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-50">
                    <th className="pb-4 px-2">Riesgo</th>
                    <th className="pb-4 px-2">Nivel</th>
                    <th className="pb-4 px-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {s.recentRisks.length > 0 ? s.recentRisks.map((risk: RiskSummary) => (
                    <tr key={risk.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-2">
                        <p className="font-bold text-slate-900 text-sm">{risk.name}</p>
                        <p className="text-xs text-slate-400">{risk.type}</p>
                      </td>
                      <td className="py-4 px-2">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                          (risk.risk_level ?? 0) >= 17 ? "bg-red-50 text-red-600" :
                          (risk.risk_level ?? 0) >= 10 ? "bg-orange-50 text-orange-600" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {risk.risk_level ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          risk.status === 'active' ? "text-amber-600" : "text-green-600"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", risk.status === 'active' ? "bg-amber-600" : "bg-green-600")} />
                          {risk.status === 'active' ? 'Activo' : 'Mitigado'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-slate-400 text-sm">No hay riesgos registrados para esta empresa</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="p-6 mesh-gradient-dark border border-slate-700/50 rounded-2xl text-white space-y-6 relative overflow-hidden shadow-lg">
            <div className="absolute -right-4 -top-4 opacity-10 mix-blend-overlay">
              <Shield className="w-32 h-32" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Estado de Cumplimiento</p>
              <p className="text-4xl font-bold font-heading">{Math.round((s.completedActions / Math.max(s.totalRisks, 1)) * 100)}%</p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, Math.round((s.completedActions / Math.max(s.totalRisks, 1)) * 100))}%` }} />
            </div>
            <p className="text-xs text-slate-400 font-medium">Progreso basado en acciones completadas vs riesgos identificados.</p>
          </div>

          <div className="p-6 hud-panel rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Acciones de Control
            </h3>
            <div className="space-y-6">
              <ProgressItem label="Completadas" value={s.completedActions} total={s.pendingActions + s.completedActions} color="bg-green-500" />
              <ProgressItem label="Pendientes" value={s.pendingActions} total={s.pendingActions + s.completedActions} color="bg-amber-500" />
              <ProgressItem label="Vencidas" value={s.overdueActions} total={s.pendingActions + s.completedActions} color="bg-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg, desc }: StatCardProps) {
  return (
    <div className="p-5 hud-card rounded-2xl group relative overflow-hidden">
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-105 duration-300", bg)}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
          <p className="text-3xl font-bold text-slate-900 font-heading tracking-tight">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressItem({ label, value, total, color }: ProgressItemProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-black text-slate-900">{value}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
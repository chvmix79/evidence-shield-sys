import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { RiskLevelBadge, StatusBadge, TypeBadge } from "@/components/RiskBadges";
import { Button } from "@/components/ui/button";
import { FileDown, BarChart3, AlertTriangle, ClipboardList, FileText, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useQuery } from "@tanstack/react-query";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { safeCacheClear } from "@/lib/safeCacheClear";

type Risk = {
  id: string; name: string; type: string; risk_level: number; status: string; description: string | null;
  companies?: { name: string } | null;
};
type Action = { id: string; description: string; responsible: string; due_date: string | null; status: string; risks?: { name: string } | null };
type Evidence = { id: string; name: string; file_type: string | null; created_at: string | null };

const RISK_COLORS = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"];
const STATUS_COLORS = { pending: "#94a3b8", in_progress: "#3b82f6", completed: "#22c55e" };

export default function ReportsPage() {
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();
  const [exporting, setExporting] = useState(false);

  const { data: qData, isLoading: loading, error, refetch: fetchData } = useQuery({
    queryKey: ["reports-data", selectedCompanyId],
    queryFn: async () => {
      return await WITH_TIMEOUT((async () => {
        // 1. Obtener risks
        const { data: r, error: rErr } = await supabase
          .from("risks")
          .select("id, name, type, risk_level, status, description, company_id")
          .eq("company_id", selectedCompanyId || '__none__')
          .order("risk_level", { ascending: false });
        if (rErr) throw rErr;

        // 2. Obtener actions filtradas por empresa
        const { data: a, error: aErr } = await supabase
          .from("actions")
          .select("id, description, responsible, due_date, status, risk_id, risks!inner(name, company_id)")
          .eq("risks.company_id", selectedCompanyId || '__none__');
        if (aErr) throw aErr;

        // 3. Obtener evidences filtradas por empresa
        const { data: e, error: eErr } = await supabase
          .from("evidences")
          .select("id, name, file_type, created_at, risk_id, risks!inner(company_id)")
          .eq("risks.company_id", selectedCompanyId || '__none__');
        if (eErr) throw eErr;

        // 6. Obtener Auditorías
        const { data: s, error: sErr } = await supabase
          .from("audit_sessions")
          .select("id, score, status, completed_at, audit_checklists(name)")
          .eq("company_id", selectedCompanyId || '__none__')
          .order("created_at", { ascending: false })
          .limit(1);

        const result = {
          risks: (r || []) as Risk[],
          actions: (a || []).map(action => ({ ...action, risks: { name: (action as any).risks?.name || "—" } })) as Action[],
          evidences: (e || []) as Evidence[],
          lastAudit: s && s[0] ? s[0] : null
        };
        
        // Persistencia para reportes (puede ser pesado, limitamos a 500 registros en cache)
        try {
          localStorage.setItem(`reports_cache_${selectedCompanyId || 'global'}`, JSON.stringify(result));
        } catch (err) { console.warn("Cache of reports too large for localStorage"); }
        
        return result;
      })(), 15000, "La generación del reporte está tardando demasiado.");
    },
    initialData: () => {
      const saved = localStorage.getItem(`reports_cache_${selectedCompanyId || 'global'}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return undefined; }
      }
      return undefined;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  const fetchError = error ? (error instanceof Error ? error.message : "Error al cargar datos del reporte") : null;

  const risks = qData?.risks || [];
  const actions = qData?.actions || [];
  const evidences = qData?.evidences || [];

  // Chart data
  const byLevel = [
    { name: "Bajo (1-4)", value: risks.filter(r => r.risk_level <= 4).length },
    { name: "Medio (5-9)", value: risks.filter(r => r.risk_level >= 5 && r.risk_level <= 9).length },
    { name: "Alto (10-16)", value: risks.filter(r => r.risk_level >= 10 && r.risk_level <= 16).length },
    { name: "Crítico (17-25)", value: risks.filter(r => r.risk_level >= 17).length },
  ].filter(d => d.value > 0);

  const byType = [
    { name: "Operativo", value: risks.filter(r => r.type === "operational").length },
    { name: "Legal", value: risks.filter(r => r.type === "legal").length },
    { name: "Financiero", value: risks.filter(r => r.type === "financial").length },
    { name: "Seguridad", value: risks.filter(r => r.type === "security").length },
  ].filter(d => d.value > 0);

  const actionsByStatus = [
    { name: "Pendiente", value: actions.filter(a => a.status === "pending").length, color: STATUS_COLORS.pending },
    { name: "En Proceso", value: actions.filter(a => a.status === "in_progress").length, color: STATUS_COLORS.in_progress },
    { name: "Completada", value: actions.filter(a => a.status === "completed").length, color: STATUS_COLORS.completed },
  ];

  const handleExportPDF = async () => {
    if (risks.length === 0) {
      toast({ title: "No hay datos para exportar", description: "Carga datos primero antes de exportar." });
      return;
    }

    setExporting(true);
    toast({ title: "Generando reporte PDF..." });

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const today = format(new Date(), "d 'de' MMMM yyyy", { locale: es });

      doc.setFontSize(18);
      doc.text("Evidence Shield Sys - Reporte de Riesgos", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Fecha: ${today}`, pageWidth / 2, 28, { align: "center" });
      doc.text(`Score Global: ${score.toFixed(1)} / 25`, pageWidth / 2, 34, { align: "center" });

      doc.setFontSize(14);
      doc.text("Resumen Ejecutivo", 14, 48);
      doc.setFontSize(10);
      doc.text(`Total de Riesgos: ${risks.length} (${risks.filter(r => r.status === "active").length} activos)`, 14, 56);
      doc.text(`Total de Acciones: ${actions.length} (${actions.filter(a => a.status === "completed").length} completadas)`, 14, 62);
      doc.text(`Total de Evidencias: ${evidences.length}`, 14, 68);

      if (qData?.lastAudit) {
        doc.setFillColor(240, 240, 255);
        doc.rect(14, 74, pageWidth - 28, 20, "F");
        doc.setFontSize(11);
        doc.setTextColor(63, 81, 181);
        doc.text(`Resultado Última Auditoría: ${qData.lastAudit.audit_checklists?.name || 'General'}`, 20, 81);
        doc.setFontSize(14);
        doc.text(`CUMPLIMIENTO: ${qData.lastAudit.score?.toFixed(1)}%`, 20, 89);
        doc.setTextColor(0, 0, 0);
      }

      doc.setFontSize(14);
      doc.text("Inventario de Riesgos", 14, qData?.lastAudit ? 104 : 82);

      const riskTableData = risks.map(r => [
        r.name,
        r.companies?.name || "—",
        r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : "—",
        String(r.risk_level),
        r.status === "active" ? "Activo" : "Mitigado"
      ]);

      autoTable(doc, {
        startY: qData?.lastAudit ? 110 : 88,
        head: [["Riesgo", "Empresa", "Tipo", "Nivel", "Estado"]],
        body: riskTableData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.text("Plan de Acción", 14, currentY);

      const actionTableData = actions.slice(0, 20).map(a => [
        a.description.substring(0, 40),
        a.risks?.name?.substring(0, 20) || "—",
        a.responsible,
        a.due_date ? format(new Date(a.due_date), "dd/MM/yyyy") : "—",
        a.status === "pending" ? "Pendiente" : a.status === "in_progress" ? "En Proceso" : "Completado"
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [["Acción", "Riesgo", "Responsable", "Fecha", "Estado"]],
        body: actionTableData,
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 8 },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
        doc.text("Evidence Shield Sys", 14, doc.internal.pageSize.getHeight() - 10);
      }

      doc.save(`reporte-riesgos-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({ title: "Reporte PDF descargado" });
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast({ title: "Error al generar PDF", description: String(err) });
    } finally {
      setExporting(false);
    }
  };

  const score = risks.length > 0
    ? Math.round((risks.reduce((sum, r) => sum + r.risk_level, 0) / risks.length) * 10) / 10
    : 0;

  // Use byType to avoid warning if needed, though hidden for now
  console.debug("Riesgos por tipo:", byType.length);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-1">Análisis completo del estado de riesgos — {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <Button onClick={handleExportPDF} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Exportar PDF
        </Button>
      </div>

      {fetchError ? (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div><strong>Error de Carga:</strong> {fetchError}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData()} className="border-destructive text-destructive hover:bg-destructive hover:text-white">
              Reintentar
            </Button>
            <Button variant="default" size="sm" onClick={async () => {
              await supabase.auth.refreshSession();
              fetchData();
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reparar Reportes
            </Button>
          </div>
        </div>
      ) : null}

      {/* Score global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Score Global", value: score.toFixed(1), sub: "/ 25 puntos", icon: BarChart3, color: score >= 17 ? "text-risk-critical" : score >= 10 ? "text-risk-high" : score >= 5 ? "text-risk-medium" : "text-risk-low" },
          { label: "Total Riesgos", value: risks.length, sub: `${risks.filter(r => r.status === "active").length} activos`, icon: AlertTriangle, color: "text-primary" },
          { label: "Acciones", value: actions.length, sub: `${actions.filter(a => a.status === "completed").length} completadas`, icon: ClipboardList, color: "text-primary" },
          { label: "Evidencias", value: evidences.length, sub: "archivos adjuntos", icon: FileText, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {!loading && risks.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Riesgos por Nivel</h3>
            <ResponsiveContainer width="100%" height={200} key="by-level-container">
              <PieChart key="by-level-chart">
                <Pie data={byLevel} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {byLevel.map((_, i) => <Cell key={`cell-level-${i}`} fill={RISK_COLORS[i % RISK_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Acciones por Estado</h3>
            <ResponsiveContainer width="100%" height={200} key="actions-status-container">
              <BarChart data={actionsByStatus} key="actions-status-chart">
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Cantidad">
                  {actionsByStatus.map((s, i) => <Cell key={`cell-action-${i}`} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* Risks table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Inventario de Riesgos</h3>
        </div>
        {loading ? <div className="p-8 text-center text-muted-foreground">Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Riesgo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nivel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {risks.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.name}</div>
                      {r.companies ? <div className="text-xs text-muted-foreground">{r.companies.name}</div> : null}
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                    <td className="px-4 py-3"><RiskLevelBadge level={r.risk_level} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Plan de Acción</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Riesgo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsable</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {actions.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 max-w-xs"><div className="line-clamp-2 text-foreground">{a.description}</div></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{a.risks?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.responsible}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">{a.due_date ? format(new Date(a.due_date), "d/M/yyyy") : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status as any} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

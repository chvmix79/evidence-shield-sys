import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { RiskLevelBadge, StatusBadge, TypeBadge } from "@/components/RiskBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, AlertTriangle, Shield, Pencil, Trash2, FileText, CheckCircle2, Building2, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { exportToExcel } from "@/lib/export";
import { RiskPredictionDashboard } from "@/components/ai/RiskPredictionDashboard";
import { RiskAssessmentWizard } from "@/components/RiskAssessmentWizard";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { safeCacheClear } from "@/lib/safeCacheClear";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { logger } from "@/lib/logger";
import type { RiskTemplate, StandardRecord, RiskFormData } from "@/types";

const ITEMS_PER_PAGE = 10;

type FormErrors = { name?: string; company_id?: string; description?: string };

type Risk = {
  id: string; company_id: string; name: string; description: string | null;
  type: 'operational' | 'legal' | 'financial' | 'security';
  probability: number | null; impact: number | null; risk_level: number | null;
  status: 'active' | 'mitigated' | 'pending_review'; owner_id: string; created_at: string | null;
  standard_id?: string | null;
  standards?: { name: string; code: string } | null;
};

export default function RisksPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const { selectedCompanyId, companies: contextCompanies } = useCompany();
  const [form, setForm] = useState({
    name: "", description: "", type: "operational" as Risk["type"],
    probability: "3", impact: "3", status: "active" as Risk["status"],
  });
  const [standards, setStandards] = useState<Standard[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const { data, isLoading: isDataLoading, error, refetch: fetchData } = useQuery({
    queryKey: ["risks-data", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return { r: [], t: [], standardsMap: new Map() };
      
      const currentCompany = contextCompanies.find(c => c.id === selectedCompanyId);
      
      const { data: r, error: rErr } = await supabase
        .from("risks")
        .select("id, company_id, name, description, type, probability, impact, risk_level, status, owner_id, created_at, standard_id")
        .eq("company_id", selectedCompanyId)
        .order("risk_level", { ascending: false });

      if (rErr) throw rErr;

      const standardIds = [...new Set((r || []).map(r => r.standard_id).filter(Boolean))];
      let standardsMap = new Map();
      if (standardIds.length > 0) {
        const { data: sData } = await supabase.from("standards").select("id, name, code").in("id", standardIds);
        if (sData) standardsMap = new Map(sData.map(s => [s.id, s]));
      }

      let t: RiskTemplate[] = [];
      if (currentCompany?.sector_id) {
        const { data: tData } = await supabase
          .from("risk_templates")
          .select("id, name, description, type, probability, impact, recommended_actions, sector_id")
          .eq("sector_id", currentCompany.sector_id)
          .order("name");
        t = tData ?? [];
      }

      const result = { r, t, standardsMap };
      
      // PERSISTENCIA: Guardar en localStorage para evitar que "desaparezcan" los riesgos al cambiar de pestaña
      if (r && r.length > 0) {
        const toSave = { ...result, standardsMap: Object.fromEntries(result.standardsMap) };
        localStorage.setItem(`risks_cache_${selectedCompanyId}`, JSON.stringify(toSave));
      }
      
      return result;
    },

    initialData: () => {
      // HIDRATACIÓN: Cargar datos previos para respuesta instantánea y mayor estabilidad
      const saved = localStorage.getItem(`risks_cache_${selectedCompanyId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert regular object back to Map for standardsMap
          if (parsed.standardsMap && !(parsed.standardsMap instanceof Map)) {
            parsed.standardsMap = new Map(Object.entries(parsed.standardsMap));
          }
          return parsed;
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    },
    enabled: !!selectedCompanyId,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 0


  });

  const risks = (data?.r || []).map((risk) => ({
    ...risk,
    standards: risk.standard_id
      ? (data.standardsMap instanceof Map
        ? data.standardsMap.get(risk.standard_id) as { name: string; code: string } | undefined
        : null)
      : null
  }));

  const templates = data?.t || [];
  const fetchError = error ? (error instanceof Error ? error.message : "Error al cargar la información") : null;

  const handleSeedFromTemplates = async () => {
    if (!selectedCompanyId || !templates || templates.length === 0) {
      toast({ title: "No hay plantillas", description: "Configura primero el sector con IA en Super Admin.", variant: "destructive" });
      return;
    }

    setIsActionLoading(true);
    try {
      await WITH_TIMEOUT((async () => {
        const risksToInsert = templates.map((t: RiskTemplate) => ({
          company_id: selectedCompanyId,
          name: t.name,
          description: t.description,
          type: t.type,
          probability: t.probability,
          impact: t.impact,
          status: 'active' as const,
          owner_id: user?.id,
        }));

        const { error } = await supabase.from("risks").insert(risksToInsert);
        if (error) throw error;
      })(), 10000, "La importación masiva está tardando demasiado.");

      toast({ 
        title: "¡Configuración Exitosa!", 
        description: `Se han cargado ${templates.length} riesgos basados en la inteligencia artificial de tu sector.` 
      });
      fetchData();
    } catch (err) {
      const error = err as Error;
      logger.error(error);
      toast({ title: "Error al importar", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const fetchStandardsForSector = async (sectorId: string) => {
    const { data } = await supabase
      .from("standards")
      .select("id, name, code, description, is_mandatory")
      .eq("sector_id", sectorId)
      .order("name");
    setStandards(data ?? []);
  };

  useEffect(() => {
    const currentCompany = contextCompanies.find(c => c.id === selectedCompanyId);
    if (currentCompany?.sector_id) {
      fetchStandardsForSector(currentCompany.sector_id);
    } else {
      setStandards([]);
    }
  }, [selectedCompanyId, contextCompanies]);

  const applyTemplate = (template: RiskTemplate) => {
    setForm({
      name: template.name,
      description: template.description || "",
      type: template.type,
      probability: String(template.probability ?? 3),
      impact: String(template.impact ?? 3),
      status: "active",
    });
    setTemplateDialogOpen(false);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditRisk(null);
    setErrors({});
    setForm({ name: "", description: "", type: "operational", probability: "3", impact: "3", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (r: Risk) => {
    setEditRisk(r);
    setErrors({});
    setForm({ name: r.name, description: r.description ?? "", type: r.type, probability: String(r.probability), impact: String(r.impact), status: r.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !selectedCompanyId) return;
    if (!validateForm()) return;
    const payload = {
      name: form.name, description: form.description, type: form.type,
      probability: Number(form.probability), impact: Number(form.impact),
      status: form.status, company_id: selectedCompanyId, owner_id: user.id,
    };
    if (editRisk) {
      const { error } = await supabase.from("risks").update(payload).eq("id", editRisk.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Riesgo actualizado" });
    } else {
      const { error } = await supabase.from("risks").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Riesgo creado" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id || !user) return;
    let query = supabase.from("risks").delete().eq("id", deleteDialog.id);
    if (role !== "admin") query = query.eq("owner_id", user.id);
    await query;
    toast({ title: "Riesgo eliminado" });
    fetchData();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "El nombre es requerido";
    else if (form.name.length < 3) newErrors.name = "El nombre debe tener al menos 3 caracteres";
    if (form.description && form.description.length > 500) newErrors.description = "Máximo 500 caracteres";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExportExcel = async () => {
    const dataToExport = risks.map(r => ({
      "ID Riesgo": r.id,
      "Nombre": r.name,
      "Descripción": r.description || "",
      "Tipo": r.type,
      "Probabilidad": r.probability,
      "Impacto": r.impact,
      "Nivel PxI": r.risk_level,
      "Estado": r.status === "active" ? "Activo" : "Mitigado",
      "Fecha Creación": r.created_at
    }));
    await exportToExcel(dataToExport, "Riesgos", "Riesgos");
  };

  const filtered = risks.filter(r => (r.name || "").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedRisks = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const critical = risks.filter(r => (r.risk_level ?? 0) >= 17).length;
  const high = risks.filter(r => (r.risk_level ?? 0) >= 10 && (r.risk_level ?? 0) <= 16).length;
  const active = risks.filter(r => r.status === "active").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Riesgos</h1>
          <p className="text-muted-foreground text-sm mt-1">Identifica, analiza y mitiga riesgos operativos y de seguridad</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-900/20">
            <Download className="w-4 h-4" /> Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-2">
            <FileText className="w-4 h-4" /> Plantillas
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Riesgo
          </Button>
        </div>
      </div>

      {fetchError ? (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <strong>Error de Carga:</strong> {fetchError}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchData(); }} className="border-destructive text-destructive hover:bg-destructive hover:text-white">
              Reintentar
            </Button>
            <Button variant="default" size="sm" onClick={async () => {
              await supabase.auth.refreshSession();
              fetchData();
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reparar Conexión
            </Button>
          </div>
        </div>
      ) : null}
      {/* Resumen de estadísticas con esqueletos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Riesgos", value: risks.length, icon: AlertTriangle, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Activos", value: active, icon: Shield, color: "text-orange-600 dark:text-orange-400" },
          { label: "Críticos (≥17)", value: critical, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
          { label: "Altos (10–16)", value: high, icon: AlertTriangle, color: "text-orange-500" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold tabular-nums ${s.color}`}>
              {isDataLoading && risks.length === 0 ? <Skeleton className="h-8 w-12" /> : s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar riesgos..." className="pl-9 bg-card" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
      </div>

      {selectedCompanyId ? (
        <div key="ai-dash-wrapper">
          <RiskPredictionDashboard companyId={selectedCompanyId} />
        </div>
      ) : null}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {(filtered.length === 0 && !isDataLoading && !fetchError) ? (


          <div className="p-12 text-center max-w-md mx-auto">
            <AlertTriangle className="w-12 h-12 text-orange-400/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold">Sin riesgos registrados</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Esta empresa aún no tiene riesgos. Puedes crear uno nuevo o usar la configuración inteligente del sector.
            </p>
            <div className="flex flex-col gap-3">
              {templates.length > 0 && (
                <Button onClick={() => setWizardOpen(true)} className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-bold">
                  <Sparkles className="w-4 h-4" /> Asistente de Identificación
                </Button>
              )}
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Crear Riesgo Manualmente
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Riesgo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">P × I</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nivel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedRisks.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3">
                       <div className="font-medium text-foreground">{r.name}</div>
                       <div className="flex items-center gap-2 mt-1">
                         {r.description ? <span className="text-xs text-muted-foreground line-clamp-1">{r.description}</span> : null}
                         {r.standards ? (
                           <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                             {r.standards.code}
                           </span>
                         ) : null}
                       </div>
                     </td>
                     <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                     <td className="px-4 py-3 text-center">
                       <span className="tabular-nums font-mono text-xs text-muted-foreground">{r.probability}×{r.impact}</span>
                     </td>
                     <td className="px-4 py-3"><RiskLevelBadge level={r.risk_level ?? 0} /></td>
                     <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                     <td className="px-4 py-3">
                       <div className="flex items-center justify-end gap-1">
                         {role === "auditor" && r.status === "pending_review" ? (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1 font-bold text-[10px]"
                             onClick={async () => {
                               await supabase.from("risks").update({ status: 'mitigated' }).eq("id", r.id);
                               toast({ title: "Mitigación aprobada" });
                               fetchData();
                             }}
                           >
                             <CheckCircle2 className="w-3 h-3" /> APROBAR
                           </Button>
                         ) : null}
                         <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                           <Pencil className="w-3.5 h-3.5" />
                         </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 ? (
              <div className="border-t border-border p-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      {currentPage === 1 ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent px-3 py-2 text-sm opacity-50 pointer-events-none">Anterior</span>
                      ) : (
                        <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                      )}
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink onClick={() => setCurrentPage(i + 1)} isActive={currentPage === i + 1}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      {currentPage === totalPages ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent px-3 py-2 text-sm opacity-50 pointer-events-none">Siguiente</span>
                      ) : (
                        <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                      )}
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRisk ? "Editar Riesgo" : "Nuevo Riesgo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre del Riesgo</Label>
              <Input placeholder="Ej: Falla en sistema de pagos" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={errors.name ? "border-destructive" : ""} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe el riesgo detalladamente..." rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={errors.description ? "border-destructive" : ""} />
              {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : null}
              <p className="text-xs text-muted-foreground text-right">{form.description?.length || 0}/500</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Risk["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operativo</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="financial">Financiero</SelectItem>
                    <SelectItem value="security">Seguridad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Risk["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="pending_review">En Revisión</SelectItem>
                    <SelectItem value="mitigated">Mitigado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Probabilidad (1–5)</Label>
                <Select value={form.probability} onValueChange={v => setForm(f => ({ ...f, probability: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} — {["Muy baja","Baja","Media","Alta","Muy alta"][n-1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Impacto (1–5)</Label>
                <Select value={form.impact} onValueChange={v => setForm(f => ({ ...f, impact: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} — {["Muy bajo","Bajo","Medio","Alto","Muy alto"][n-1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg p-3 bg-muted/50 text-sm">
              <span className="text-muted-foreground">Nivel calculado: </span>
              <RiskLevelBadge level={Number(form.probability) * Number(form.impact)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plantillas de Riesgos por Sector</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedCompanyId ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Selecciona una empresa arriba para ver sus riesgos relacionados</p>
              </div>
            ) : (
              <>
                {standards.length > 0 && (
                  <div className="rounded-lg border border-border p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Normativas Aplicables
                    </h4>
                    <div className="space-y-2">
                      {standards.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground ml-2">({s.code})</span>
                          </div>
                          {s.is_mandatory && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Obligatorio</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Riesgos Recomendados para este Sector</h4>
                  {templates.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay plantillas disponibles para este sector</p>
                  ) : (
                    templates.map(template => (
                      <div key={template.id} className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <TypeBadge type={template.type} />
                            <RiskLevelBadge level={(template.probability ?? 0) * (template.impact ?? 0)} />
                          </div>
                          {template.description ? (
                            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                          ) : null}
                          {template.recommended_actions ? (
                            <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {template.recommended_actions}
                            </p>
                          ) : null}
                        </div>
                        <Button size="sm" onClick={() => applyTemplate(template)} className="ml-2">
                          <Plus className="w-3 h-3 mr-1" /> Usar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RiskAssessmentWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        sectorId={contextCompanies.find(c => c.id === selectedCompanyId)?.sector_id || null}
        companyId={selectedCompanyId}
        onSuccess={() => fetchData()}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="Eliminar Riesgo"
        description="¿Estás seguro de que deseas eliminar este riesgo? Las acciones y evidencias asociadas no serán eliminadas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

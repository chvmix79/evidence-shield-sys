import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, Building2, Users, Pencil, Trash2, FileText, LayoutDashboard, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { safeCacheClear } from "@/lib/safeCacheClear";
import { logger } from "@/lib/logger";
import type { CompanyRecord, SectorRecord, PlanRecord, CompanyFormData } from "@/types";
import { RiskAssessmentWizard } from "@/components/RiskAssessmentWizard";

const ITEMS_PER_PAGE = 9;
type FormErrors = { name?: string; employee_count?: string };

const riskLevelMap: Record<string, { className: string; label: string }> = {
  low: { className: "risk-badge-low", label: "Bajo" },
  medium: { className: "risk-badge-medium", label: "Medio" },
  high: { className: "risk-badge-high", label: "Alto" },
  critical: { className: "risk-badge-critical", label: "Crítico" },
};

export default function CompaniesPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setSelectedCompanyId } = useCompany();
  const { plan } = useAuth();

  const { data, isLoading: loading, error, refetch: fetchData } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      logger.debug("[Companies] Cargando datos...");
      
      let sData: SectorRecord[] = [];
      let pData: PlanRecord[] = [];
      let cData: CompanyRecord[] = [];

      try {
        const [sRes, pRes, cRes] = await Promise.all([
          supabase.from("sectors").select("id, name").order("name"),
          supabase.from("plans").select("id, name, price, max_companies").order("price"),
          supabase.from("companies").select("id, name, sector_id, employee_count, risk_level, owner_id, created_at, plan_id").order("created_at", { ascending: false })
        ]);
        
        sData = (sRes.data ?? []) as SectorRecord[];
        pData = (pRes.data ?? []) as PlanRecord[];
        cData = (cRes.data ?? []) as CompanyRecord[];
        
        if (cRes.error) logger.error("[Companies] Error cargando empresas:", cRes.error);
      } catch (err) {
        logger.error("[Companies] Fallo en la carga paralela:", err);
      }

      const companiesWithSectorNames: CompanyRecord[] = cData.map((company) => ({
        ...company,
        sector_name: sData.find((s) => s.id === company.sector_id)?.name,
        plan_name: pData.find((p) => p.id === company.plan_id)?.name
      }));

      const result = { companies: companiesWithSectorNames, sectors: sData, plans: pData };
      localStorage.setItem("companies_list_cache", JSON.stringify(result));
      return result;
    },

    initialData: () => {
      const saved = localStorage.getItem("companies_list_cache");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return undefined; }
      }
      return undefined;
    },
    staleTime: 30000,
    retry: 1
  });

  const isInitialLoading = loading && (!data || data.companies.length === 0);
  const fetchError = error ? (error instanceof Error ? error.message : "Error de conexión") : null;

  const companies = data?.companies || [];
  const sectors = data?.sectors || [];
  const plans = data?.plans || [];

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<CompanyRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<CompanyFormData>({ name: "", sector_id: "", employee_count: "", risk_level: "medium", plan_id: "" });
  const [detectedStandards, setDetectedStandards] = useState<{ name: string; code: string }[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [wizardConfig, setWizardConfig] = useState<{ open: boolean; sectorId: string | null; companyId: string | null }>({ open: false, sectorId: null, companyId: null });

  useEffect(() => {
    const fetchDetected = async () => {
      if (!form.sector_id) {
        setDetectedStandards([]);
        return;
      }
      const { data } = await supabase.from("standards").select("name, code").eq("sector_id", form.sector_id).eq("is_active", true);
      setDetectedStandards(data || []);
    };
    fetchDetected();
  }, [form.sector_id]);


  const openCreate = () => {
    setEditCompany(null);
    setErrors({});
    setForm({ name: "", sector_id: "", employee_count: "", risk_level: "medium", plan_id: plans[1]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (c: CompanyRecord) => {
    setEditCompany(c);
    setErrors({});
    setForm({ name: c.name, sector_id: c.sector_id ?? "", employee_count: String(c.employee_count ?? ""), risk_level: c.risk_level ?? "medium", plan_id: c.plan_id ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    
    // VALIDACIÓN DE LÍMITES DE PLAN
    if (!editCompany && plan && companies.length >= plan.max_companies) {
      toast({ 
        title: "Límite de Plan Alcanzado", 
        description: `Tu plan ${plan.name} solo permite ${plan.max_companies} empresas. Mejora tu plan para agregar más.`, 
        variant: "destructive" 
      });
      return;
    }

    if (!validateForm()) return;
    const payload: Partial<CompanyRecord> = {
      name: form.name, 
      sector_id: form.sector_id || null,
      employee_count: form.employee_count ? form.employee_count : null,
      risk_level: form.risk_level, 
      plan_id: form.plan_id || null,
    };
    if (editCompany) {
      const { error } = await supabase.from("companies").update(payload).eq("id", editCompany.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Empresa actualizada" });
    } else {
      const insertPayload = { ...payload, owner_id: user.id };
      const { data: newComp, error } = await supabase.from("companies").insert(insertPayload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      
      toast({ title: "Empresa creada", description: "Empresa creada exitosamente." });

      if (newComp?.sector_id) {
        setWizardConfig({ open: true, sectorId: newComp.sector_id, companyId: newComp.id });
      }
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id || !user) return;
    let query = supabase.from("companies").delete().eq("id", deleteDialog.id);
    if (role !== "admin" && role !== "superadmin") query = query.eq("owner_id", user.id);
    await query;
    fetchData();
  };

  const handleViewDashboard = (id: string) => {
    setSelectedCompanyId(id);
    navigate("/");
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "El nombre es requerido";
    else if (form.name.length < 2) newErrors.name = "Mínimo 2 caracteres";
    if (form.employee_count && (Number(form.employee_count) < 1 || Number(form.employee_count) > 1000000)) {
      newErrors.employee_count = "Valor inválido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const filtered = companies.filter(c => (c.name || "").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCompanies = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona las empresas registradas en la plataforma</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Nueva Empresa</Button>
      </div>

      {fetchError ? (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div><strong>Error de Carga:</strong> {fetchError}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData()} className="border-destructive text-destructive hover:bg-destructive hover:text-white">
              Reintentar
            </Button>
            <Button variant="default" size="sm" onClick={() => { safeCacheClear(); window.location.reload(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reparar Conexión
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar empresas..." className="pl-9 bg-card" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
      </div>

      {isInitialLoading ? (

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="w-16 h-6 rounded-md" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (filtered.length === 0 && !fetchError) ? (

        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No hay empresas registradas</p>
          <p className="text-sm text-muted-foreground mt-1">Crea tu primera empresa para comenzar</p>
          <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Crear Empresa</Button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedCompanies.map(c => {
              const rl = riskLevelMap[c.risk_level ?? "medium"] ?? riskLevelMap.medium;
              return (
                <div key={c.id} className="bg-card rounded-xl border border-border p-5 card-hover group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md", rl.className)}>{rl.label}</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg leading-tight">{c.name}</h3>
                  {c.sector_name ? (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{c.sector_name}</span>
                    </div>
                  ) : null}
                  {c.plan_name ? (
                    <div className="flex items-center gap-1.5 mt-2 text-sm">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                        {c.plan_name}
                      </span>
                    </div>
                  ) : null}
                  {c.employee_count ? (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{c.employee_count.toLocaleString()} empleados</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 gap-y-2 mt-4 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/5" onClick={() => handleViewDashboard(c.id)}>
                      <LayoutDashboard className="w-3.5 h-3.5" /> Ver Tablero
                    </Button>
                    {c.sector_id && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setWizardConfig({ open: true, sectorId: c.sector_id, companyId: c.id })}>
                        <ClipboardList className="w-3.5 h-3.5" /> Riesgos
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
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
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editCompany ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre de la Empresa</Label>
              <Input placeholder="Ej: TechCorp S.A." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={errors.name ? "border-destructive" : ""} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sector / Industria</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.sector_id} 
                  onChange={e => setForm(f => ({ ...f, sector_id: e.target.value }))}
                >
                  <option value="">Seleccionar sector</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {detectedStandards.length > 0 && (
                  <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/10 animate-in fade-in slide-in-from-top-1">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Normativas Detectadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {detectedStandards.map(s => (
                        <span key={s.code} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium border border-primary/20">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>N° Empleados</Label>
                <Input type="number" min="1" placeholder="Ej: 250" value={form.employee_count} onChange={e => setForm(f => ({ ...f, employee_count: e.target.value }))} className={errors.employee_count ? "border-destructive" : ""} />
                {errors.employee_count ? <p className="text-xs text-destructive">{errors.employee_count}</p> : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nivel de Riesgo General</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.risk_level} 
                onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))}
              >
                <option value="low">Bajo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
                <option value="critical">Crítico</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={form.plan_id} 
                onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}
              >
                <option value="">Sin plan asignado</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price}/mes - {p.max_companies === 999 ? 'Ilimitadas' : p.max_companies} empresas)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="Eliminar Empresa"
        description="¿Estás seguro de que deseas eliminar esta empresa y todos sus datos asociados? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={confirmDelete}
      />

      <RiskAssessmentWizard
        open={wizardConfig.open}
        onOpenChange={(open) => setWizardConfig(prev => ({ ...prev, open }))}
        sectorId={wizardConfig.sectorId}
        companyId={wizardConfig.companyId}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { StatusBadge, RiskLevelBadge } from "@/components/RiskBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ClipboardList, Clock, CheckCircle2, AlertCircle, Pencil, Trash2, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { exportToExcel } from "@/lib/export";

import { WITH_TIMEOUT } from "@/lib/supabaseSafe";

type ActionRecord = Record<string, any>;
type Risk = { id: string; name: string | null; risk_level: number | null };

const ITEMS_PER_PAGE = 15;



export default function ActionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();
  
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAction, setEditAction] = useState<ActionRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({ 
    description: "", 
    responsible: "", 
    due_date: "", 
    status: "pending", 
    risk_id: "",
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  const { data: risksData, isLoading: risksLoading } = useQuery({
    queryKey: ["risks-for-actions", selectedCompanyId],
    queryFn: async (): Promise<Risk[]> => {
      if (!selectedCompanyId) return [];
      const { data, error } = await (supabase as any)
        .from("risks")
        .select("id, name, risk_level")
        .eq("company_id", selectedCompanyId)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: actionsData, isLoading, error, refetch: fetchData } = useQuery({
    queryKey: ["actions-list", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return { actions: [], risksMap: {} };

      return await WITH_TIMEOUT((async () => {
        const risksRes = await (supabase as any)
          .from("risks")
          .select("id, name, risk_level")
          .eq("company_id", selectedCompanyId);
        
        if (risksRes.error) throw risksRes.error;

        const risksMap: Record<string, Risk> = {};
        (risksRes.data ?? []).forEach((r: Risk) => {
          risksMap[r.id] = r;
        });

        const riskIds = Object.keys(risksMap);
        
        let actionsQuery = (supabase as any)
          .from("actions")
          .select("*")
          .order("created_at", { ascending: false });

        if (riskIds.length > 0) {
          actionsQuery = actionsQuery.in("risk_id", riskIds);
        }

        const { data: actions, error: actionsError } = await actionsQuery;
        if (actionsError) throw actionsError;
        
        return { actions: (actions ?? []) as ActionRecord[], risksMap };
      })(), 30000, { actions: [], risksMap: {} });
    },
    enabled: !!selectedCompanyId,
    staleTime: Infinity,
    retry: 0,
  });




  const actions = actionsData?.actions ?? [];
  const risksMap = actionsData?.risksMap ?? {};
  const risks = risksData ?? [];

  const getDescription = (a: ActionRecord): string | null => a.description ?? a.descripcion ?? null;
  const getStatus = (a: ActionRecord): string => a.status ?? a.estado ?? "pending";
  const getResponsible = (a: ActionRecord): string | null => a.responsible ?? a.responsable ?? null;
  const getDueDate = (a: ActionRecord): string | null => a.due_date ?? a.fecha_limite ?? null;

  const openCreate = () => {
    setEditAction(null);
    setForm({ 
      description: "", 
      responsible: "", 
      due_date: "", 
      status: "pending", 
      risk_id: risks[0]?.id ?? "", 
    });
    setDialogOpen(true);
  };

  const openEdit = (a: ActionRecord) => {
    setEditAction(a);
    const dueDate = getDueDate(a);
    setForm({ 
      description: getDescription(a) ?? "", 
      responsible: getResponsible(a) ?? "", 
      due_date: dueDate ? dueDate.split("T")[0] : "", 
      status: getStatus(a), 
      risk_id: a.risk_id ?? "", 
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.description.trim()) {
      toast({ title: "Error", description: "La descripción es requerida", variant: "destructive" });
      return;
    }
    if (!form.responsible.trim()) {
      toast({ title: "Error", description: "El responsable es requerido", variant: "destructive" });
      return;
    }
    if (!form.risk_id) {
      toast({ title: "Error", description: "Selecciona un riesgo", variant: "destructive" });
      return;
    }
    
    const payload: any = { 
      description: form.description, 
      responsible: form.responsible, 
      status: form.status,
      risk_id: form.risk_id,
    };
    
    if (form.due_date) {
      payload.due_date = form.due_date;
    }
    
    if (editAction) {
      const { error } = await (supabase as any)
        .from("actions")
        .update(payload)
        .eq("id", editAction.id);
      
      if (error) { 
        toast({ title: "Error", description: error.message, variant: "destructive" }); 
        return; 
      }
      toast({ title: "Acción actualizada" });
    } else {
      payload.owner_id = user.id;
      const { error } = await (supabase as any)
        .from("actions")
        .insert([payload]);
      
      if (error) { 
        toast({ title: "Error", description: error.message, variant: "destructive" }); 
        return; 
      }
      toast({ title: "Acción creada" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    await (supabase as any).from("actions").delete().eq("id", deleteDialog.id);
    setDeleteDialog({ open: false, id: null });
    fetchData();
  };

  const handleExportExcel = () => {
    const dataToExport = actions.map(a => {
      const risk = a.risk_id ? risksMap[a.risk_id] : null;
      const dueDate = getDueDate(a);
      return {
        "Descripción": getDescription(a) ?? "",
        "Responsable": getResponsible(a) ?? "",
        "Riesgo": risk?.name ?? "—",
        "Nivel Riesgo": risk?.risk_level ?? "",
        "Fecha Vencimiento": dueDate ? format(parseISO(dueDate), "yyyy-MM-dd") : "Sin fecha",
        "Estado": getStatus(a) === "pending" ? "Pendiente" : getStatus(a) === "in_progress" ? "En Proceso" : getStatus(a) === "completed" ? "Completado" : getStatus(a),
      };
    });
    exportToExcel(dataToExport, "Plan_Accion", "Acciones");
  };

  const isOverdue = (a: ActionRecord) => {
    const dueDate = getDueDate(a);
    return dueDate && getStatus(a) !== "completed" && isPast(parseISO(dueDate));
  };
  
  const filtered = actions.filter(a => 
    (getDescription(a) ?? "").toLowerCase().includes(search.toLowerCase()) || 
    (getResponsible(a) ?? "").toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedActions = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  
  const pending = actions.filter(a => getStatus(a) === "pending").length;
  const inProgress = actions.filter(a => getStatus(a) === "in_progress").length;
  const completed = actions.filter(a => getStatus(a) === "completed").length;
  const overdue = actions.filter(isOverdue).length;

  const errorMessage = error ? (error instanceof Error ? error.message : "Error al cargar acciones") : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plan de Acción</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona las acciones correctivas para cada riesgo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 text-green-700 border-green-200 hover:bg-green-50">
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Acción
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span><strong>Error:</strong> {errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pendientes", value: pending, icon: Clock, color: "text-status-pending" },
          { label: "En Proceso", value: inProgress, icon: ClipboardList, color: "text-primary" },
          { label: "Completadas", value: completed, icon: CheckCircle2, color: "text-risk-low" },
          { label: "Vencidas", value: overdue, icon: AlertCircle, color: overdue > 0 ? "text-risk-critical" : "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border card-hover">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold tabular-nums ${s.color}`}>
              {isLoading || risksLoading ? <Skeleton className="h-8 w-12" /> : s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar acciones..." 
          className="pl-9 bg-card" 
          value={search} 
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading || risksLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-border animate-pulse">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No hay acciones registradas</p>
            <p className="text-xs text-muted-foreground mt-1">Crea tu primera acción para mitigar los riesgos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Riesgo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsable</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vencimiento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedActions.map(a => {
                  const risk = a.risk_id ? risksMap[a.risk_id] : null;
                  const dueDate = getDueDate(a);
                  return (
                    <tr key={a.id} className={`hover:bg-muted/30 transition-colors ${isOverdue(a) ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{getDescription(a) ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-foreground">{risk?.name ?? "—"}</div>
                        {risk && risk.risk_level && <RiskLevelBadge level={risk.risk_level} />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{getResponsible(a) ?? "—"}</td>
                      <td className="px-4 py-3">
                        {dueDate ? (
                          <span className={`text-sm tabular-nums ${isOverdue(a) ? "text-risk-critical font-semibold" : "text-foreground"}`}>
                            {format(parseISO(dueDate), "d MMM yyyy", { locale: es })}
                            {isOverdue(a) && <span className="ml-1 text-xs">⚠️</span>}
                          </span>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={getStatus(a)} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteDialog({ open: true, id: a.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
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
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editAction ? "Editar Acción" : "Nueva Acción"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Riesgo Asociado *</Label>
              <Select value={form.risk_id || undefined} onValueChange={v => setForm(f => ({ ...f, risk_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona riesgo" />
                </SelectTrigger>
                <SelectContent>
                  {risks.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name ?? "Riesgo"} (Nivel {r.risk_level ?? "—"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción *</Label>
              <Textarea 
                placeholder="Describe la acción correctiva..." 
                rows={3} 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsable *</Label>
                <Input 
                  placeholder="Nombre del responsable" 
                  value={form.responsible} 
                  onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} 
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha Límite</Label>
                <Input 
                  type="date" 
                  value={form.due_date} 
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Proceso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.description || !form.responsible || !form.risk_id}>
              {editAction ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="Eliminar Acción"
        description="¿Estás seguro de que deseas eliminar esta acción?"
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
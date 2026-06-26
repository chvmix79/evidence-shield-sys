import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Upload, Download, Trash2, File, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { safeCacheClear } from "@/lib/safeCacheClear";
import { AlertTriangle, RefreshCw } from "lucide-react";

const ITEMS_PER_PAGE = 10;
type FormErrors = { name?: string };

type Evidence = {
  id: string; risk_id: string | null; action_id: string | null;
  name: string; description: string | null; file_url: string | null;
  file_type: string | null; file_size: number | null; owner_id: string; created_at: string;
  risks?: { name: string } | null;
  actions?: { description: string } | null;
};
type Risk = { id: string; name: string };
type Action = { id: string; description: string };

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function EvidencesPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();
  const { data: qData, isLoading: loading, error, refetch: fetchData } = useQuery({
    queryKey: ["evidences", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return { evidences: [], risks: [], actions: [] };

      return await WITH_TIMEOUT((async () => {
        const [{ data: e, error: eErr }, { data: r, error: rErr }, { data: a, error: aErr }] = await Promise.all([
          supabase.from("evidences").select("id, name, description, file_url, file_type, file_size, action_id, risk_id, owner_id, created_at, risks!inner(company_id)").eq("risks.company_id", selectedCompanyId).order("created_at", { ascending: false }).limit(50),
          supabase.from("risks").select("id, name").eq("company_id", selectedCompanyId).order("name").limit(50),
          supabase.from("actions").select("id, description, risk_id, risks!inner(company_id)").eq("risks.company_id", selectedCompanyId).order("description").limit(50),
        ]);

        if (eErr) throw eErr;
        if (rErr) throw rErr;
        if (aErr) throw aErr;

        const result = { evidences: (e ?? []) as Evidence[], risks: r as Risk[] ?? [], actions: a as Action[] ?? [] };
        
        // Persistencia
        localStorage.setItem(`evidences_cache_${selectedCompanyId}`, JSON.stringify(result));
        
        return result;
      })(), 30000, "Conexión lenta, usando evidencias guardadas.");
    },
    initialData: () => {
      const saved = localStorage.getItem(`evidences_cache_${selectedCompanyId}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return undefined; }
      }
      return undefined;
    },
    enabled: !!selectedCompanyId,
    staleTime: Infinity,
    retry: 0


  });

  const fetchError = error ? (error instanceof Error ? error.message : "Error al cargar evidencias") : null;

  const evidences = qData?.evidences || [];
  const risks = qData?.risks || [];
  const actions = qData?.actions || [];

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({ name: "", description: "", risk_id: "", action_id: "", file: null as File | null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; evidence: Evidence | null }>({ open: false, evidence: null });

  const handleSave = async () => {
    if (!user) return;
    if (!validateForm()) return;
    setUploading(true);

    let file_url = null, file_type = null, file_size = null;

    if (form.file) {
      const ext = form.file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("evidences").upload(path, form.file);
      if (error) { toast({ title: "Error al subir archivo", description: error.message, variant: "destructive" }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("evidences").getPublicUrl(data.path);
      file_url = urlData.publicUrl;
      file_type = form.file.type;
      file_size = form.file.size;
    }

    const payload = {
      name: form.name, description: form.description || null,
      risk_id: form.risk_id || null, action_id: form.action_id || null,
      file_url, file_type, file_size, owner_id: user.id,
    };

    const { error } = await supabase.from("evidences").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { 
      toast({ title: "Evidencia registrada" }); 
      
      // Auto-update risk status to pending_review
      if (form.risk_id) {
        await supabase.from("risks").update({ status: 'pending_review' }).eq("id", form.risk_id);
      }
      
      setDialogOpen(false); 
      fetchData(); 
    }
    setUploading(false);
  };

  const handleDelete = async (e: Evidence) => {
    setDeleteDialog({ open: true, evidence: e });
  };

  const confirmDelete = async () => {
    const e = deleteDialog.evidence;
    if (!e || !user) return;
    if (e.file_url) {
      const path = e.file_url.split("/evidences/")[1];
      if (path) await supabase.storage.from("evidences").remove([path]);
    }
    let query = supabase.from("evidences").delete().eq("id", e.id);
    if (role !== "admin") query = query.eq("owner_id", user.id);
    await query;
    fetchData();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "El nombre es requerido";
    else if (form.name.length < 3) newErrors.name = "Mínimo 3 caracteres";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const filtered = evidences.filter(e => (e.name || "").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedEvidences = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evidencias</h1>
          <p className="text-muted-foreground text-sm mt-1">Sube y gestiona archivos de evidencia para auditorías</p>
        </div>
        <Button onClick={() => { setForm({ name: "", description: "", risk_id: "", action_id: "", file: null }); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Evidencia
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
              Reparar Conexión
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar evidencias..." className="pl-9 bg-card" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-border animate-pulse">
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No hay evidencias registradas</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {paginatedEvidences.map(e => {
              const isImage = e.file_type?.startsWith("image/");
              return (
                <div key={e.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/8">
                    {isImage ? <ImageIcon className="w-5 h-5 text-primary" /> : <File className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{e.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {e.risks ? <span>📌 {e.risks.name}</span> : null}
                      {e.actions ? <span>📋 {e.actions.description.slice(0, 40)}...</span> : null}
                      {e.file_size ? <span>{formatBytes(e.file_size)}</span> : null}
                      <span>{format(new Date(e.created_at), "d MMM yyyy", { locale: es })}</span>
                    </div>
                    {e.description ? <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{e.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {e.file_url ? (
                      <a href={e.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Download className="w-3.5 h-3.5" /></Button>
                      </a>
                    ) : null}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(e)}>
                      <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva Evidencia</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Reporte de auditoría Q1 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={errors.name ? "border-destructive" : ""} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea placeholder="Describe el contenido de esta evidencia..." rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Riesgo (opcional)</Label>
                <Select value={form.risk_id || undefined} onValueChange={v => setForm(f => ({ ...f, risk_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {risks.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Acción (opcional)</Label>
                <Select value={form.action_id || undefined} onValueChange={v => setForm(f => ({ ...f, action_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {actions.map(a => <SelectItem key={a.id} value={a.id}>{a.description.slice(0, 50)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Archivo (PDF, imagen, etc.)</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                {form.file ? (
                  <p className="text-sm font-medium text-foreground">{form.file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Haz clic para subir archivo</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, imágenes, Word hasta 20MB</p>
                  </>
                )}
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                  onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || uploading}>{uploading ? "Subiendo..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, evidence: null })}
        title="Eliminar Evidencia"
        description="¿Estás seguro de que deseas eliminar esta evidencia? El archivo asociado también será eliminado. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

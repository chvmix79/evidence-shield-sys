import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Building2, User, ChevronRight, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export";

type Audit = {
  id: string; title: string; status: string; start_date: string; end_date: string;
  companies?: { name: string } | null;
  profiles?: { full_name: string | null } | null;
};

export function AuditsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  
  // New Audit State
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchAudits();
    fetchCompanies();
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audits")
      .select("*, companies(name)");
    
    // We fetch auditor details manually since profiles is auth.users
    // But we link auditor_id to auth.users, and profiles shares id.
    const { data: profs } = await supabase.from("profiles").select("id, full_name");
    
    const mapped = (data || []).map((a: Record<string, unknown>) => ({
      ...a as Audit,
      profiles: profs?.find(p => p.id === a.auditor_id) || { full_name: "Auditor" }
    }));
    
    setAudits(mapped);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name");
    setCompanies(data || []);
  };

  const handleCreate = async () => {
    if (!newTitle || !newCompany || !newStart || !newEnd || !user) {
      toast({ title: "Faltan datos", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("audits").insert({
      title: newTitle,
      company_id: newCompany,
      auditor_id: user.id,
      start_date: newStart,
      end_date: newEnd,
      status: 'scheduled'
    });

    if (error) {
      toast({ title: "Error al crear auditoría", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Auditoría creada" });
      setIsOpen(false);
      fetchAudits();
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Programada", color: "bg-blue-100 text-blue-800 border-blue-200" },
    in_progress: { label: "En Proceso", color: "bg-amber-100 text-amber-800 border-amber-200" },
    completed: { label: "Completada", color: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { label: "Cancelada", color: "bg-red-100 text-red-800 border-red-200" },
  };

  const handleExportExcel = async () => {
    const dataToExport = audits.map(a => ({
      "Título": a.title,
      "Empresa": a.companies?.name || "",
      "Auditor": a.profiles?.full_name || "",
      "Inicio": a.start_date,
      "Fin": a.end_date,
      "Estado": statusMap[a.status]?.label || a.status
    }));
    await exportToExcel(dataToExport, "Auditorias", "Auditorias");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestión de Auditorías</h2>
          <p className="text-muted-foreground text-sm">Programa y administra las auditorías empresariales</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-900/20">
            <Download className="w-4 h-4" /> Exportar Excel
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Nueva Auditoría</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Programar Nueva Auditoría</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título de la Auditoría</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ej: Auditoría ISO 27001 - Q3" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newCompany} 
                  onChange={e => setNewCompany(e.target.value)}
                >
                  <option value="">Selecciona una empresa...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha Inicio</label>
                  <Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha Fin</label>
                  <Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full mt-4">Guardar Auditoría</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : audits.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No hay auditorías</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">No has programado ninguna auditoría todavía. Haz clic en "Nueva Auditoría" para empezar.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {audits.map(audit => (
              <div key={audit.id} className="p-5 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{audit.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusMap[audit.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {statusMap[audit.status]?.label || audit.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {audit.companies?.name}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {format(new Date(audit.start_date), "dd/MM/yyyy")} - {format(new Date(audit.end_date), "dd/MM/yyyy")}</div>
                    <div className="flex items-center gap-1.5"><User className="w-4 h-4" /> {audit.profiles?.full_name}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

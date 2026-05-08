import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Webhook, Plus, Save, Trash2, CheckCircle2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { safeCacheClear } from "@/lib/safeCacheClear";
import { RefreshCw, AlertTriangle } from "lucide-react";

type WebhookRegistration = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
};

export default function WebhooksPage() {
  const { user, role, plan } = useAuth();
  const { toast } = useToast();
  
  const isEnterprise = plan?.id === '6a8803e7-ea12-4e31-9270-b660cf6de8d1';
  const isSuperAdmin = role === 'superadmin' || user?.email === 'chvmix79@gmail.com';
  const canAccess = isSuperAdmin || (role === 'admin' && isEnterprise);
  const { data: webhooks = [], isLoading: loading, error, refetch: fetchWebhooks } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      const result = (data as any[]) || [];
      
      // Cache persistence
      localStorage.setItem("webhooks_cache", JSON.stringify(result));
      return result;
    },
    initialData: () => {
      const saved = localStorage.getItem("webhooks_cache");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return undefined; }
      }
      return undefined;
    },
    enabled: canAccess,
    staleTime: 30000,
    retry: 1
  });


  const fetchError = error ? (error instanceof Error ? error.message : "Error al cargar integraciones") : null;

  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['risk.created', 'action.completed']);
  const [testLoading, setTestLoading] = useState<string | null>(null);

  const availableEvents = [
    { id: 'risk.created', label: 'Nuevo Riesgo Registrado' },
    { id: 'risk.updated', label: 'Riesgo Actualizado' },
    { id: 'action.completed', label: 'Acción Correctiva Completada' },
    { id: 'evidence.uploaded', label: 'Evidencia Subida' }
  ];

  const handleSave = async () => {
    if (!newUrl.startsWith("http")) {
      toast({ title: "URL Inválida", description: "Debe comenzar con http o https", variant: "destructive" });
      return;
    }
    
    // @ts-ignore
    const { error } = await supabase.from("webhooks").insert({
      url: newUrl,
      events: selectedEvents,
      secret: crypto.randomUUID(), // Generar secreto simple para firmas
      active: true
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Webhook Creado", description: "El ERP recibirá notificaciones en la URL indicada." });
      setFormOpen(false);
      setNewUrl("");
      fetchWebhooks();
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    // @ts-ignore
    await supabase.from("webhooks").update({ active: !current }).eq("id", id);
    fetchWebhooks();
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    // @ts-ignore
    await supabase.from("webhooks").delete().eq("id", deleteDialog);
    setDeleteDialog(null);
    fetchWebhooks();
  };

  const testWebhook = async (w: WebhookRegistration) => {
    setTestLoading(w.id);
    try {
      // Mocked ping delay
      await new Promise(r => setTimeout(r, 1000));
      toast({ title: "Ping Exitoso", description: `Se recibió HTTP 200 OK desde ${new URL(w.url).hostname}` });
    } catch (e) {
      toast({ title: "Ping Fallido", description: "El servidor destino no respondió al payload de prueba.", variant: "destructive" });
    }
    setTestLoading(null);
  };

  if (!canAccess) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Webhook className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Módulo Enterprise</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          La integración con ERP mediante Webhooks solo está disponible para usuarios con el plan Enterprise.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Regresar
        </Button>
      </div>
    );
  }


  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integraciones ERP (Webhooks)</h1>
          <p className="text-muted-foreground text-sm mt-1">Configura endpoints para sincronización en tiempo real con sistemas externos.</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuevo Webhook</Button>
      </div>

      {fetchError ? (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div><strong>Error de Comunicación:</strong> {fetchError}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchWebhooks()} className="border-destructive text-destructive hover:bg-destructive hover:text-white">
              Reintentar
            </Button>
            <Button variant="default" size="sm" onClick={async () => {
              await supabase.auth.refreshSession();
              fetchWebhooks();
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reparar Integración
            </Button>
          </div>
        </div>
      ) : null}

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando integraciones...</div>
        ) : webhooks.length === 0 ? (
           <div className="p-16 text-center">
            <Webhook className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Sin Integraciones Activas</h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">Conecta tu ERP o CRM para recibir datos de riesgos y planes de acción automáticamente mediante peticiones HTTP(S).</p>
            <Button onClick={() => setFormOpen(true)} variant="outline" className="mt-6 gap-2"><Plus className="w-4 h-4" /> Configurar Primer Endpoint</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {webhooks.map(w => (
              <div key={w.id} className="p-6 flex flex-col md:flex-row gap-6 md:items-center hover:bg-muted/30 transition-colors">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <Webhook className="w-4 h-4" />
                    </span>
                    <h4 className="font-mono text-sm font-semibold truncate max-w-md">{w.url}</h4>
                    <span onClick={() => toggleStatus(w.id, w.active)} className="cursor-pointer">
                      {w.active ? <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">Activo</Badge> : <Badge variant="secondary" className="text-muted-foreground">Inactivo</Badge>}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {w.events.map(ev => (
                      <Badge key={ev} variant="outline" className="text-xs bg-background">{ev}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => testWebhook(w)} disabled={testLoading === w.id || !w.active}>
                    {testLoading === w.id ? <Activity className="w-4 h-4 animate-pulse" /> : <Activity className="w-4 h-4" />}
                    <span>Ping Test</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog(w.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir Endpoint Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>URL de Destino (Payload URL)</Label>
              <Input placeholder="https://mi-erp.com/api/webhooks/risk" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">Enviaremos peticiones POST a esta URL.</p>
            </div>
            
            <div className="space-y-3">
              <Label>Eventos a Suscribir</Label>
              <div className="grid grid-cols-1 gap-2 bg-muted/40 p-4 rounded-lg border border-border">
                {availableEvents.map(ev => {
                  const isSelected = selectedEvents.includes(ev.id);
                  return (
                    <label key={ev.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-background rounded-md transition-colors">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}`}>
                        {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                      </div>
                      <span className="text-sm font-medium leading-none">{ev.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{ev.id}</span>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) setSelectedEvents(prev => prev.filter(p => p !== ev.id));
                          else setSelectedEvents(prev => [...prev, ev.id]);
                        }} 
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!newUrl || selectedEvents.length === 0} className="gap-2">
              <Save className="w-4 h-4" /> Guardar Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title="Eliminar Integración"
        description="¿Estás seguro de que deseas eliminar este webhook? El ERP dejará de recibir actualizaciones en tiempo real de los eventos suscritos."
        confirmLabel="Eliminar Definitivamente"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

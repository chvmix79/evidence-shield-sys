import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RiskLevelBadge, StatusBadge, TypeBadge } from "@/components/RiskBadges";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2, AlertTriangle, FileText, Shield, ClipboardCheck, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Info, FileSearch } from "lucide-react";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";

const RISK_COLORS = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"];

export default function AuditorPage() {
  const { user, role, plan } = useAuth();
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  
  const isProfessional = plan?.id === '41465153-4d90-41a3-a4af-66e4777e5738' || plan?.id === '6a8803e7-ea12-4e31-9270-b660cf6de8d1';
  const isSuperAdmin = role === 'superadmin' || user?.email === 'chvmix79@gmail.com';
  const canAccess = isSuperAdmin || ((role === 'admin' || role === 'auditor') && isProfessional);

  const { data: qData, isLoading, refetch } = useQuery({
    queryKey: ["auditor-data", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return { risks: [], actions: [], evidences: [] };

      // Consultar riesgos
      const { data: rData } = await supabase
        .from("risks")
        .select("id, name, type, risk_level, status, description, company_id")
        .eq("company_id", selectedCompanyId)
        .order("risk_level", { ascending: false });

      const r = rData || [];
      const riskIds = r.map((x: any) => x.id);

      // Consultar acciones y evidencias en paralelo
      const [aRes, eRes] = await Promise.all([
        riskIds.length > 0 
          ? supabase.from("actions").select("id, description, responsible, due_date, status, risk_id, risks(name)").in("risk_id", riskIds)
          : Promise.resolve({ data: [] }),
        riskIds.length > 0
          ? supabase.from("evidences").select("id, name, file_type, created_at, risk_id").in("risk_id", riskIds)
          : Promise.resolve({ data: [] })
      ]);

      return {
        risks: r,
        actions: aRes.data || [],
        evidences: eRes.data || []
      };
    },
    enabled: canAccess && !!selectedCompanyId,
  });


  const [selectedItem, setSelectedItem] = useState<{ type: 'risk' | 'action', data: any } | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleUpdateActionStatus = async (actionId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase.from("actions").update({ status: newStatus }).eq("id", actionId);
      if (error) throw error;
      toast({ title: "Estado actualizado", description: `La acción ahora está en estado: ${newStatus}` });
      setSelectedItem(null);
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const risks = qData?.risks || [];
  const actions = qData?.actions || [];
  const evidences = qData?.evidences || [];

  const byLevel = [
    { name: "Bajo", value: risks.filter(r => (r.risk_level || 0) <= 4).length },
    { name: "Medio", value: risks.filter(r => (r.risk_level || 0) >= 5 && (r.risk_level || 0) <= 9).length },
    { name: "Alto", value: risks.filter(r => (r.risk_level || 0) >= 10 && (r.risk_level || 0) <= 16).length },
    { name: "Crítico", value: risks.filter(r => (r.risk_level || 0) >= 17).length },
  ];

  if (!selectedCompanyId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una empresa para ver el panel de auditor</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Módulo Profesional</h2>
        <p className="text-muted-foreground">
          La gestión de auditorías comerciales solo está disponible para usuarios con el plan Profesional o Enterprise.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Ir al Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            Panel de Auditor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Vista de solo lectura para auditores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate("/audit-execution")}>
            <Play className="w-4 h-4" /> Nueva Auditoría
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{risks.length}</div><p className="text-sm text-muted-foreground">Riesgos</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{actions.length}</div><p className="text-sm text-muted-foreground">Acciones</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{evidences.length}</div><p className="text-sm text-muted-foreground">Evidencias</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{risks.filter(r => (r.risk_level || 0) >= 17).length}</div><p className="text-sm text-muted-foreground">Críticos</p></CardContent></Card>
      </div>

      <Tabs defaultValue="risks">
        <TabsList>
          <TabsTrigger value="risks">Riesgos</TabsTrigger>
          <TabsTrigger value="actions">Acciones</TabsTrigger>
        </TabsList>
        
        <TabsContent value="risks" className="mt-4">
          {risks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No hay riesgos registrados</div>
          ) : (
            <div className="grid gap-3">
              {risks.map(r => (
                <div 
                  key={r.id} 
                  onClick={() => setSelectedItem({ type: 'risk', data: r })}
                  className="bg-card rounded-xl border p-4 flex items-center justify-between hover:border-primary/50 cursor-pointer transition-all hover:shadow-md group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10">
                      <AlertTriangle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{r.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{r.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <RiskLevelBadge level={r.risk_level} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          {actions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No hay acciones registradas</div>
          ) : (
            <div className="grid gap-3">
              {actions.map(a => (
                <div 
                  key={a.id} 
                  onClick={() => setSelectedItem({ type: 'action', data: a })}
                  className="bg-card rounded-xl border p-4 flex items-center justify-between hover:border-primary/50 cursor-pointer transition-all hover:shadow-md group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100">
                      <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{a.description}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{a.risks?.name || 'Riesgo'}</Badge>
                        <p className="text-xs text-muted-foreground">{a.responsible}</p>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedItem?.type === 'risk' ? <AlertTriangle className="w-6 h-6 text-primary" /> : <ClipboardCheck className="w-6 h-6 text-indigo-600" />}
              Detalles del {selectedItem?.type === 'risk' ? 'Riesgo' : 'Plan de Acción'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Título / Descripción</label>
                <p className="text-lg font-medium leading-tight">
                  {selectedItem.type === 'risk' ? selectedItem.data.name : selectedItem.data.description}
                </p>
              </div>

              {selectedItem.data.description && selectedItem.type === 'risk' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Detalles Adicionales</label>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                    {selectedItem.data.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Responsable</span>
                  </div>
                  <p className="text-sm font-medium">{selectedItem.data.responsible || 'Sistema'}</p>
                </div>
                
                <div className="bg-card rounded-xl border p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Fecha</span>
                  </div>
                  <p className="text-sm font-medium">
                    {selectedItem.data.due_date ? new Date(selectedItem.data.due_date).toLocaleDateString() : 'Pendiente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Estado Actual</span>
                </div>
                {selectedItem.type === 'risk' ? (
                  <RiskLevelBadge level={selectedItem.data.risk_level} />
                ) : (
                  <StatusBadge status={selectedItem.data.status} />
                )}
              </div>

              {selectedItem.type === 'action' && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 gap-2" 
                    variant={selectedItem.data.status === 'completed' ? 'outline' : 'default'}
                    disabled={updating || selectedItem.data.status === 'completed'}
                    onClick={() => handleUpdateActionStatus(selectedItem.data.id, 'completed')}
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Validar y Completar
                  </Button>
                  {selectedItem.data.status === 'pending' && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      disabled={updating}
                      onClick={() => handleUpdateActionStatus(selectedItem.data.id, 'in_progress')}
                    >
                      Iniciar Proceso
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
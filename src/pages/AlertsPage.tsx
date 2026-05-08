import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Bell, AlertTriangle, Clock, FileX, CheckCheck, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type AlertRecord = Record<string, any>;

const alertConfig: Record<string, { icon: any; className: string; label: string }> = {
  overdue_action: { icon: Clock, className: "risk-badge-high", label: "Acción Vencida" },
  critical_risk: { icon: AlertTriangle, className: "risk-badge-critical", label: "Riesgo Crítico" },
  missing_evidence: { icon: FileX, className: "risk-badge-medium", label: "Sin Evidencia" },
  info: { icon: Info, className: "bg-blue-100 text-blue-700", label: "Información" },
};

export default function AlertsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, error, refetch } = useQuery({
    queryKey: ["alerts", selectedCompanyId],
    queryFn: async (): Promise<AlertRecord[]> => {
      if (!selectedCompanyId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("alerts")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .order("created_at", { ascending: false })
          .limit(100);
        
        if (error) {
          console.error("Error fetching alerts:", error);
          if (error.code === "PGRST204" || error.message.includes("does not exist")) {
            return [];
          }
          throw error;
        }
        return (data ?? []) as AlertRecord[];
      } catch (e) {
        console.error("Exception fetching alerts:", e);
        return [];
      }
    },
    enabled: !!selectedCompanyId,
    staleTime: 0,
    retry: 1,
  });

  const getAlertTitle = (a: AlertRecord): string => {
    return a.title ?? a.titulo ?? a.message ?? "Alerta";
  };

  const getAlertDescription = (a: AlertRecord): string | null => {
    return a.description ?? a.descripcion ?? null;
  };

  const getAlertType = (a: AlertRecord): string => {
    return a.type ?? a.tipo ?? "info";
  };

  const getIsRead = (a: AlertRecord): boolean => {
    return a.is_read ?? a.leido ?? false;
  };

  const getAlertCreatedAt = (a: AlertRecord): string => {
    return a.created_at ?? a.fecha_creacion ?? new Date().toISOString();
  };

  const markRead = async (id: string) => {
    const { error } = await (supabase as any)
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id);
    if (error) {
      console.error("Error marking read:", error);
    }
    refetch();
  };

  const markAllRead = async () => {
    await (supabase as any)
      .from("alerts")
      .update({ is_read: true })
      .eq("is_read", false)
      .eq("company_id", selectedCompanyId);
    refetch();
    toast({ title: "Todas las alertas marcadas como leídas" });
  };

  const generateAlerts = async () => {
    if (!selectedCompanyId) {
      toast({ title: "Por favor selecciona una empresa primero", variant: "destructive" });
      return;
    }
    
    setGenerating(true);
    const companyId = selectedCompanyId;
    const today = new Date().toISOString().split("T")[0];

    try {
      const { data: risksRes } = await (supabase as any)
        .from("risks")
        .select("id, name, risk_level, status")
        .eq("company_id", companyId);

      const { data: actionsRes } = await (supabase as any)
        .from("actions")
        .select("id, description, due_date, status, risk_id");

      // Filtrar acciones por los riesgos de la empresa seleccionada
      const validRiskIds = new Set((risksRes ?? []).map((r: any) => r.id));
      const companyActions = (actionsRes ?? []).filter((a: any) => validRiskIds.has(a.risk_id));

      const overdueActions = companyActions.filter((a: any) => {
        const dueDate = a.due_date ?? a.fecha_limite;
        return dueDate && dueDate < today && a.status !== "completed";
      });

      const criticalRisks = (risksRes ?? []).filter((r: any) => {
        const level = r.risk_level ?? 0;
        return level >= 17 && r.status === "active";
      });

      const newAlerts = [];
      
      for (const a of overdueActions) {
        const desc = a.description ?? a.descripcion ?? "Acción";
        newAlerts.push({ 
          company_id: companyId, 
          type: "overdue_action", 
          title: "Acción vencida", 
          description: `La acción "${String(desc).substring(0, 50)}" venció`,
          is_read: false,
        });
      }
      
      for (const r of criticalRisks) {
        const name = r.name ?? "Riesgo";
        newAlerts.push({ 
          company_id: companyId,
          type: "critical_risk", 
          title: "Riesgo crítico detectado", 
          description: `El riesgo "${name}" tiene nivel crítico (≥17)`,
          is_read: false,
        });
      }

      if (newAlerts.length > 0) {
        const { error: insErr } = await (supabase as any).from("alerts").insert(newAlerts);
        
        if (insErr) {
          console.error("Error al insertar alertas:", insErr);
          if (insErr.code === "42501") {
            toast({ 
              title: "Sin permisos para crear alertas", 
              description: "Las políticas de seguridad de la base de datos no permiten crear alertas desde la aplicación.", 
              variant: "destructive",
              duration: 5000 
            });
          } else {
            toast({ title: "Error al guardar alertas", description: insErr.message, variant: "destructive" });
          }
        } else {
          toast({ title: `${newAlerts.length} alertas generadas` });
        }
      } else {
        toast({ title: "No se detectaron nuevas alertas" });
      }
    } catch (e: any) {
      console.error("Error generating alerts:", e);
      toast({ title: "Error al generar alertas", description: e.message, variant: "destructive" });
    }

    refetch();
    setGenerating(false);
  };

  const unread = alerts.filter(a => !getIsRead(a)).length;
  const errorMessage = error ? (error instanceof Error ? error.message : "Error al cargar alertas") : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
            <p className="text-muted-foreground text-sm mt-1">Notificaciones del sistema de riesgos</p>
          </div>
          {unread > 0 ? (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold risk-badge-critical">
              {unread}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          {unread > 0 && (
            <Button variant="outline" className="gap-2" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4" /> Marcar todas
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm flex items-center justify-between gap-4">
          <div><strong>Error:</strong> {errorMessage}</div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">
          Cargando alertas...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No hay alertas</p>
          <p className="text-sm text-muted-foreground mt-1">El sistema no tiene alertas activas en este momento.</p>
          
          {selectedCompanyId && (
            <div className="mt-6">
              <Button variant="outline" className="gap-2" onClick={generateAlerts} disabled={generating}>
                <RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} />
                Escanear Riesgos y Acciones
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => {
            const alertType = getAlertType(a);
            const cfg = alertConfig[alertType] || alertConfig.info;
            const Icon = cfg.icon;
            const isRead = getIsRead(a);
            const createdAt = getAlertCreatedAt(a);
            
            return (
              <div
                key={a.id}
                className={cn("bg-card rounded-xl border p-4 flex items-start gap-4 transition-all", isRead ? "border-border opacity-60" : "border-border shadow-sm")}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold", cfg.className)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", cfg.className)}>{cfg.label}</span>
                    {!isRead ? <span className="w-2 h-2 rounded-full bg-accent inline-block" /> : null}
                  </div>
                  <p className="font-medium text-foreground mt-1.5">{getAlertTitle(a)}</p>
                  {getAlertDescription(a) && <p className="text-sm text-muted-foreground mt-0.5">{getAlertDescription(a)}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(createdAt), "d MMM yyyy, HH:mm", { locale: es })}</p>
                </div>
                {!isRead ? (
                  <Button variant="ghost" size="sm" className="h-8 flex-shrink-0 text-xs" onClick={() => markRead(a.id)}>
                    Marcar leída
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
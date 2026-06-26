import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import type { AuditLog } from "@/types";

export default function AuditLogsPage() {
  const { data: logs, isLoading, error: fetchError } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        logger.error("Audit logs error:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map(log => log.user_id).filter(Boolean))];
      let profileMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
      }

      return data.map(log => ({
        ...log,
        userEmail: profileMap.get(log.user_id) || "Sistema / Externo"
      }));
    },
    retry: 1
  });


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Auditoría de Sistema
        </h1>
        <p className="text-muted-foreground">
          Registro inmutable de actividades y alteraciones de datos críticos (Creación y Eliminación).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial Reciente (Últimos 100 Registros)</CardTitle>
          <CardDescription>
            Mostrando eventos interceptados en la base de datos central.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">Cargando eventos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad (Tabla)</TableHead>
                  <TableHead>Usuario Modificador</TableHead>
                  <TableHead>Detalles Técnicos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {log.created_at ? format(new Date(log.created_at), "dd/MM/yy HH:mm:ss") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.action === 'DELETE' ? 'destructive' : log.action === 'UPDATE' ? 'secondary' : 'default'}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs capitalize">
                      {log.entity_type?.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {log.userEmail}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="max-w-[300px] truncate">
                        {log.old_data ? JSON.stringify(log.old_data).substring(0, 50) + "..." : "Sin detalles"}
                      </div>
                    </TableCell>

                  </TableRow>
                ))}

                {(!logs || logs.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay registros de auditoría almacenados aún.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

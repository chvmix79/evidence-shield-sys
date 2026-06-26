import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ShieldAlert, Trash2, UserPlus, CreditCard, CheckCircle2, Clock, Ban } from "lucide-react";
import { format, addDays } from "date-fns";
import { TemplateManager } from "@/components/admin/TemplateManager";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";
import type { CompanyRecord, Profile, UserRole } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import chvLogo from "@/assets/CHV_Logo.png";

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const { setSelectedCompanyId } = useCompany();
  const [activeTab, setActiveTab] = useState("companies");

  const handleViewDashboard = (id: string) => {
    setSelectedCompanyId(id);
    navigate("/");
  };

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      return await WITH_TIMEOUT((async () => {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, employee_count, risk_level, created_at, sector_id")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as CompanyRecord[];
      })(), 8000, "La carga de empresas ha tardado más de lo esperado.");
    },
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      logger.debug("[SuperAdmin] Iniciando carga de usuarios...");
      try {
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("*")
          .order("created_at", { ascending: false });

        if (rolesError) throw rolesError;

        const { data: profiles, error: profError } = await supabase
          .from("profiles")
          .select("*");

        if (profError) logger.warn("[SuperAdmin] Error cargando perfiles:", profError);

        logger.debug("[SuperAdmin] Datos crudos:", { roles: roles?.length, profiles: profiles?.length });
        const roleList = (roles ?? []) as UserRole[];

        if (!roles || roles.length === 0) {
          logger.warn("[SuperAdmin] No se encontraron roles en la base de datos.");
          return [];
        }
        
        const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));

        return roleList.map((r: UserRole) => {
          const profile = profileMap.get(r.user_id);
          return {
            ...r,
            email: profile?.email || `ID: ${r.user_id?.slice(0, 8)}`,
            plan_id: profile?.plan_id || '2db10bc8-7de4-403d-802b-948eeb19b860',
            subscription_end_date: profile?.subscription_end_date,
            subscription_status: profile?.subscription_status || 'active'
          };
        });
      } catch (e) {
        const error = e as Error;
        logger.error("[SuperAdmin] Error crítico en fetch:", error);
        toast({ title: "Error de conexión", description: error.message, variant: "destructive" });
        return [];
      }
    },
  });

  const handleUpdatePlan = async (userId: string, newPlan: string, period: 'month' | 'year' = 'month') => {
    try {
      const updates: Record<string, unknown> = { plan_id: newPlan };
      const days = period === 'year' ? 365 : 30;
      
      const { data: currentProfile } = await supabase.from("profiles").select("subscription_end_date").eq("id", userId).single();
      
      if (newPlan !== '2db10bc8-7de4-403d-802b-948eeb19b860') {
        updates.subscription_end_date = addDays(new Date(), days).toISOString();
        updates.subscription_status = 'active';
      }

      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) throw error;
      toast({ 
        title: "Plan actualizado", 
        description: `El usuario ahora tiene el plan ${newPlan} por 1 ${period === 'year' ? 'año' : 'mes'}` 
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Error al actualizar plan", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
      if (error) throw error;
      toast({ title: "Rol actualizado", description: `El usuario ahora es ${newRole}` });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Error al actualizar rol", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateExpiry = async (userId: string, date: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ 
        subscription_end_date: date,
        subscription_status: 'active' // Al actualizar fecha, reseteamos estado a activo
      }).eq("id", userId);
      if (error) throw error;
      toast({ title: "Vencimiento actualizado", description: "La fecha ha sido guardada." });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRenew30Days = async (userId: string) => {
    const newDate = addDays(new Date(), 30).toISOString();
    await handleUpdateExpiry(userId, newDate);
  };

  const getRiskBadge = (level: string | null) => {
    if (!level) return <Badge variant="outline">Sin nivel</Badge>;
    const levelNum = parseInt(level) || 0;
    if (levelNum >= 17) return <Badge className="bg-red-500">Crítico</Badge>;
    if (levelNum >= 10) return <Badge className="bg-orange-500">Alto</Badge>;
    if (levelNum >= 5) return <Badge className="bg-yellow-500">Medio</Badge>;
    return <Badge className="bg-green-500">Bajo</Badge>;
  };

  const getStatusBadge = (status: string, endDate: string | null, planId: string | null) => {
    if (status === 'blocked') return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" /> Bloqueado</Badge>;
    
    // Si no hay plan asignado (o es el valor por defecto sin configurar)
    if (!planId || planId === '') {
      return <Badge variant="outline" className="gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> Sin Plan</Badge>;
    }

    if (endDate) {
      const diff = (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      if (diff < 0) {
        if (diff >= -2) return <Badge className="bg-amber-500 gap-1"><Clock className="w-3 h-3" /> Gracia</Badge>;
        return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" /> Vencido</Badge>;
      }
      return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="w-3 h-3" /> Activo</Badge>;
    }
    
    // Si tiene plan pero no tiene fecha (ej. el básico inicial)
    if (planId === '2db10bc8-7de4-403d-802b-948eeb19b860') {
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/20 gap-1"><CheckCircle2 className="w-3 h-3" /> Gratuito</Badge>;
    }

    return <Badge variant="outline" className="gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> Pendiente</Badge>;
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "superadmin": return <Badge className="bg-purple-500">Super Admin</Badge>;
      case "admin": return <Badge className="bg-blue-500">Admin</Badge>;
      case "auditor": return <Badge className="bg-green-500">Auditor</Badge>;
      case "user": return <Badge variant="outline">Usuario</Badge>;
      default: return <Badge variant="outline">{role || "Sin rol"}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={chvLogo} alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administración Global</h1>
            <p className="text-muted-foreground text-sm">Gestión de suscripciones y usuarios del sistema</p>
            <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Badge variant="outline" className="h-4 px-1">Admin</Badge> Gestiona empresa y riesgos.</span>
              <span className="flex items-center gap-1"><Badge variant="outline" className="h-4 px-1">Auditor</Badge> Ejecuta auditorías y revisa evidencias.</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
        }}>
          Sincronizar Datos
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" /> Empresas ({companies.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" /> Usuarios ({users.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Empresas Registradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCompanies ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay empresas registradas</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Empleados</TableHead>
                      <TableHead>Nivel Riesgo</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company: CompanyRecord) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name || "Sin nombre"}</TableCell>
                        <TableCell>{company.employee_count || "—"}</TableCell>
                        <TableCell>{getRiskBadge(company.risk_level)}</TableCell>
                        <TableCell>{company.created_at ? format(new Date(company.created_at), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => handleViewDashboard(company.id)}>
                            Ver Dashboard
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Usuarios del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay usuarios registrados</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Fecha Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u: UserRole) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          <Select 
                            defaultValue={u.role} 
                            onValueChange={(v) => handleUpdateRole(u.user_id, v)}
                            disabled={u.role === 'superadmin'}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {u.role === 'superadmin' && <SelectItem value="superadmin">Super Admin</SelectItem>}
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="auditor">Auditor</SelectItem>
                              <SelectItem value="user">Usuario</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select defaultValue={u.plan_id} onValueChange={(v) => handleUpdatePlan(u.user_id, v)}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2db10bc8-7de4-403d-802b-948eeb19b860">Básico</SelectItem>
                              <SelectItem value="41465153-4d90-41a3-a4af-66e4777e5738">Profesional</SelectItem>
                              <SelectItem value="6a8803e7-ea12-4e31-9270-b660cf6de8d1">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select defaultValue="month" onValueChange={(v: string) => handleUpdatePlan(u.user_id, u.plan_id!, v)}>
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="month">Mensual</SelectItem>
                              <SelectItem value="year">Anual (-15%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(u.subscription_status, u.subscription_end_date, u.plan_id)}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="date" 
                            className="h-8 text-xs w-32" 
                            defaultValue={u.subscription_end_date ? u.subscription_end_date.split('T')[0] : ''}
                            onChange={(e) => handleUpdateExpiry(u.user_id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
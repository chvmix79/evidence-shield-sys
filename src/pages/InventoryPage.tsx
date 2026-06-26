import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, Loader2, RefreshCw, PlusCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";
import { RiskAssessmentWizard } from "@/components/RiskAssessmentWizard";

const IT_SECTOR_ID = "997b984c-ef68-41c7-a23e-b7dfae403a84";

export default function InventoryPage() {
  const { user } = useAuth();
  const { selectedCompanyId, companies } = useCompany();
  const currentCompany = companies?.find(c => c.id === selectedCompanyId);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { data: qData, isLoading, error, refetch } = useQuery({
    queryKey: ["inventory", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return { risks: [] };

      return await WITH_TIMEOUT((async () => {
        const { data: rData, error: rErr } = await supabase
          .from("risks")
          .select("id, name, description, type, probability, impact, risk_level, status, created_at")
          .eq("company_id", selectedCompanyId)
          .eq("type", "security")
          .order("risk_level", { ascending: false });

        if (rErr) throw rErr;
        return { risks: rData || [] };
      })(), 8000, "El inventario de seguridad está tardando más de lo esperado.");
    },
    enabled: !!selectedCompanyId,
    staleTime: 30000,
    retry: 1,
  });

  const risks = qData?.risks || [];

  if (!selectedCompanyId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una empresa para ver el inventario de ciberseguridad</p>
        </div>
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

  const criticalRisks = risks.filter(r => (r.risk_level || 0) >= 17).length;
  const highRisks = risks.filter(r => (r.risk_level || 0) >= 10 && (r.risk_level || 0) < 17).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-primary" />
            Ciberseguridad
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión y evaluación de riesgos informáticos y ciberseguridad para {currentCompany?.name}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setIsWizardOpen(true)} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Evaluar Ciberseguridad
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{risks.length}</div>
            <p className="text-sm text-muted-foreground">Total Riesgos IT</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{criticalRisks}</div>
            <p className="text-sm text-red-700">Críticos</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{highRisks}</div>
            <p className="text-sm text-orange-700">Altos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{risks.length - criticalRisks - highRisks}</div>
            <p className="text-sm text-muted-foreground">Menores / Controlados</p>
          </CardContent>
        </Card>
      </div>

      {risks.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No se han evaluado riesgos de ciberseguridad</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Todas las empresas, independientemente de su sector principal, están expuestas a riesgos cibernéticos (como ransomware o fugas de datos).
          </p>
          <Button onClick={() => setIsWizardOpen(true)} className="mt-6 gap-2" variant="default">
            <PlusCircle className="w-4 h-4" />
            Iniciar Evaluación Cibernética
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {risks.map(risk => (
            <div key={risk.id} className="bg-card rounded-lg border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{risk.name}</h3>
                <p className="text-sm text-muted-foreground">{risk.description || 'Sin descripción'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={risk.risk_level >= 17 ? 'destructive' : risk.risk_level >= 10 ? 'default' : 'secondary'}>
                  Nivel {risk.risk_level}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCompanyId && (
        <RiskAssessmentWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          sectorId={IT_SECTOR_ID}
          companyId={selectedCompanyId}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
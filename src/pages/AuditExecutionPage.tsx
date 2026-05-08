import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, AlertCircle, Save, ArrowLeft, Loader2, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AuditExecutionPage() {
  const { user } = useAuth();
  const { selectedCompanyId, companies } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, { response: string, observations: string }>>({});
  const [session, setSession] = useState<any>(null);

  const currentCompany = companies.find(c => c.id === selectedCompanyId);

  useEffect(() => {
    if (!selectedCompanyId) {
      navigate("/auditor");
      return;
    }

    const fetchChecklist = async () => {
      setLoading(true);
      try {
        // 1. Buscar checklist para el sector de la empresa
        const { data: clData, error: clErr } = await supabase
          .from("audit_checklists")
          .select("*")
          .eq("sector_id", currentCompany?.sector_id)
          .eq("is_active", true)
          .maybeSingle();

        if (clErr || !clData) {
          toast({ title: "Sin lista de chequeo", description: "No hay una lista de auditoría configurada para este sector.", variant: "destructive" });
          setLoading(false);
          return;
        }

        setChecklist(clData);

        // 2. Traer los items
        const { data: iData } = await supabase
          .from("audit_checklist_items")
          .select("*")
          .eq("checklist_id", clData.id)
          .order("order_index", { ascending: true });

        setItems(iData || []);

        // 3. Crear sesión de auditoría si no existe
        const { data: sData } = await supabase
          .from("audit_sessions")
          .insert({
            company_id: selectedCompanyId,
            checklist_id: clData.id,
            auditor_id: user?.id,
            status: 'in_progress'
          })
          .select()
          .single();

        setSession(sData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, [selectedCompanyId, currentCompany?.sector_id]);

  const handleResponse = (itemId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], response: value }
    }));
  };

  const handleObservation = (itemId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], observations: value }
    }));
  };

  const saveAudit = async (finish = false) => {
    if (!session) return;
    setSaving(true);

    try {
      const totalItems = items.length;
      const answeredItems = Object.keys(responses).length;
      const yesCount = Object.values(responses).filter(r => r.response === 'yes').length;
      const partialCount = Object.values(responses).filter(r => r.response === 'partial').length;
      
      // Cálculo de score (Yes = 100%, Partial = 50%)
      const score = totalItems > 0 ? ((yesCount + (partialCount * 0.5)) / totalItems) * 100 : 0;

      const responsePayload = Object.entries(responses).map(([itemId, data]) => ({
        session_id: session.id,
        item_id: itemId,
        response: data.response,
        observations: data.observations
      }));

      // Upsert responses
      await supabase.from("audit_responses").delete().eq("session_id", session.id);
      const { error } = await supabase.from("audit_responses").insert(responsePayload);
      
      if (finish) {
        await supabase.from("audit_sessions").update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          score: score
        }).eq("id", session.id);
        toast({ title: "Auditoría Finalizada", description: `Cumplimiento: ${score.toFixed(1)}%` });
        navigate("/auditor");
      } else {
        await supabase.from("audit_sessions").update({ score: score }).eq("id", session.id);
        toast({ title: "Progreso Guardado" });
      }
    } catch (err) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const calculateCurrentScore = () => {
    const totalItems = items.length;
    if (totalItems === 0) return 0;
    const yesCount = Object.values(responses).filter(r => r.response === 'yes').length;
    const partialCount = Object.values(responses).filter(r => r.response === 'partial').length;
    return ((yesCount + (partialCount * 0.5)) / totalItems) * 100;
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-primary" /></div>;

  const currentScore = calculateCurrentScore();
  const progress = items.length > 0 ? (Object.keys(responses).length / items.length) * 100 : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md pb-4 pt-2 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate("/auditor")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <div className="text-right">
            <h1 className="text-xl font-bold">{checklist?.name}</h1>
            <p className="text-sm text-muted-foreground">Empresa: {currentCompany?.name}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
              <span>Progreso: {Math.round(progress)}%</span>
              <span>{Object.keys(responses).length} de {items.length}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-black">Cumplimiento Actual</p>
              <p className={`text-2xl font-black ${currentScore >= 80 ? 'text-green-600' : currentScore >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                {currentScore.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        {items.map((item, index) => (
          <Card key={item.id} className="overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{item.category}</span>
                  <CardTitle className="text-base font-semibold leading-tight">
                    {index + 1}. {item.question}
                  </CardTitle>
                  {item.requirement_code && (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">
                      Ref: {item.requirement_code}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'yes', label: 'Cumple', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                  { id: 'no', label: 'No Cumple', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                  { id: 'partial', label: 'Parcial', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { id: 'na', label: 'N/A', icon: ClipboardList, color: 'text-slate-400', bg: 'bg-slate-50' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleResponse(item.id, opt.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                      responses[item.id]?.response === opt.id 
                      ? `border-${opt.color.split('-')[1]}-600 ${opt.bg} ${opt.color} shadow-sm` 
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    <span className="text-sm font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Observaciones / Hallazgos</Label>
                <Textarea 
                  placeholder="Describe la evidencia encontrada o el motivo del incumplimiento..."
                  value={responses[item.id]?.observations || ""}
                  onChange={(e) => handleObservation(item.id, e.target.value)}
                  className="bg-muted/30 border-none focus-visible:ring-1"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-6">
        <Button variant="outline" onClick={() => saveAudit(false)} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Progreso
        </Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => saveAudit(true)} disabled={saving}>
          <CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar Auditoría
        </Button>
      </div>
    </div>
  );
}

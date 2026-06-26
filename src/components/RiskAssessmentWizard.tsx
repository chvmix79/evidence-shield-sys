import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";

type Question = {
  id: string;
  question_text: string;
  trigger_risk_template_id: string;
};

type RiskAssessmentWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectorId: string | null;
  companyId: string | null;
  onSuccess: () => void;
};

export function RiskAssessmentWizard({ open, onOpenChange, sectorId, companyId, onSuccess }: RiskAssessmentWizardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && sectorId) {
      fetchQuestions();
    }
  }, [open, sectorId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("risk_identification_questions")
        .select("*")
        .eq("sector_id", sectorId);
      
      if (error) throw error;
      setQuestions(data || []);
      
      // Initialize all answers to false (No)
      const initialAnswers: Record<string, boolean> = {};
      (data || []).forEach(q => {
        initialAnswers[q.id] = false;
      });
      setAnswers(initialAnswers);
    } catch (err) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string, checked: boolean) => {
    setAnswers(prev => ({ ...prev, [id]: checked }));
  };

  const handleSave = async () => {
    if (!user || !companyId) return;
    setSaving(true);
    try {
      // Get all triggered template IDs
      const triggeredTemplateIds = questions
        .filter(q => answers[q.id])
        .map(q => q.trigger_risk_template_id);

      if (triggeredTemplateIds.length === 0) {
        toast({ title: "Sin riesgos", description: "No se seleccionó ningún riesgo basado en las respuestas." });
        onOpenChange(false);
        return;
      }

      // Fetch the actual templates (including recommended_actions)
      const { data: templates, error: tempErr } = await supabase
        .from("risk_templates")
        .select("*")
        .in("id", triggeredTemplateIds);

      if (tempErr) throw tempErr;

      if (!templates || templates.length === 0) {
        toast({ title: "Error", description: "No se encontraron las plantillas de riesgo.", variant: "destructive" });
        return;
      }

      // Prepare risks to insert
      const risksToInsert = templates.map(t => {
        let safeType = 'operational';
        if (['security', 'operational', 'financial', 'legal'].includes(t.type)) {
          safeType = t.type;
        } else if (t.type === 'seguridad') {
          safeType = 'security';
        } else if (t.type === 'financiero') {
          safeType = 'financial';
        } else if (t.type === 'compliance' || t.type === 'legal') {
          safeType = 'legal';
        }

        return {
          company_id: companyId,
          name: t.name,
          description: t.description,
          type: safeType,
          probability: t.probability,
          impact: t.impact,
          status: 'active' as const,
          owner_id: user.id,
        };
      });

      // Insert risks and get back IDs
      const { data: insertedRisks, error: insErr } = await supabase
        .from("risks")
        .insert(risksToInsert)
        .select("id, name");
      if (insErr) throw insErr;

      // ── Auto-generate Action Plans from recommended_actions ──
      let actionsCount = 0;
      if (insertedRisks && insertedRisks.length > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
        const dueDateStr = dueDate.toISOString().split("T")[0];

        const actionsToInsert: Array<{
          risk_id: string;
          description: string;
          responsible: string;
          due_date: string;
          status: string;
          owner_id: string;
        }> = [];

        // Map inserted risk names back to their templates to get recommended_actions
        for (const insertedRisk of insertedRisks) {
          const template = templates.find(t => t.name === insertedRisk.name);
          if (template?.recommended_actions) {
            // recommended_actions are separated by '|'
            const actionDescriptions = template.recommended_actions
              .split("|")
              .map((a: string) => a.trim())
              .filter((a: string) => a.length > 0);

            for (const desc of actionDescriptions) {
              actionsToInsert.push({
                risk_id: insertedRisk.id,
                description: desc,
                responsible: "Por asignar",
                due_date: dueDateStr,
                status: "pending",
                owner_id: user.id,
              });
            }
          }
        }

        if (actionsToInsert.length > 0) {
          const { error: actErr } = await supabase.from("actions").insert(actionsToInsert);
          if (actErr) {
            logger.error(actErr);
            // Non-fatal: risks were created, just warn about actions
            toast({
              title: "Riesgos creados, pero hubo un problema con las acciones",
              description: actErr.message,
              variant: "destructive",
            });
          } else {
            actionsCount = actionsToInsert.length;
          }
        }
      }

      // ── Auto-generate Alerts for each risk ──
      if (insertedRisks && insertedRisks.length > 0) {
        const alertsToInsert = insertedRisks.map(r => {
          const template = templates.find(t => t.name === r.name);
          const level = (template?.probability ?? 3) * (template?.impact ?? 3);
          const alertType = level >= 17 ? 'critical_risk' : level >= 10 ? 'high_risk' : 'new_risk';
          const levelLabel = level >= 17 ? 'crítico' : level >= 10 ? 'alto' : 'medio';
          return {
            company_id: companyId,
            type: alertType,
            title: level >= 10 ? `Riesgo ${levelLabel} detectado` : 'Nuevo riesgo identificado',
            description: `El riesgo "${r.name}" ha sido identificado con nivel ${levelLabel} (${level}).`,
            risk_id: r.id,
            is_read: false,
          };
        });

        if (actionsCount > 0) {
          alertsToInsert.push({
            company_id: companyId,
            type: 'action_pending',
            title: 'Acciones pendientes de asignación',
            description: `${actionsCount} acciones correctivas están pendientes de asignar un responsable. Revisa el Plan de Acción.`,
            risk_id: null as any,
            is_read: false,
          });
        }

        const { error: alertsErr } = await supabase.from("alerts").insert(alertsToInsert);
        if (alertsErr) {
          logger.error("Error inserting alerts:", alertsErr);
        }
      }

      // Invalidate caches so all pages refetch automatically
      queryClient.invalidateQueries({ queryKey: ["risks-data", companyId] });
      queryClient.invalidateQueries({ queryKey: ["actions-list", companyId] });
      queryClient.invalidateQueries({ queryKey: ["risks-for-actions", companyId] });
      queryClient.invalidateQueries({ queryKey: ["alerts", companyId] });
      localStorage.removeItem(`risks_cache_${companyId}`);

      const actionsMsg = actionsCount > 0
        ? ` y ${actionsCount} acciones correctivas sugeridas`
        : "";
      toast({ 
        title: "¡Configuración Exitosa!", 
        description: `Se han configurado ${risksToInsert.length} riesgos${actionsMsg} para tu empresa.` 
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const error = err as Error;
      logger.error(error);
      toast({ title: "Error al importar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Asistente de Identificación de Riesgos
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            Responde las siguientes preguntas sobre tu operación. Basado en tus respuestas, el sistema identificará y configurará automáticamente los riesgos aplicables a tu empresa.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <p>No hay preguntas configuradas para este sector.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <Label htmlFor={`question-${q.id}`} className="text-sm font-medium leading-relaxed cursor-pointer">
                      {q.question_text}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold w-6 text-right">
                      {answers[q.id] ? "Sí" : "No"}
                    </span>
                    <Switch 
                      id={`question-${q.id}`}
                      checked={answers[q.id]} 
                      onCheckedChange={(c) => handleToggle(q.id, c)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || saving || questions.length === 0}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Finalizar y Generar Riesgos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

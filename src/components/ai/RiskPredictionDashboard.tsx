import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface RiskPredictionDashboardProps {
  companyId: string;
  onError?: (error: string | null) => void;
}

export function RiskPredictionDashboard({ companyId, onError }: RiskPredictionDashboardProps) {
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrediction("");
    setError(null);
  }, [companyId]);

  useEffect(() => {
    if (onError) onError(error);
  }, [error, onError]);

  const handlePredict = async () => {
    if (!companyId) {
      setError("Selecciona una empresa primero.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await (supabase as any).functions.invoke("chat-ai", {
        body: { 
          mode: "risk_analysis", 
          company_id: companyId 
        }
      });

      if (functionError) throw functionError;

      if (data?.error) {
        setError(data.error);
      } else if (data?.reply) {
        setPrediction(data.reply);
      } else {
        setError("No se pudo generar el análisis.");
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      setError("Error al conectar con el servicio de IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPrediction("");
    setError(null);
  };

  if (!companyId) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 dark:from-indigo-950/20 dark:via-background dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl overflow-hidden mt-6 mb-6">
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100 dark:border-indigo-900/50 bg-white/50 dark:bg-black/20">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Análisis Predictivo IA
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Genera insights sobre tus riesgos
          </p>
        </div>
        <div className="flex gap-2">
          {prediction && (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" /> Cerrar
            </Button>
          )}
          <Button 
            onClick={handlePredict} 
            disabled={loading} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm min-w-[140px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {prediction ? "Actualizar" : "Generar"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        </div>
      )}
      
      {prediction && (
        <div className="p-5 text-sm bg-white/40 dark:bg-black/10">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {prediction.split('\n').map((line, idx) => {
              const cleanLine = line.replace(/#/g, '').trim();
              if (!cleanLine) return <br key={idx} />;
              
              const parts = cleanLine.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return part;
              });

              if (cleanLine.startsWith('- ')) {
                return (
                  <div key={idx} className="flex items-start gap-2 mb-1">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>{parts}</span>
                  </div>
                );
              }

              return <p key={idx} className="mb-2">{parts}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
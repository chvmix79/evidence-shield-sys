import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Upload, CheckCircle2, Loader2, File, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

type ExternalAction = {
  id: string;
  description: string;
  risk_name: string | null;
  status: string;
};

export default function ExternalUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [action, setAction] = useState<ExternalAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadAction() {
      if (!token) return;
      try {
        const { data, error } = await supabase.rpc('get_action_by_token', { p_token: token });
        if (error) throw error;
        setAction(data as unknown as ExternalAction);
      } catch (err) {
        logger.error("Error cargando tarea:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAction();
  }, [token]);

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploading(true);

    try {
      // 1. Upload file to public provider_uploads bucket
      const ext = selectedFile.name.split('.').pop();
      const path = `${token}/${Date.now()}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('provider_uploads')
        .upload(path, selectedFile);
        
      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('provider_uploads')
        .getPublicUrl(uploadData.path);

      // 3. Call RPC to register evidence and complete action
      const { error: rpcError } = await supabase.rpc('submit_provider_evidence', {
        p_token: token,
        p_file_url: urlData.publicUrl,
        p_file_name: selectedFile.name,
        p_file_type: selectedFile.type,
        p_file_size: selectedFile.size
      });

      if (rpcError) throw rpcError;

      setSuccess(true);
      toast({ title: "Evidencia enviada", description: "La tarea ha sido marcada como completada existosamente." });
      
    } catch (err) {
      const error = err as Error;
      toast({ title: "Error", description: error.message || "No se pudo enviar la evidencia.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!action) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl text-destructive">Enlace Inválido</CardTitle>
            <CardDescription>El token de acceso no es válido o ha expirado.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-slate-950 dark:via-background dark:to-slate-900 p-4">
      <Card className="max-w-xl w-full shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-8 border-b border-border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Portal del Proveedor</CardTitle>
          <CardDescription className="text-base mt-2">
            Ha sido asignado a una Acción Correctiva en Evidence Shield Sys.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-8">
          {success ? (
            <div className="text-center py-6 animate-in zoom-in fade-in duration-500">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">¡Evidencia Recibida!</h3>
              <p className="text-muted-foreground mb-8">
                Gracias por completar la tarea asignada. El administrador ha sido notificado y la acción se marcó como resuelta.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Volver al Inicio</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-5 border border-border">
                <h4 className="font-medium text-sm text-primary mb-1 inline-block uppercase tracking-wider">Acción Requerida</h4>
                <p className="text-lg font-medium text-foreground leading-snug mt-1">{action.description}</p>
                {action.risk_name ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Riesgo asociado: {action.risk_name}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Sube tu archivo de comprobación (PDF, IMG)</label>
                <div 
                  onClick={() => !uploading && fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="file"
                    ref={fileRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <File className="w-10 h-10 text-primary mb-3" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button variant="ghost" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-foreground font-medium">Haz clic aquí para seleccionar tu evidencia</p>
                      <p className="text-sm text-muted-foreground mt-2">Hasta 20MB por archivo</p>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading} 
                className="w-full text-lg h-12 shadow-md gap-2"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Subiendo archivo...
                  </>
                ) : (
                  <>
                    Enviar Evidencia Definitiva <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="fixed bottom-6 text-center w-full max-w-xl text-xs text-muted-foreground">
        Powered by Evidence Shield Sys &copy; 2026
      </div>
    </div>
  );
}

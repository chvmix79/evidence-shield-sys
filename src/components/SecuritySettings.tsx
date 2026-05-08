import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ShieldAlert, Key, ArrowLeft, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

type Step = "loading" | "inactive" | "qr" | "active";

export function SecuritySettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("loading");
  const [factorId, setFactorId] = useState("");
  const [currentFactorId, setCurrentFactorId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkMfaState();
    } else {
      // Limpiar estado al cerrar
      setMfaCode("");
      setQrCodeUrl("");
      setMfaSecret("");
      setFactorId("");
    }
  }, [isOpen]);

  const checkMfaState = async () => {
    setStep("loading");
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        toast.error("Error al cargar configuración 2FA");
        setStep("inactive");
        return;
      }

      // Limpiar factores no verificados (pendientes) que bloquean re-enrollment
      const unverified = data?.totp?.filter(f => f.status === "unverified") ?? [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const verified = data?.totp?.find(f => f.status === "verified");
      if (verified) {
        setCurrentFactorId(verified.id);
        setStep("active");
      } else {
        setCurrentFactorId("");
        setStep("inactive");
      }
    } catch {
      setStep("inactive");
    }
  };

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Risk & Evidence Manager",
        friendlyName: user?.email ?? "Usuario",
      });

      if (error) {
        toast.error("Error al iniciar configuración: " + error.message);
        return;
      }

      setFactorId(data.id);
      setQrCodeUrl(data.totp.uri);
      setMfaSecret(data.totp.secret);
      setStep("qr");
    } catch {
      toast.error("Error inesperado al configurar 2FA");
    } finally {
      setLoading(false);
    }
  };

  const cancelEnrollment = async () => {
    // Limpiar el factor pendiente si se cancela
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
    }
    setFactorId("");
    setQrCodeUrl("");
    setMfaSecret("");
    setMfaCode("");
    setStep("inactive");
  };

  const verifyEnrollment = async () => {
    if (mfaCode.length !== 6) return;
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        toast.error("Error al generar desafío: " + challenge.error.message);
        return;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });

      if (verify.error) {
        toast.error("Código incorrecto. Comprueba la app y vuelve a intentarlo.");
        setMfaCode("");
      } else {
        toast.success("✅ Autenticación en 2 pasos activada correctamente");
        setCurrentFactorId(factorId);
        setQrCodeUrl("");
        setMfaSecret("");
        setMfaCode("");
        setStep("active");
      }
    } catch {
      toast.error("Error inesperado al verificar el código");
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!confirm("¿Estás seguro de que deseas desactivar la autenticación en 2 pasos? Tu cuenta quedará menos protegida.")) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: currentFactorId });
      if (error) {
        toast.error("Error al desactivar 2FA: " + error.message);
      } else {
        toast.success("Autenticación en 2 pasos desactivada");
        setCurrentFactorId("");
        setStep("inactive");
      }
    } catch {
      toast.error("Error inesperado al desactivar 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(mfaSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-[11px]"
          style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}>
          <Key className="w-3.5 h-3.5" />
          <span>Configurar Seguridad</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Autenticación en 2 Pasos (2FA)</DialogTitle>
          <DialogDescription>
            Añade una capa extra de seguridad a tu cuenta con una app autenticadora.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">

          {/* LOADING */}
          {step === "loading" && (
            <div className="flex justify-center items-center py-10">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* INACTIVO */}
          {step === "inactive" && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">2FA Desactivado</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Tu cuenta solo está protegida con contraseña. Activa el 2FA para mayor seguridad.
                </p>
              </div>
              <div className="w-full bg-muted/40 rounded-lg p-4 text-left text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground mb-2">¿Cómo funciona?</p>
                <p>1. Descarga <strong>Google Authenticator</strong> o <strong>Authy</strong> en tu celular.</p>
                <p>2. Escanea el código QR que aparecerá aquí.</p>
                <p>3. Desde ese momento, al iniciar sesión necesitarás el código de 6 dígitos de la app.</p>
              </div>
              <Button onClick={startEnrollment} disabled={loading} className="w-full">
                {loading ? "Generando código..." : "Activar 2FA"}
              </Button>
            </div>
          )}

          {/* ESCANEAR QR */}
          {step === "qr" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-4 bg-muted/30 p-5 rounded-xl">
                <p className="text-sm text-center font-medium">
                  Escanea este QR con tu app autenticadora:
                </p>
                <div className="bg-white p-4 rounded-xl shadow-md">
                  <QRCodeSVG value={qrCodeUrl} size={180} level="H" />
                </div>
                {mfaSecret && (
                  <div className="w-full">
                    <p className="text-xs text-muted-foreground text-center mb-2">
                      ¿No puedes escanear? Copia este código manualmente:
                    </p>
                    <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2">
                      <code className="text-xs font-mono flex-1 select-all text-primary break-all">
                        {mfaSecret}
                      </code>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={copySecret}>
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Ingresa el código de 6 dígitos que muestra la app para confirmar:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center tracking-[0.5em] text-xl font-mono"
                    onKeyDown={(e) => e.key === "Enter" && mfaCode.length === 6 && verifyEnrollment()}
                    autoFocus
                  />
                  <Button onClick={verifyEnrollment} disabled={mfaCode.length < 6 || loading}>
                    {loading ? "..." : "Verificar"}
                  </Button>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={cancelEnrollment}>
                <ArrowLeft className="w-3.5 h-3.5" /> Cancelar
              </Button>
            </div>
          )}

          {/* ACTIVO */}
          {step === "active" && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">2FA Activado ✅</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Tu cuenta está protegida. Cada vez que inicies sesión, necesitarás el código de tu app autenticadora.
                </p>
              </div>
              <Button variant="destructive" onClick={disableMfa} disabled={loading} className="w-full">
                {loading ? "Desactivando..." : "Desactivar 2FA"}
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

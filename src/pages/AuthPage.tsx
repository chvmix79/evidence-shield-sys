import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Lock, User, Eye, EyeOff, CheckCircle, Star, Zap, Building2, LayoutDashboard, FileText, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import authBg from "@/assets/auth-bg.jpg";
import chvLogo from "@/assets/CHV_Logo.png";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "mfa_challenge">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month");

  const { mfaRequired, checkMfaStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!mfaRequired && mode === "mfa_challenge" && !loading) {
      navigate("/", { replace: true });
    }
  }, [mfaRequired, mode, loading, navigate]);

  useEffect(() => {
    if (mfaRequired) {
      setMode("mfa_challenge");
    }
  }, [mfaRequired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "mfa_challenge") {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) { setError(factors.error.message); setLoading(false); return; }
      
      const totpFactor = factors.data.totp[0];
      if (!totpFactor) { setError("No TOTP factor found"); setLoading(false); return; }
      
      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) { setError(challenge.error.message); setLoading(false); return; }

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code: mfaCode
      });
      
      if (verify.error) {
        setError(verify.error.message);
      } else {
        await checkMfaStatus();
      }
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        // Redirección inmediata y forzada
        window.location.href = "/";
      }
    } else {
      const { error, data: signUpData } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: fullName,
            initial_plan: selectedPlan 
          }, 
          emailRedirectTo: window.location.origin 
        },
      });
      if (error) setError(error.message);
      else setMessage("Verifica tu correo para confirmar la cuenta.");
    }
    setLoading(false);
  };

  const benefits = [
    { title: "Control Centralizado", desc: "Monitorea riesgos y evidencias de múltiples empresas desde un solo panel.", icon: LayoutDashboard },
    { title: "Cumplimiento Normativo", desc: "Preparado para estándares internacionales y locales (MinTIC, SIC).", icon: Shield },
    { title: "Evidencias Inmutables", desc: "Registro histórico y seguro de todas las mitigaciones realizadas.", icon: FileText },
  ];
  const plans = [
    { 
      name: "Básico", 
      price: billingPeriod === "month" ? "$49" : "$499", 
      periodLabel: billingPeriod === "month" ? "USD / mes" : "USD / año",
      features: ["1 Empresa", "Dashboard General", "Gestión de Riesgos", "Plan de Acción", "Alertas Email"],
      color: "bg-slate-500/10 text-slate-600 border-slate-200"
    },
    { 
      name: "Profesional", 
      price: billingPeriod === "month" ? "$99" : "$999", 
      periodLabel: billingPeriod === "month" ? "USD / mes" : "USD / año",
      features: ["5 Empresas", "Gestión de Evidencias (1GB)", "Módulo de Auditoría Comercial", "Reportes PDF/Excel", "Soporte Estándar"],
      color: "bg-primary/10 text-primary border-primary/20 scale-105 shadow-xl ring-2 ring-primary/20",
      best: true 
    },
    { 
      name: "Enterprise", 
      price: billingPeriod === "month" ? "$199" : "$1999", 
      periodLabel: billingPeriod === "month" ? "USD / mes" : "USD / año",
      features: ["Empresas Ilimitadas", "Integraciones (Webhooks)", "Ciberseguridad Avanzada", "IA Predictiva de Riesgos", "Soporte Priority 24/7"],
      color: "bg-purple-500/10 text-purple-600 border-purple-200"
    }
  ];

  const industrySectors = [
    { name: "Agencia de Aduanas", std: "BASC / OEA", desc: "Control de seguridad en cadena de suministro." },
    { name: "Salud / IPS", std: "Habilitación / ISO 27001", desc: "Protección de datos de pacientes." },
    { name: "Financiero", std: "SFC / SARLAFT", desc: "Prevención de lavado de activos." },
    { name: "Tecnología / SaaS", std: "ISO 27001 / SOC2", desc: "Aseguramiento de infraestructura." }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden font-sans selection:bg-amber-100 selection:text-amber-900">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-200/30 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/20 blur-[120px]"></div>
      </div>

      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={chvLogo} alt="Logo" className="w-10 h-10 object-contain" />
          <span className="text-2xl font-black text-slate-900 tracking-tighter">CHV <span className="text-amber-500">RiskInsight</span> AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setMode("login")} className="text-slate-600 font-bold hover:bg-slate-100 rounded-full px-6">Soporte</Button>
          <Button onClick={() => setMode("login")} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full px-8 shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95">Acceder ahora</Button>
        </div>
      </nav>

      <section className="pt-40 pb-24 px-8 relative z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Gestión de Riesgos 4.0
            </div>
            <div className="space-y-4">
              <h1 className="text-6xl lg:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter">Control Total <br/><span className="text-amber-500">Inteligente</span></h1>
              <p className="text-xl text-slate-500 leading-relaxed max-w-lg">La plataforma SaaS líder para la automatización de riesgos y cumplimiento normativo.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-8">
              {benefits.map((b) => (
                <div key={b.title} className="group p-1">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4"><b.icon className="w-6 h-6 text-slate-900" /></div>
                  <h3 className="font-bold text-slate-900 text-base">{b.title}</h3>
                  <p className="text-sm text-slate-500 mt-2">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="login" className="relative">
            <div className="relative bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-12 rounded-[3rem]">
              <div className="mb-10 text-center">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Hola de nuevo</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-900 font-bold text-sm">Correo corporativo</Label>
                  <Input id="email" type="email" placeholder="nombre@empresa.com" className="bg-slate-50/50 border-slate-200/60 h-14 rounded-2xl" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-900 font-bold text-sm">Contraseña</Label>
                  <Input id="password" type={showPass ? "text" : "password"} className="bg-slate-50/50 border-slate-200/60 h-14 rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}
                <Button type="submit" className="w-full h-16 rounded-[1.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-xl" disabled={loading}>
                  {loading ? <RefreshCw className="animate-spin" /> : "Entrar al Sistema"}
                </Button>
                
                {/* BOTÓN DE LIMPIEZA TOTAL */}
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={async () => {
                    if (confirm("¿Deseas limpiar toda la caché y cerrar sesión forzadamente?")) {
                      await supabase.auth.signOut();
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }
                  }} 
                  className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 font-bold uppercase tracking-widest mt-4"
                >
                  Limpieza de Emergencia (Caché & Sesión)
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500">
                  {mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya eres miembro?"}
                  <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="ml-2 font-bold text-amber-600 hover:underline">
                    {mode === "login" ? "Contratar Plan" : "Iniciar sesión"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors Section */}
      <section className="py-24 bg-slate-50 px-6 border-b border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-slate-900 leading-tight">
                Especializados en <span className="text-primary">sectores críticos</span>
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Nuestra plataforma automatiza la configuración de normativas específicas según tu industria. Olvídate de crear riesgos desde cero; nuestra <span className="font-bold">IA Inteligente</span> lo hace por ti.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {industrySectors.map(s => (
                   <div key={s.name} className="p-6 bg-white rounded-[1.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.1)] hover:-translate-y-1 transition-all duration-300 group">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{s.name}</h4>
                    <div className="text-[10px] font-black uppercase text-primary mb-2 tracking-wider">{s.std}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-amber-500/10 rounded-[3rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-[#0f172a] rounded-[2.5rem] p-8 shadow-2xl overflow-hidden border border-slate-800 ring-1 ring-white/10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                    <Sparkles className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold tracking-tight">IA Predictiva</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Sistema Activo 2026</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                    <div className="h-1.5 w-1/2 bg-slate-700 rounded-full mb-3"></div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full"></div>
                  </div>
                  
                  {/* AI ALERT BOX - HIGH CONTRAST */}
                  <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/40 relative overflow-hidden group/alert">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <p className="text-[13px] text-white font-medium leading-relaxed relative z-10">
                      <span className="text-amber-500 font-black block mb-1">ANALISIS DE RIESGO:</span>
                      "Se ha detectado una desviación crítica en la normativa <span className="text-amber-400 font-bold underline decoration-amber-500/30">BASC v6</span>. Se recomienda ejecutar el plan de mitigación inmediato."
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-white/5 opacity-50">
                    <div className="h-1.5 w-1/3 bg-slate-700 rounded-full"></div>
                    <div className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative scanning line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent -translate-y-full animate-[scan_4s_linear_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-24 bg-white border-b border-slate-200 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Planes adaptados a tu escala</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Comienza hoy y escala tu gestión de riesgos a medida que tu organización crece.</p>
            
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={cn("text-sm font-bold", billingPeriod === "month" ? "text-slate-900" : "text-slate-400")}>Mensual</span>
              <button 
                onClick={() => setBillingPeriod(p => p === "month" ? "year" : "month")}
                className="w-14 h-7 rounded-full bg-slate-200 relative p-1 transition-colors"
              >
                <div className={cn("w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300", billingPeriod === "year" ? "translate-x-7" : "translate-x-0")} />
              </button>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-bold", billingPeriod === "year" ? "text-slate-900" : "text-slate-400")}>Anual</span>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] h-5">-15% Ahorro</Badge>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch pt-4">
            {plans.map((p) => (
              <div key={p.name} className={cn("relative p-8 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between", p.color)}>
                <div className="relative z-10">
                  {p.best && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                      Más Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-black mb-1">{p.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tight">{p.price}</span>
                      <span className="text-sm opacity-60">{p.periodLabel}</span>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm items-center font-medium opacity-80">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  variant={p.best ? "default" : "outline"} 
                  className="w-full h-11 font-bold rounded-2xl relative z-10" 
                  onClick={() => {
                    setSelectedPlan(p.name);
                    setMode("signup");
                    document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {selectedPlan === p.name ? "Seleccionado" : "Elegir Plan"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-white">Risk & Evidence Manager</span>
          </div>
          <div className="flex gap-8 text-sm">
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Soporte</a>
          </div>
          <p className="text-xs">© 2026 Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

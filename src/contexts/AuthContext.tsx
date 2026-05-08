import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hardCacheClear } from "@/lib/safeCacheClear";
import { differenceInDays, addDays } from "date-fns";

type UserRole = "superadmin" | "admin" | "user" | "auditor";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  plan: { id: string; name: string; max_companies: number } | null;
  subscription: {
    endDate: string | null;
    status: 'active' | 'grace' | 'blocked';
    daysRemaining: number | null;
    isGracePeriod: boolean;
    isBlocked: boolean;
  } | null;
  loading: boolean;
  mfaRequired: boolean;
  signOut: () => Promise<void>;
  checkMfaStatus: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  plan: null,
  subscription: null,
  loading: true,
  mfaRequired: false,
  signOut: async () => {},
  checkMfaStatus: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem("last_user_role") as UserRole) || null;
  });
  const [plan, setPlan] = useState<AuthContextType["plan"]>(null);

  const [subscription, setSubscription] = useState<AuthContextType["subscription"]>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  const fetchProfileData = useCallback(async (userId: string) => {
    try {
      console.log("[Auth] Cargando perfil para:", userId);
      // Intentar cargar datos con un margen mayor
      const { data: roleData, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
      const { data: profile, error: profError } = await supabase.from("profiles").select("plan_id, subscription_end_date, subscription_status").eq("id", userId).maybeSingle();

      if (roleError) console.warn("[Auth] Error cargando rol:", roleError);
      if (profError) console.warn("[Auth] Error cargando perfil:", profError);

      const finalRole = (roleData?.role as UserRole) ?? "user";
      setRole(finalRole);
      localStorage.setItem("last_user_role", finalRole);

      const planId = profile?.plan_id || '2db10bc8-7de4-403d-802b-948eeb19b860';
      const plansMap: Record<string, any> = {
        '2db10bc8-7de4-403d-802b-948eeb19b860': { id: '2db10bc8-7de4-403d-802b-948eeb19b860', name: 'Básico', max_companies: 1 },
        '41465153-4d90-41a3-a4af-66e4777e5738': { id: '41465153-4d90-41a3-a4af-66e4777e5738', name: 'Profesional', max_companies: 5 },
        '6a8803e7-ea12-4e31-9270-b660cf6de8d1': { id: '6a8803e7-ea12-4e31-9270-b660cf6de8d1', name: 'Enterprise', max_companies: 999 }
      };
      setPlan(plansMap[planId] || plansMap['2db10bc8-7de4-403d-802b-948eeb19b860']);

      const endDate = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null;
      const now = new Date();
      
      let subStatus: 'active' | 'grace' | 'blocked' = 'active';
      let isGrace = false;
      let isBlocked = false;
      let daysRem = null;

      // Superadmins no se bloquean
      if (finalRole === 'superadmin') {
        subStatus = 'active';
      } else if (profile?.subscription_status === 'blocked') {
        subStatus = 'blocked';
        isBlocked = true;
      } else if (endDate) {
        const diff = differenceInDays(endDate, now);
        daysRem = diff;
        
        if (diff < 0) {
          // Ha pasado la fecha de vencimiento
          if (diff >= -2) {
            subStatus = 'grace';
            isGrace = true;
          } else {
            subStatus = 'blocked';
            isBlocked = true;
          }
        }
      }

      setSubscription({
        endDate: profile?.subscription_end_date || null,
        status: subStatus,
        daysRemaining: daysRem,
        isGracePeriod: isGrace,
        isBlocked: isBlocked
      });
    } catch (e) {
      console.error("Auth Critical Error:", e);
      setRole("user");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMfaStatus = useCallback(async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setMfaRequired(data?.nextLevel === 'aal2' && data?.currentLevel === 'aal1');
    } catch {
      setMfaRequired(false);
    }
  }, []);

  useEffect(() => {
    // Failsafe extendido: 10 segundos para redes lentas
    const failSafe = setTimeout(() => {
      setLoading(false);
      console.log("[Auth] Desbloqueo preventivo por tiempo agotado.");
    }, 10000);

    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      const currentUser = initSession?.user ?? null;
      setUser(currentUser);
      
      // DESBLOQUEO INMEDIATO: No esperamos al perfil para dejar entrar al usuario
      setLoading(false);
      clearTimeout(failSafe);

      if (currentUser) {
        fetchProfileData(currentUser.id);
        checkMfaStatus();
      }
    }).catch(() => {
      setLoading(false);
      clearTimeout(failSafe);
    });

    // 2. Suscribirse a cambios
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[Auth] Evento: ${event}`);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        setLoading(false); // Asegurar desbloqueo
        clearTimeout(failSafe);
        
        if (currentSession?.user) {
          fetchProfileData(currentSession.user.id);
          checkMfaStatus();
        }
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setPlan(null);
        setSubscription(null);
        setMfaRequired(false);
        setLoading(false);
        clearTimeout(failSafe);
        localStorage.removeItem("selected_company_id");
      }
    });


    return () => {
      authSub.unsubscribe();
      clearTimeout(failSafe);
    };
  }, [fetchProfileData, checkMfaStatus]);


  const signOut = async () => {
    // 1. Limpieza total y absoluta síncrona
    try {
      localStorage.clear();
      sessionStorage.clear();
      // Limpiar cookies de Supabase manualmente para evitar que el middleware nos regrese
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      hardCacheClear();
    } catch (e) {}

    // 2. Redirección inmediata
    window.location.href = "/auth";
    
    // 3. Intento de aviso al servidor en segundo plano
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut background error:", err);
    }
  };



  const refreshProfile = async () => {
    if (user) await fetchProfileData(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, plan, subscription, loading, mfaRequired, signOut, checkMfaStatus, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

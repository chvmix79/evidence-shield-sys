import { logger } from "@/lib/logger";

declare global {
  interface Window {
    __QUERY_CLIENT__?: {
      clear(): void;
      invalidateQueries: (opts: { queryKey: string[] }) => void;
      resetQueries: (opts: { queryKey: string[]; exact: boolean }) => void;
    };
  }
}

export function safeCacheClear() {
  try {
    logger.debug("[Cache] Iniciando limpieza segura...");
    const preservePrefixes = ['sb-']; // Supabase
    const preserveKeys = ['selected_company_id', 'page-has-been-forced-refreshed'];
    
    Object.keys(localStorage).forEach(key => {
      const isProtected = preserveKeys.includes(key) || preservePrefixes.some(prefix => key.startsWith(prefix));
      if (!isProtected) localStorage.removeItem(key);
    });
    
    sessionStorage.clear();
    logger.debug("[Cache] Limpieza segura completada.");
  } catch (e) {
    logger.error("[Cache] Error en safeCacheClear:", e);
  }
}

export function hardCacheClear() {
  try {
    logger.warn("[Cache] Ejecutando limpieza profunda...");
    const qc = window.__QUERY_CLIENT__;
    if (qc) {
      qc.clear();
    }
    
    // Limpiar todo excepto la sesión de Supabase si es posible
    const sbKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
    const sbData = sbKeys.map(k => ({ k, v: localStorage.getItem(k) }));
    
    localStorage.clear();
    sessionStorage.clear();
    
    // Restaurar sesión
    sbData.forEach(d => {
      if (d.v) localStorage.setItem(d.k, d.v);
    });
    
    logger.debug("[Cache] Limpieza profunda completada (Sesión preservada).");
  } catch (e) {
    logger.error("[Cache] Error en hardCacheClear:", e);
  }
}

export function moduleCacheClear(moduleName?: string) {
  try {
    const qc = window.__QUERY_CLIENT__;
    if (qc && moduleName) {
      logger.debug("[Cache] Limpiando datos del módulo: " + moduleName);
      // Cancelamos y reseteamos para forzar refetch
      qc.invalidateQueries({ queryKey: [moduleName] });
      qc.resetQueries({ queryKey: [moduleName], exact: false });
    }
  } catch (e) {
    logger.error("[Cache] Error en moduleCacheClear:", e);
  }
}
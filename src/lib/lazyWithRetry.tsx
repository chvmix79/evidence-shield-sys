import React, { lazy } from "react";
import { logger } from "@/lib/logger";

export const lazyWithRetry = (componentImport: () => Promise<any>) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem("page-has-been-forced-refreshed") || "false"
    );

    try {
      return await componentImport();
    } catch (error: any) {
      const isChunkError = 
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.message?.includes("loading chunk");

      if (isChunkError && !pageHasAlreadyBeenForceRefreshed) {
        // Marcamos que ya intentamos refrescar una vez para evitar bucles
        window.sessionStorage.setItem("page-has-been-forced-refreshed", "true");
        logger.warn("[lazyWithRetry] Error de chunk detectado. Forzando recarga de aplicación...");
        
        // Limpiamos cachés locales no esenciales
        try {
          sessionStorage.clear();
          // No borramos localStorage para no desloguear al usuario
        } catch (e) {}

        window.location.reload();
        return { default: () => null }; // Retorno temporal mientras recarga
      }

      // Si ya refrescamos y sigue fallando, lanzamos el error para que el ErrorBoundary lo capture
      logger.error("[lazyWithRetry] Error persistente tras recarga:", error);
      throw error;
    }
  });
};
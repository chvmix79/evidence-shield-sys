/**
 * Logger utilitario para el sistema CHV RiskInsight.
 * 
 * En producción (VITE_PRODUCTION=true o import.meta.env.PROD), los logs de debug
 * se suprimen automáticamente. Los errores siempre se registran.
 * 
 * Uso:
 *   import { logger } from "@/lib/logger";
 *   logger.debug("Mensaje de debug");  // Solo en desarrollo
 *   logger.warn("Advertencia");         // Siempre
 *   logger.error("Error:", err);        // Siempre
 */

import * as Sentry from "@sentry/react";

type LogLevel = "debug" | "info" | "warn" | "error";

const IS_DEV = import.meta.env.DEV;
const ENABLED_LEVELS: Record<LogLevel, boolean> = {
  debug: IS_DEV,
  info: IS_DEV,
  warn: true,
  error: true,
};

function formatMessage(level: LogLevel, ...args: unknown[]) {
  const prefix = `[CHV]`;
  const timestamp = new Date().toISOString().slice(11, 19);
  return [`${timestamp} ${prefix}`, ...args];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (ENABLED_LEVELS.debug) console.debug(...formatMessage("debug", ...args));
  },
  info: (...args: unknown[]) => {
    if (ENABLED_LEVELS.info) console.info(...formatMessage("info", ...args));
  },
  warn: (...args: unknown[]) => {
    if (ENABLED_LEVELS.warn) console.warn(...formatMessage("warn", ...args));
  },
  error: (...args: unknown[]) => {
    if (ENABLED_LEVELS.error) {
      console.error(...formatMessage("error", ...args));
      
      // Send to Sentry only if this is NOT an Error instance
      // (errors are already sent via ErrorBoundary.captureException)
      const isAlreadyError = args[0] instanceof Error;
      if (!isAlreadyError) {
        const errorMsg = args.map(a => String(a)).join(" ");
        Sentry.captureMessage(errorMsg, "error");
      }
    }
  },
};

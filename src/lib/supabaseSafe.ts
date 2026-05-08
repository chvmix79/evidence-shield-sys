
/**
 * supabaseSafe: Utilidades desactivadas para restaurar flujo natural.
 * Se ha eliminado la lógica de timeout para permitir conexiones lentas pero seguras.
 */

export const WITH_TIMEOUT = async <T>(
  promise: Promise<T>,
  _timeoutMs?: number,
  _errorMessage?: string
): Promise<T> => {
  // Desactivado: Retornamos la promesa original sin límites de tiempo.
  return await promise;
};

export const createAutoAbort = (_timeoutMs?: number) => {
  const controller = new AbortController();
  // Desactivado: El controlador existe pero no aborta automáticamente.
  return {
    signal: controller.signal,
    clear: () => {}
  };
};

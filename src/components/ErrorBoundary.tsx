import React, { Component } from "react";
import { Button } from "@/components/ui/button";
import { hardCacheClear, moduleCacheClear } from "@/lib/safeCacheClear";
import { AlertTriangle } from "lucide-react";


interface Props {
  children?: any;
  fallback?: any;
  variant?: "full" | "mini";
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary:", error.message);
    const isChunkError = 
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("loading chunk");
    
    if (isChunkError) {
      const moduleName = this.getModuleName(this.props.resetKey);
      console.log("[ErrorBoundary] Chunk error in:", moduleName);
      moduleCacheClear(moduleName);
      setTimeout(() => window.location.reload(), 100);
    }
  }

  getModuleName(pathname?: string) {
    if (!pathname) return null;
    const map: Record<string, string> = {
      '/': 'dashboard-stats',
      '/dashboard': 'dashboard-stats',
      '/companies': 'companies-list',
      '/risks': 'risks-data',
      '/actions': 'actions-list',
      '/evidences': 'evidences',
      '/alerts': 'alerts',
      '/reports': 'reports-data',
      '/inventory': 'inventory',
      '/auditor': 'auditor-data',
      '/audit-execution': 'audit-execution',
      '/superadmin': 'superadmin',
      '/audit': 'audit-logs'
    };
    return map[pathname] || null;
  }

  handleRetry = () => {
    const moduleName = this.getModuleName(this.props.resetKey);
    console.log("[ErrorBoundary] Reintentando carga de módulo:", moduleName || "Global");
    
    // Limpiar flag de recarga forzada para permitir nuevos intentos si es necesario
    window.sessionStorage.removeItem("page-has-been-forced-refreshed");
    
    if (moduleName) {
      moduleCacheClear(moduleName);
    } else {
      hardCacheClear();
    }
    
    this.setState({ hasError: false, error: null });
  };


  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-card rounded-[2rem] border border-destructive/20 shadow-2xl max-w-2xl mx-auto mt-20 animate-in zoom-in-95">
          <h2 className="text-2xl font-black text-foreground mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            Error de Ejecución
          </h2>
          <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-4 mb-6">
            <p className="text-xs font-mono text-destructive break-all uppercase tracking-tight">
              {this.state.error?.message || "Error desconocido"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            El módulo no pudo renderizarse. Esto suele ocurrir por datos inconsistentes en la caché o una respuesta inesperada del servidor.
          </p>
          <div className="flex gap-4">
            <Button onClick={this.handleRetry} className="bg-primary hover:bg-primary/90 rounded-xl h-12 px-8 font-bold">
              Intentar Recuperar
            </Button>
            <Button variant="outline" onClick={() => { hardCacheClear(); window.location.href = "/auth"; }} className="rounded-xl h-12 px-8 font-bold border-destructive text-destructive">
              Limpieza Total y Salir
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

}
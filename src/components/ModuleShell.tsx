import React, { Suspense, useState, useEffect } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";

interface ModuleShellProps {
  children: React.ReactNode;
  fallbackText?: string;
}

function LoadingState({ text }: { text: string }) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center animate-in fade-in duration-500">
      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-6" />
      <p className="text-slate-500 font-medium mb-4">{text}</p>
      
      {showRetry && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-700">
          <p className="text-xs text-slate-400 max-w-xs">
            La conexión parece estar tardando más de lo habitual.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Forzar Recarga
          </Button>
        </div>
      )}
    </div>
  );
}

export function ModuleShell({ children, fallbackText = "Cargando módulo..." }: ModuleShellProps) {
  const location = useLocation();
  
  return (
    <ErrorBoundary variant="mini" resetKey={location.pathname}>
      <Suspense fallback={<LoadingState text={fallbackText} />}>
        <div className="animate-in fade-in duration-500 h-full">
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}

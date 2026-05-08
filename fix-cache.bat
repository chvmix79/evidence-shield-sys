@echo off
chcp 65001 >nul
echo ==============================================
echo  FIX CACHE MODULES - RIESGOS PROJECT
echo ==============================================
echo.

cd /d "%~dp0"

echo [1/4] Creating backups...
if not exist "src\lib\lazyWithRetry.tsx.backup" copy "src\lib\lazyWithRetry.tsx" "src\lib\lazyWithRetry.tsx.backup" >nul
if not exist "src\lib\safeCacheClear.ts.backup" copy "src\lib\safeCacheClear.ts" "src\lib\safeCacheClear.ts.backup" >nul
if not exist "src\components\ErrorBoundary.tsx.backup" copy "src\components\ErrorBoundary.tsx" "src\components\ErrorBoundary.tsx.backup" >nul

echo [2/4] Writing fixed lazyWithRetry.tsx...
powershell -Command "& { $content = @'
import React, { lazy } from \"react\";

export const lazyWithRetry = (componentImport: () => Promise<any>) => {
  return lazy(() => {
    return componentImport().catch((error: Error) => {
      if (
        error?.message?.includes(\"Failed to fetch dynamically imported module\") ||
        error?.message?.includes(\"Importing a module script failed\") ||
        error?.message?.includes(\"loading chunk\")
      ) {
        console.warn(\"[lazyWithRetry] Chunk error detected, clearing cache...\");
        try {
          Object.keys(localStorage).forEach(key => {
            if (!key.startsWith('sb-') && key !== 'selected_company_id') {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
        } catch (e) {
          console.error(\"Error clearing cache:\", e);
        }
        window.location.reload();
      }
      throw error;
    });
  });
};
'@; Set-Content -Path 'src/lib/lazyWithRetry.tsx' -Value $content -Encoding UTF8 }"

echo [3/4] Writing fixed safeCacheClear.ts...
powershell -Command "& { $content = @'
export function safeCacheClear() {
  try {
    const preservePrefixes = ['sb-'];
    const preserveKeys = ['selected_company_id'];
    Object.keys(localStorage).forEach(key => {
      const isProtected = preserveKeys.includes(key) || preservePrefixes.some(prefix => key.startsWith(prefix));
      if (!isProtected) localStorage.removeItem(key);
    });
    sessionStorage.clear();
  } catch (e) {}
}

export function hardCacheClear() {
  try {
    const qc = (window as any).__QUERY_CLIENT__;
    if (qc) qc.clear();
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {}
}

export function moduleCacheClear(moduleName?: string) {
  try {
    const qc = (window as any).__QUERY_CLIENT__;
    if (qc && moduleName) {
      console.log('[Cache] Clearing module: ' + moduleName);
      qc.cancelQueries({ queryKey: [moduleName] });
      qc.resetQueries({ queryKey: [moduleName] });
    }
  } catch (e) {}
}
'@; Set-Content -Path 'src/lib/safeCacheClear.ts' -Value $content -Encoding UTF8 }"

echo [4/4] Writing fixed ErrorBoundary.tsx...
powershell -Command "& { $content = @'
import React, { Component } from \"react\";
import { Button } from \"@/components/ui/button\";
import { RefreshCw, WifiOff } from \"lucide-react\";
import { hardCacheClear, moduleCacheClear } from \"@/lib/safeCacheClear\";

interface Props {
  children?: any;
  fallback?: any;
  variant?: \"full\" | \"mini\";
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

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(\"ErrorBoundary:\", error.message);
    const isChunkError = 
      error?.message?.includes(\"Failed to fetch\") ||
      error?.message?.includes(\"loading chunk\");
    
    if (isChunkError) {
      const moduleName = this.getModuleName(this.props.resetKey);
      console.log(\"[ErrorBoundary] Chunk error in:\", moduleName);
      moduleCacheClear(moduleName);
      setTimeout(() => window.location.reload(), 100);
    }
  }

  getModuleName(pathname: string) {
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
    moduleCacheClear(moduleName);
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className=\"p-6\">
          <p>Error en modulo.</p>
          <button onClick={this.handleRetry}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
'@; Set-Content -Path 'src/components/ErrorBoundary.tsx' -Value $content -Encoding UTF8 }"

echo.
echo ==============================================
echo  FILES FIXED. Running build...
echo ==============================================
call npm run build

echo.
echo Done! If build succeeds, the cache issue should be fixed.
pause

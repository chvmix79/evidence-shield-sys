import React, { useState, useEffect } from 'react';
import { hardCacheClear } from '@/lib/safeCacheClear';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import AuthPage from '@/pages/AuthPage';
import NotFound from '@/pages/NotFound';
import { ShieldAlert, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { ModuleShell } from '@/components/ModuleShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const DashboardPage = lazyWithRetry(() => import('@/pages/DashboardPage'));
const CompaniesPage = lazyWithRetry(() => import('@/pages/CompaniesPage'));
const RisksPage = lazyWithRetry(() => import('@/pages/RisksPage'));
const ActionsPage = lazyWithRetry(() => import('@/pages/ActionsPage'));
const EvidencesPage = lazyWithRetry(() => import('@/pages/EvidencesPage'));
const AlertsPage = lazyWithRetry(() => import('@/pages/AlertsPage'));
const ReportsPage = lazyWithRetry(() => import('@/pages/ReportsPage'));
const AuditorPage = lazyWithRetry(() => import('@/pages/AuditorPage'));
const AuditExecutionPage = lazyWithRetry(() => import('@/pages/AuditExecutionPage'));
const SuperAdminPage = lazyWithRetry(() => import('@/pages/SuperAdminPage'));
const AuditLogsPage = lazyWithRetry(() => import('@/pages/AuditLogsPage'));
const ExternalUploadPage = lazyWithRetry(() => import('@/pages/ExternalUploadPage'));
const WebhooksPage = lazyWithRetry(() => import('@/pages/WebhooksPage'));
const InventoryPage = lazyWithRetry(() => import('@/pages/InventoryPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      throwOnError: false, // Desactivado para evitar bloqueos totales
    },
  },
});


if (typeof window !== 'undefined') {
  (window as any).__QUERY_CLIENT__ = queryClient;
}

function VisibilityManager() {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        queryClient.resumePausedMutations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  return null;
}

function ModuleIsolator({ children }) {
  const location = useLocation();
  return <React.Fragment key={location.pathname}>{children}</React.Fragment>;
}

function ProtectedRoutes() {
  const { session, mfaRequired, subscription, signOut } = useAuth();
  
  if (!session || mfaRequired) return <Navigate to='/auth' replace />;

  if (subscription?.isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-xl p-8 text-center space-y-6 shadow-2xl shadow-red-500/10">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Suscripción Expirada</h2>
            <p className="text-slate-400">
              Tu acceso ha sido restringido porque el plan ha vencido y el periodo de gracia ha terminado.
            </p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-300">
              Por favor contacta con el administrador para renovar tu suscripción.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="destructive" onClick={() => window.location.href = "mailto:soporte@tuempresa.com"}>
              Contactar Soporte
            </Button>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {subscription?.isGracePeriod && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2 text-amber-500 text-sm font-medium">
            <ShieldAlert className="w-4 h-4" />
            <span>Periodo de gracia: Tu suscripción ha vencido. Te quedan 48 horas para renovar antes del bloqueo.</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 gap-1">
            <CreditCard className="w-3 h-3" />
            Renovar ahora
          </Button>
        </div>
      )}
      <Routes>
        <Route path='/' element={<ModuleShell fallbackText='Cargando Dashboard...'><DashboardPage /></ModuleShell>} />
        <Route path='/companies' element={<ModuleShell fallbackText='Cargando Empresas...'><CompaniesPage /></ModuleShell>} />
        <Route path='/risks' element={<ModuleShell fallbackText='Cargando Riesgos...'><RisksPage /></ModuleShell>} />
        <Route path='/actions' element={<ModuleShell fallbackText='Cargando Acciones...'><ActionsPage /></ModuleShell>} />
        <Route path='/evidences' element={<ModuleShell fallbackText='Cargando Evidencias...'><EvidencesPage /></ModuleShell>} />
        <Route path='/alerts' element={<ModuleShell fallbackText='Cargando Alertas...'><AlertsPage /></ModuleShell>} />
        <Route path='/reports' element={<ModuleShell fallbackText='Cargando Reportes...'><ReportsPage /></ModuleShell>} />
        <Route path='/inventory' element={<ModuleShell fallbackText='Cargando Inventario...'><InventoryPage /></ModuleShell>} />
        <Route path='/webhooks' element={<ModuleShell><WebhooksPage /></ModuleShell>} />
        <Route path='/auditor' element={<ModuleShell><AuditorPage /></ModuleShell>} />
        <Route path='/audit-execution' element={<ModuleShell fallbackText='Preparando Lista de Chequeo...'><AuditExecutionPage /></ModuleShell>} />
        <Route path='/superadmin' element={<ModuleShell><SuperAdminPage /></ModuleShell>} />
        <Route path='/audit' element={<ModuleShell><AuditLogsPage /></ModuleShell>} />
        <Route path='*' element={<ModuleShell><NotFound /></ModuleShell>} />
      </Routes>
    </AppLayout>
  );
}

function AuthRoute() {
  const { session, loading, mfaRequired } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Verificando identidad...</p>
      </div>
    );
  }
  
  if (session && !mfaRequired) return <Navigate to='/' replace />;
  return <AuthPage />;
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <VisibilityManager />
            <ErrorBoundary variant='full'>
              <ModuleIsolator>
                <Routes>
                  <Route path='/auth' element={<AuthRoute />} />
                  <Route path='/provider/:token' element={<ExternalUploadPage />} />
                  <Route path='/*' element={<ProtectedRoutes />} />
                </Routes>
              </ModuleIsolator>
            </ErrorBoundary>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

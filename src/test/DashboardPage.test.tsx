import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock ResizeObserver (needed by Recharts ResponsiveContainer)
// Must be a constructor function (called with `new`)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import React from "react";

// ─── Mocks (vi.hoisted para evitar hoisting issues) ────────────────────────

const { mockFrom, mockUseAuth, mockUseCompany, mockSetSelectedCompanyId } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSetSelectedCompanyId = vi.fn();

  const mockUseAuth = vi.fn(() => ({
    user: { id: "user-123", email: "test@example.com" },
    role: "admin",
    session: null,
    plan: null,
    subscription: null,
    mfaRequired: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    checkMfaStatus: vi.fn(),
    loading: false,
  }));

  const mockUseCompany = vi.fn(() => ({
    selectedCompanyId: "company-1",
    setSelectedCompanyId: mockSetSelectedCompanyId,
    companies: [{ id: "company-1", name: "Test Corp", sector_id: "sector-1" }],
    loading: false,
    refresh: vi.fn(),
  }));

  return { mockFrom, mockUseAuth, mockUseCompany, mockSetSelectedCompanyId };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: mockUseCompany,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Test data ──────────────────────────────────────────────────────────────

const MOCK_RISKS = [
  { id: "r1", name: "Riesgo Financiero", risk_level: 18, type: "financial", status: "active", company_id: "company-1" },
  { id: "r2", name: "Riesgo Legal", risk_level: 12, type: "legal", status: "active", company_id: "company-1" },
  { id: "r3", name: "Riesgo Operativo", risk_level: 4, type: "operational", status: "mitigated", company_id: "company-1" },
  { id: "r4", name: "Riesgo de Seguridad", risk_level: 22, type: "security", status: "active", company_id: "company-1" },
];

const MOCK_ACTIONS = [
  { id: "a1", status: "pending", due_date: "2024-01-01" },
  { id: "a2", status: "completed", due_date: "2024-06-01" },
  { id: "a3", status: "pending", due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
];

function setupDefaultMocks() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "risks") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: MOCK_RISKS, error: null }),
      };
    }
    if (table === "actions") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: MOCK_ACTIONS, error: null }),
      };
    }
    return {
      select: vi.fn().mockResolvedValue({ data: [{ id: 'dummy' }], count: 0, error: null }),
    };
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderDashboardPage() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Wait for actual data to render (Score Global card appears) */
async function waitForData() {
  await waitFor(() => {
    expect(screen.getByText("Score Global")).toBeInTheDocument();
  }, { timeout: 5000 });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Re-apply default implementations after restore
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "test@example.com" },
      role: "admin",
      session: null,
      plan: null,
      subscription: null,
      mfaRequired: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      checkMfaStatus: vi.fn(),
      loading: false,
    });
    mockUseCompany.mockReturnValue({
      selectedCompanyId: "company-1",
      setSelectedCompanyId: mockSetSelectedCompanyId,
      companies: [{ id: "company-1", name: "Test Corp", sector_id: "sector-1" }],
      loading: false,
      refresh: vi.fn(),
    });
    localStorage.clear();
    setupDefaultMocks();
  });

  // ─── Empty / Loading States ───────────────────────────────────────────

  it("should show no companies message when no companies exist", async () => {
    mockUseCompany.mockReturnValue({
      selectedCompanyId: "",
      setSelectedCompanyId: vi.fn(),
      companies: [],
      loading: false,
      refresh: vi.fn(),
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("No tienes empresas registradas")).toBeInTheDocument();
    });
    expect(screen.getByText("Crear mi primera empresa")).toBeInTheDocument();
  });

  it("should show sync message when company is loading", () => {
    mockUseCompany.mockReturnValue({
      selectedCompanyId: "",
      setSelectedCompanyId: vi.fn(),
      companies: [{ id: "c1", name: "Co", sector_id: null }],
      loading: true,
      refresh: vi.fn(),
    });

    renderDashboardPage();

    expect(screen.getByText("Sincronizando...")).toBeInTheDocument();
  });

  // ─── Data Rendering ───────────────────────────────────────────────────

  it("should render StatCards with correct data", async () => {
    renderDashboardPage();
    await waitForData();

    await waitFor(() => {
      expect(screen.getByText("Score Global")).toBeInTheDocument();
    });
    // Score: avg(18+12+4+22) = 14
    expect(screen.getByText("14")).toBeInTheDocument();
    // Critical risks: 2 (levels >= 17)
    expect(screen.getByText("Riesgos Críticos")).toBeInTheDocument();
    // There are multiple "2" elements (critical count + action counts), 
    // so verify at least one exists
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    // Overdue actions: 1 (a1 due 2024-01-01 is past)
    expect(screen.getByText("Acciones Vencidas")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0")).toBeInTheDocument(); // evidences count = 0
  });

  it("should show greeting with user email prefix", async () => {
    renderDashboardPage();
    await waitForData();

    // User email prefix is "test"
    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });

  it("should show action progress items", async () => {
    renderDashboardPage();
    await waitForData();

    expect(screen.getByText("Completadas")).toBeInTheDocument();
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getByText("Vencidas")).toBeInTheDocument();
  });

  it("should render risks table with risk names", async () => {
    renderDashboardPage();
    await waitForData();

    expect(screen.getByText("Riesgos Recientes")).toBeInTheDocument();
    expect(screen.getByText("Riesgo Financiero")).toBeInTheDocument();
    expect(screen.getByText("Riesgo Legal")).toBeInTheDocument();
    expect(screen.getByText("Riesgo Operativo")).toBeInTheDocument();
    expect(screen.getByText("Riesgo de Seguridad")).toBeInTheDocument();
  });

  it("should show risk level badges", async () => {
    renderDashboardPage();
    await waitForData();

    await waitFor(() => {
      expect(screen.getByText("18")).toBeInTheDocument();
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
  });

  it("should render chart title", async () => {
    renderDashboardPage();
    await waitForData();

    expect(screen.getByText("Distribución de Riesgos por Nivel")).toBeInTheDocument();
  });

  it("should show compliance percentage", async () => {
    renderDashboardPage();
    await waitForData();

    // 1 completed action / 4 total risks = 25%
    await waitFor(() => {
      expect(screen.getByText("25%")).toBeInTheDocument();
    });
  });

  it("should show empty state when no risks exist", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "risks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [{ id: 'dummy' }], count: 0, error: null }),
      };
    });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText("Score Global")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("No hay riesgos registrados para esta empresa")).toBeInTheDocument();
    });
  });

  it("should show navigation buttons", async () => {
    renderDashboardPage();
    await waitForData();

    expect(screen.getByText("Ver Riesgos")).toBeInTheDocument();
    expect(screen.getByText("Generar Reporte")).toBeInTheDocument();
  });
});

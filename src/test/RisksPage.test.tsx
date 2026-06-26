import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RisksPage from "@/pages/RisksPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseAuth, mockUseCompany, mockUseQuery } = vi.hoisted(() => {
  const mockUseAuth = vi.fn(() => ({
    user: { id: "user-1", email: "admin@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" },
    session: null,
    role: "admin",
    loading: false,
    plan: null,
    subscription: { status: "active", isBlocked: false, isGracePeriod: false, daysRemaining: 30, endDate: "2026-12-31" },
    mfaRequired: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    checkMfaStatus: vi.fn(),
  }));

  const mockUseCompany = vi.fn(() => ({
    selectedCompanyId: "company-1",
    companies: [{ id: "company-1", name: "Test Corp", sector_id: "sector-1" }],
    setSelectedCompanyId: vi.fn(),
    refresh: vi.fn(),
  }));

  const mockUseQuery = vi.fn();

  return { mockUseAuth, mockUseCompany, mockUseQuery };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: mockUseCompany,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    auth: {
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/safeCacheClear", () => ({
  safeCacheClear: vi.fn(),
  hardCacheClear: vi.fn(),
}));

vi.mock("@/lib/export", () => ({
  exportToExcel: vi.fn(),
}));

// Mock child components that make their own supabase calls
vi.mock("@/components/ai/RiskPredictionDashboard", () => ({
  RiskPredictionDashboard: ({ companyId }: { companyId: string }) =>
    companyId ? <div data-testid="risk-prediction-dashboard" /> : null,
}));

vi.mock("@/components/RiskAssessmentWizard", () => ({
  RiskAssessmentWizard: () => <div data-testid="risk-assessment-wizard" />,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...(actual as object),
    useQuery: mockUseQuery,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ─── Test Data ──────────────────────────────────────────────────────────────

const STANDARDS_MAP = new Map([
  ["standard-1", { id: "standard-1", name: "ISO 27001", code: "ISO27001" }],
]);

const MOCK_RISKS = [
  { id: "risk-1", company_id: "company-1", name: "Falla en sistema de pagos", description: "Riesgo de indisponibilidad", type: "operational", probability: 4, impact: 5, risk_level: 20, status: "active", owner_id: "user-1", created_at: "2026-06-01", standard_id: "standard-1" },
  { id: "risk-2", company_id: "company-1", name: "Incumplimiento normativo", description: null, type: "legal", probability: 3, impact: 4, risk_level: 12, status: "active", owner_id: "user-1", created_at: "2026-06-05", standard_id: null },
  { id: "risk-3", company_id: "company-1", name: "Riesgo financiero", description: "Exposición cambiaria", type: "financial", probability: 2, impact: 3, risk_level: 6, status: "mitigated", owner_id: "user-1", created_at: "2026-06-10", standard_id: null },
  { id: "risk-4", company_id: "company-1", name: "Fuga de datos", description: null, type: "security", probability: 3, impact: 5, risk_level: 15, status: "active", owner_id: "user-1", created_at: "2026-06-15", standard_id: null },
  { id: "risk-5", company_id: "company-1", name: "Bajo riesgo operativo", description: "Riesgo menor", type: "operational", probability: 1, impact: 2, risk_level: 2, status: "pending_review", owner_id: "user-1", created_at: "2026-06-20", standard_id: null },
];

const MOCK_TEMPLATES = [
  { id: "template-1", name: "Riesgo de ciberseguridad", description: "Riesgo de ataque informático", type: "security", probability: 4, impact: 5, recommended_actions: "Implementar firewall|Capacitar personal", sector_id: "sector-1" },
];

const QUERY_RESULT = {
  r: MOCK_RISKS,
  t: MOCK_TEMPLATES,
  standardsMap: STANDARDS_MAP,
};

const EMPTY_QUERY_RESULT = {
  r: [],
  t: [],
  standardsMap: new Map(),
};

// Empty risks BUT with templates (so the wizard button shows)
const EMPTY_WITH_TEMPLATES = {
  r: [],
  t: MOCK_TEMPLATES,
  standardsMap: new Map(),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderRisksPage() {
  return render(
    <MemoryRouter>
      <RisksPage />
    </MemoryRouter>
  );
}

function setupDataMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
    if (options.queryKey[0] === "risks-data") {
      return { data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() };
    }
    return { data: undefined, isLoading: false, error: null };
  });
}

function setupEmptyMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
    if (options.queryKey[0] === "risks-data") {
      return { data: EMPTY_QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() };
    }
    return { data: undefined, isLoading: false, error: null };
  });
}

function setupLoadingMocks() {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  });
}

function setupErrorMocks() {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error("Error de conexión"),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("RisksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Page structure", () => {
    it("should render the page title and description", () => {
      setupDataMocks();
      renderRisksPage();

      expect(screen.getByText("Gestión de Riesgos")).toBeInTheDocument();
      expect(
        screen.getByText(/Identifica, analiza y mitiga riesgos/)
      ).toBeInTheDocument();
    });

    it("should render action buttons: Export, Templates, New Risk", () => {
      setupDataMocks();
      renderRisksPage();

      expect(screen.getByText("Exportar Excel")).toBeInTheDocument();
      expect(screen.getByText("Plantillas")).toBeInTheDocument();
      expect(screen.getByText("Nuevo Riesgo")).toBeInTheDocument();
    });
  });

  describe("Stat cards", () => {
    it("should render stat cards with correct values", async () => {
      setupDataMocks();
      renderRisksPage();

      // 5 risks total, 3 active (risk-1, risk-2, risk-4), 1 critical (risk-1 = 20≥17), 2 high (risk-2=12, risk-4=15)
      await waitFor(() => {
        expect(screen.getByText("5")).toBeInTheDocument();
      });
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should show skeleton placeholders when loading", () => {
      setupLoadingMocks();
      renderRisksPage();

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Empty state", () => {
    it("should show empty state message when no risks exist", () => {
      mockUseQuery.mockReturnValue({
        data: EMPTY_WITH_TEMPLATES,
        isLoading: false,
        error: null,
      });
      renderRisksPage();

      expect(screen.getByText("Sin riesgos registrados")).toBeInTheDocument();
      expect(screen.getByText("Asistente de Identificación")).toBeInTheDocument();
      expect(screen.getByText("Crear Riesgo Manualmente")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show error banner with retry buttons", () => {
      setupErrorMocks();
      renderRisksPage();

      expect(screen.getByText(/Error de Carga/)).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
      expect(screen.getByText("Reparar Conexión")).toBeInTheDocument();
    });
  });

  describe("Risk table", () => {
    it("should render risk names in the table", async () => {
      setupDataMocks();
      renderRisksPage();

      await waitFor(() => {
        expect(screen.getByText("Falla en sistema de pagos")).toBeInTheDocument();
      });
      expect(screen.getByText("Incumplimiento normativo")).toBeInTheDocument();
      expect(screen.getByText("Riesgo financiero")).toBeInTheDocument();
      expect(screen.getByText("Fuga de datos")).toBeInTheDocument();
      expect(screen.getByText("Bajo riesgo operativo")).toBeInTheDocument();
    });

    it("should render risk type badges", async () => {
      setupDataMocks();
      renderRisksPage();

      // TypeBadge renders localized text: Operativo, Legal, Financiero, Seguridad
      await waitFor(() => {
        expect(screen.getAllByText("Operativo").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText("Legal")).toBeInTheDocument();
      expect(screen.getByText("Financiero")).toBeInTheDocument();
      expect(screen.getByText("Seguridad")).toBeInTheDocument();
    });

    it("should render risk level badges with correct values", async () => {
      setupDataMocks();
      renderRisksPage();

      // RiskLevelBadge renders "Crítico (20)" — also appears in stat card "Críticos (≥17)"
      await waitFor(() => {
        expect(screen.getAllByText(/Crítico/).length).toBeGreaterThanOrEqual(1);
      });
      // "Alto" appears in stat card "Altos (10-16)" AND badge "Alto (12)"
      expect(screen.getAllByText(/Alto/).length).toBeGreaterThanOrEqual(1);
    });

    it("should display standard code for risks with standard assigned", async () => {
      setupDataMocks();
      renderRisksPage();

      await waitFor(() => {
        expect(screen.getByText("ISO27001")).toBeInTheDocument();
      });
    });
  });

  describe("Search and pagination", () => {
    it("should filter risks by search input", async () => {
      setupDataMocks();
      renderRisksPage();

      await waitFor(() => {
        expect(screen.getByText("Falla en sistema de pagos")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Buscar riesgos...");
      fireEvent.change(searchInput, { target: { value: "fuga" } });

      expect(screen.getByText("Fuga de datos")).toBeInTheDocument();
      expect(screen.queryByText("Incumplimiento normativo")).not.toBeInTheDocument();
    });

    it("should show pagination when risk count exceeds page size", () => {
      // Create 12 risks to exceed default ITEMS_PER_PAGE (10)
      const manyRisks = Array.from({ length: 12 }, (_, i) => ({
        id: `risk-${i + 10}`,
        company_id: "company-1",
        name: `Riesgo ${i + 1}`,
        description: null,
        type: "operational" as const,
        probability: 3,
        impact: 3,
        risk_level: 9,
        status: "active" as const,
        owner_id: "user-1",
        created_at: "2026-06-01",
        standard_id: null,
      }));

      mockUseQuery.mockReturnValue({
        data: { r: manyRisks, t: [], standardsMap: new Map() },
        isLoading: false,
        error: null,
      });

      renderRisksPage();

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("Risk dialog", () => {
    it("should open create dialog when clicking 'Nuevo Riesgo'", () => {
      setupDataMocks();
      renderRisksPage();

      // Click the first "Nuevo Riesgo" (header button, not dialog title)
      const buttons = screen.getAllByText("Nuevo Riesgo");
      fireEvent.click(buttons[0]);

      // Dialog opens - now both the button AND dialog title show "Nuevo Riesgo"
      expect(screen.getAllByText("Nuevo Riesgo").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByPlaceholderText("Ej: Falla en sistema de pagos")).toBeInTheDocument();
    });
  });

  describe("Template dialog", () => {
    it("should open template dialog when clicking 'Plantillas'", () => {
      setupDataMocks();
      renderRisksPage();

      fireEvent.click(screen.getByText("Plantillas"));

      expect(screen.getByText("Plantillas de Riesgos por Sector")).toBeInTheDocument();
      expect(screen.getByText("Riesgo de ciberseguridad")).toBeInTheDocument();
    });
  });

  describe("Export", () => {
    it("should render export button and not throw on click", () => {
      setupDataMocks();
      renderRisksPage();

      const btn = screen.getByText("Exportar Excel");
      expect(btn).toBeInTheDocument();
      // Click should not throw (function is mocked via vi.mock)
      expect(() => fireEvent.click(btn)).not.toThrow();
    });
  });
});

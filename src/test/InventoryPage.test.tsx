import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import InventoryPage from "@/pages/InventoryPage";
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
    companies: [{ id: "company-1", name: "TechCorp S.A.", sector_id: "sector-tech" }],
    setSelectedCompanyId: vi.fn(),
    refresh: vi.fn(),
  }));

  const mockUseQuery = vi.fn(() => ({
    data: { risks: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }));

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

vi.mock("@/lib/supabaseSafe", () => ({
  WITH_TIMEOUT: async (fn: () => Promise<any>, _ms: number, _msg: string) => fn(),
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

const MOCK_RISKS = [
  { id: "risk-1", name: "Ransomware en servidores", description: "Cifrado de datos críticos", type: "security", probability: 5, impact: 5, risk_level: 25, status: "active", created_at: "2026-06-01" },
  { id: "risk-2", name: "Fuga de datos por phishing", description: "Robo de credenciales", type: "security", probability: 4, impact: 4, risk_level: 16, status: "active", created_at: "2026-06-05" },
  { id: "risk-3", name: "Vulnerabilidad en firewall", description: null, type: "security", probability: 3, impact: 3, risk_level: 9, status: "mitigated", created_at: "2026-06-10" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderInventoryPage() {
  return render(
    <MemoryRouter>
      <InventoryPage />
    </MemoryRouter>
  );
}

function setupDataMocks() {
  mockUseQuery.mockReturnValue({
    data: { risks: MOCK_RISKS },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function setupEmptyMocks() {
  mockUseQuery.mockReturnValue({
    data: { risks: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function setupLoadingMocks() {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("InventoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to defaults (clearAllMocks does not clear mockReturnValue overrides)
    mockUseCompany.mockReset();
    mockUseCompany.mockImplementation(() => ({
      selectedCompanyId: "company-1",
      companies: [{ id: "company-1", name: "TechCorp S.A.", sector_id: "sector-tech" }],
      setSelectedCompanyId: vi.fn(),
      refresh: vi.fn(),
    }));
    // Default mockUseQuery return value
    mockUseQuery.mockReturnValue({
      data: { risks: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  describe("No company selected", () => {
    it("should show select-company message when no company is selected", () => {
      mockUseCompany.mockImplementation(() => ({
        selectedCompanyId: null,
        companies: [],
        setSelectedCompanyId: vi.fn(),
        refresh: vi.fn(),
      }));

      renderInventoryPage();

      expect(screen.getByText(/Selecciona una empresa/i)).toBeInTheDocument();
      expect(screen.getByText(/inventario de ciberseguridad/i)).toBeInTheDocument();
    });
  });

  describe("Page structure", () => {
    it("should render the page title and description", () => {
      setupDataMocks();
      renderInventoryPage();

      expect(screen.getByText("Ciberseguridad")).toBeInTheDocument();
      expect(
        screen.getByText(/Gestión y evaluación de riesgos informáticos/i)
      ).toBeInTheDocument();
    });

    it("should render action buttons: Actualizar and Evaluar Ciberseguridad", () => {
      setupDataMocks();
      renderInventoryPage();

      expect(screen.getByText("Actualizar")).toBeInTheDocument();
      expect(screen.getByText("Evaluar Ciberseguridad")).toBeInTheDocument();
    });

    it("should show company name in description", () => {
      setupDataMocks();
      renderInventoryPage();

      expect(screen.getByText(/TechCorp S.A./)).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show loading spinner when isLoading is true", () => {
      setupLoadingMocks();
      renderInventoryPage();

      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Stat cards", () => {
    it("should render stat cards with correct values", async () => {
      setupDataMocks();
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument();
      });
      expect(screen.getByText("Total Riesgos IT")).toBeInTheDocument();

      // 3 cards show "1" (critical=1, high=1, minor=1)
      expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
      expect(screen.getByText("Críticos")).toBeInTheDocument();
      expect(screen.getByText("Altos")).toBeInTheDocument();
      expect(screen.getByText("Menores / Controlados")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should show empty state message when no risks exist", () => {
      setupEmptyMocks();
      renderInventoryPage();

      expect(screen.getByText(/No se han evaluado riesgos de ciberseguridad/i)).toBeInTheDocument();
      expect(screen.getByText("Iniciar Evaluación Cibernética")).toBeInTheDocument();
    });
  });

  describe("Risk list", () => {
    it("should render risk names in the list", async () => {
      setupDataMocks();
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByText("Ransomware en servidores")).toBeInTheDocument();
      });
      expect(screen.getByText("Fuga de datos por phishing")).toBeInTheDocument();
      expect(screen.getByText("Vulnerabilidad en firewall")).toBeInTheDocument();
    });

    it("should render risk level badges", async () => {
      setupDataMocks();
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByText("Nivel 25")).toBeInTheDocument();
      });
      expect(screen.getByText("Nivel 16")).toBeInTheDocument();
      expect(screen.getByText("Nivel 9")).toBeInTheDocument();
    });

    it("should show fallback description text for risks without description", async () => {
      setupDataMocks();
      renderInventoryPage();

      await waitFor(() => {
        expect(screen.getByText("Sin descripción")).toBeInTheDocument();
      });
    });
  });

  describe("Wizard dialog", () => {
    it("should open RiskAssessmentWizard when clicking 'Evaluar Ciberseguridad'", () => {
      setupDataMocks();
      renderInventoryPage();

      fireEvent.click(screen.getByText("Evaluar Ciberseguridad"));

      expect(screen.getByTestId("risk-assessment-wizard")).toBeInTheDocument();
    });

    it("should open wizard from empty state button", () => {
      setupEmptyMocks();
      renderInventoryPage();

      fireEvent.click(screen.getByText("Iniciar Evaluación Cibernética"));

      expect(screen.getByTestId("risk-assessment-wizard")).toBeInTheDocument();
    });
  });
});

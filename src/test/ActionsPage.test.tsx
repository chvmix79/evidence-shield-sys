import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ActionsPage from "@/pages/ActionsPage";
import React from "react";
import { BrowserRouter } from "react-router-dom";

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
  supabase: { from: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
  { id: "risk-1", name: "Riesgo Financiero", risk_level: 15 },
  { id: "risk-2", name: "Riesgo Legal", risk_level: 8 },
];

const MOCK_ACTIONS = [
  { id: "action-1", description: "Implementar control interno", responsible: "Juan Pérez", due_date: "2026-07-15", status: "pending", risk_id: "risk-1", created_at: "2026-06-01" },
  { id: "action-2", description: "Auditar cumplimiento legal", responsible: "María García", due_date: "2026-08-01", status: "in_progress", risk_id: "risk-2", created_at: "2026-06-05" },
  { id: "action-3", description: "Capacitar al personal", responsible: "Carlos López", due_date: "2025-01-01", status: "completed", risk_id: "risk-1", created_at: "2026-06-10" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderActionsPage() {
  return render(
    <BrowserRouter>
      <ActionsPage />
    </BrowserRouter>
  );
}

/**
 * Configura los mocks de useQuery para que devuelvan datos controlados.
 * ActionsPage tiene 2 queries:
 * 1. ["risks-for-actions", "company-1"] → risksData (para el dropdown)
 * 2. ["actions-list", "company-1"] → actionsData (tabla principal)
 */
function setupDataMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[]; queryFn?: () => unknown }) => {
    const key = options.queryKey[0];

    if (key === "risks-for-actions") {
      return { data: MOCK_RISKS, isLoading: false, error: null };
    }
    if (key === "actions-list") {
      const risksMap: Record<string, (typeof MOCK_RISKS)[0]> = {};
      MOCK_RISKS.forEach(r => { risksMap[r.id] = r; });
      return {
        data: { actions: MOCK_ACTIONS, risksMap },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: [], isLoading: false, error: null };
  });
}

function setupEmptyMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
    const key = options.queryKey[0];
    if (key === "risks-for-actions") {
      return { data: MOCK_RISKS, isLoading: false, error: null };
    }
    if (key === "actions-list") {
      return { data: { actions: [], risksMap: {} }, isLoading: false, error: null, refetch: vi.fn() };
    }
    return { data: [], isLoading: false, error: null };
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

describe("ActionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty states", () => {
    it("should render title even without company selected", async () => {
      mockUseCompany.mockReturnValue({
        selectedCompanyId: "",
        companies: [],
        setSelectedCompanyId: vi.fn(),
        refresh: vi.fn(),
      });
      setupDataMocks();

      renderActionsPage();

      await waitFor(() => {
        expect(screen.getByText("Plan de Acción")).toBeInTheDocument();
      });
    });

    it("should show 'no actions' message when list is empty", async () => {
      setupEmptyMocks();
      renderActionsPage();

      await waitFor(() => {
        expect(screen.getByText("No hay acciones registradas")).toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("should render skeleton while loading", () => {
      setupLoadingMocks();
      renderActionsPage();

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Data rendering", () => {
    it("should render the page title and description", async () => {
      setupDataMocks();
      renderActionsPage();

      await waitFor(() => {
        expect(screen.getByText("Plan de Acción")).toBeInTheDocument();
      });
      expect(screen.getByText("Gestiona las acciones correctivas para cada riesgo")).toBeInTheDocument();
    });

    it("should render stat cards with labels", async () => {
      setupDataMocks();
      renderActionsPage();

      await waitFor(() => {
        expect(screen.getByText("Pendientes")).toBeInTheDocument();
      });
      // Use getAllByText because "En Proceso" appears in stat card AND status badge
      expect(screen.getAllByText("En Proceso").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Completadas")).toBeInTheDocument();
    });

    it("should display action descriptions in the table", async () => {
      setupDataMocks();
      renderActionsPage();

      await waitFor(() => {
        expect(screen.getByText("Implementar control interno")).toBeInTheDocument();
      });
      expect(screen.getByText("Auditar cumplimiento legal")).toBeInTheDocument();
      expect(screen.getByText("Capacitar al personal")).toBeInTheDocument();
    });

    it("should display risk names and responsible persons", async () => {
      setupDataMocks();
      renderActionsPage();

      await waitFor(() => {
        // Riesgo Financiero appears twice (linked to 2 actions)
        expect(screen.getAllByText("Riesgo Financiero").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("María García")).toBeInTheDocument();
    });

    it("should render search input and action buttons", async () => {
      setupDataMocks();
      renderActionsPage();

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Buscar acciones...")).toBeInTheDocument();
      });
      expect(screen.getByText("Nueva Acción")).toBeInTheDocument();
      expect(screen.getByText("Exportar")).toBeInTheDocument();
    });
  });
});

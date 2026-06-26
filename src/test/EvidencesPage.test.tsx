import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import EvidencesPage from "@/pages/EvidencesPage";
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
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
    auth: { refreshSession: vi.fn() },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/file.pdf" } })),
        remove: vi.fn(),
      })),
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
  WITH_TIMEOUT: vi.fn((promise) => promise),
}));

vi.mock("@/lib/safeCacheClear", () => ({
  safeCacheClear: vi.fn(),
  hardCacheClear: vi.fn(),
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
  { id: "risk-1", name: "Riesgo Financiero" },
  { id: "risk-2", name: "Riesgo Legal" },
];

const MOCK_ACTIONS = [
  { id: "action-1", description: "Implementar control interno", risk_id: "risk-1", risks: { company_id: "company-1" } },
];

const MOCK_EVIDENCES = [
  { id: "ev-1", name: "Reporte auditoría Q1.pdf", description: "Evidencia de cumplimiento", file_url: "https://example.com/reporte.pdf", file_type: "application/pdf", file_size: 102400, action_id: null, risk_id: "risk-1", owner_id: "user-1", created_at: "2026-06-15T10:00:00Z", risks: { name: "Riesgo Financiero" }, actions: null },
  { id: "ev-2", name: "Captura de pantalla.png", description: null, file_url: "https://example.com/screenshot.png", file_type: "image/png", file_size: 2048000, action_id: "action-1", risk_id: null, owner_id: "user-1", created_at: "2026-06-10T08:00:00Z", risks: null, actions: { description: "Implementar control interno" } },
  { id: "ev-3", name: "Documento sin archivo.docx", description: "Evidencia sin subida", file_url: null, file_type: null, file_size: null, action_id: null, risk_id: null, owner_id: "user-1", created_at: "2026-06-05T12:00:00Z", risks: null, actions: null },
];

const QUERY_RESULT = {
  evidences: MOCK_EVIDENCES,
  risks: MOCK_RISKS,
  actions: MOCK_ACTIONS,
};

const EMPTY_QUERY_RESULT = {
  evidences: [],
  risks: [],
  actions: [],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderEvidencesPage() {
  return render(
    <MemoryRouter>
      <EvidencesPage />
    </MemoryRouter>
  );
}

function setupDataMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
    if (options.queryKey[0] === "evidences") {
      return { data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() };
    }
    return { data: undefined, isLoading: false, error: null };
  });
}

function setupEmptyMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
    if (options.queryKey[0] === "evidences") {
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

describe("EvidencesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Page structure", () => {
    it("should render the page title and description", () => {
      setupDataMocks();
      renderEvidencesPage();

      expect(screen.getByText("Evidencias")).toBeInTheDocument();
      expect(screen.getByText(/Sube y gestiona archivos de evidencia/)).toBeInTheDocument();
    });

    it("should render 'Nueva Evidencia' button", () => {
      setupDataMocks();
      renderEvidencesPage();

      expect(screen.getByText("Nueva Evidencia")).toBeInTheDocument();
    });

    it("should render search input", () => {
      setupDataMocks();
      renderEvidencesPage();

      expect(screen.getByPlaceholderText("Buscar evidencias...")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show skeleton placeholders while loading", () => {
      setupLoadingMocks();
      renderEvidencesPage();

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Empty state", () => {
    it("should show empty message when no evidences exist", () => {
      setupEmptyMocks();
      renderEvidencesPage();

      expect(screen.getByText("No hay evidencias registradas")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show error banner with retry buttons", () => {
      setupErrorMocks();
      renderEvidencesPage();

      expect(screen.getByText(/Error de Carga/)).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
      expect(screen.getByText("Reparar Conexión")).toBeInTheDocument();
    });
  });

  describe("Evidence list", () => {
    it("should render evidence names", async () => {
      setupDataMocks();
      renderEvidencesPage();

      await waitFor(() => {
        expect(screen.getByText("Reporte auditoría Q1.pdf")).toBeInTheDocument();
      });
      expect(screen.getByText("Captura de pantalla.png")).toBeInTheDocument();
      expect(screen.getByText("Documento sin archivo.docx")).toBeInTheDocument();
    });

    it("should display associated risk names", async () => {
      setupDataMocks();
      renderEvidencesPage();

      // Risk name appears in text like "📌 Riesgo Financiero"
      await waitFor(() => {
        expect(screen.getByText(/Riesgo Financiero/)).toBeInTheDocument();
      });
    });

    it("should display formatted file sizes", async () => {
      setupDataMocks();
      renderEvidencesPage();

      await waitFor(() => {
        expect(screen.getByText("100.0 KB")).toBeInTheDocument();
      });
    });
  });

  describe("Search", () => {
    it("should filter evidences by search input", async () => {
      setupDataMocks();
      renderEvidencesPage();

      await waitFor(() => {
        expect(screen.getByText("Reporte auditoría Q1.pdf")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Buscar evidencias...");
      fireEvent.change(searchInput, { target: { value: "pantalla" } });

      expect(screen.getByText("Captura de pantalla.png")).toBeInTheDocument();
      expect(screen.queryByText("Reporte auditoría Q1.pdf")).not.toBeInTheDocument();
    });
  });

  describe("Create dialog", () => {
    it("should open create dialog when clicking 'Nueva Evidencia'", () => {
      setupDataMocks();
      renderEvidencesPage();

      const buttons = screen.getAllByText("Nueva Evidencia");
      fireEvent.click(buttons[0]);

      // Button + dialog title both show "Nueva Evidencia"
      expect(screen.getAllByText("Nueva Evidencia").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByPlaceholderText("Ej: Reporte de auditoría Q1 2026")).toBeInTheDocument();
      expect(screen.getByText("Haz clic para subir archivo")).toBeInTheDocument();
    });
  });
});

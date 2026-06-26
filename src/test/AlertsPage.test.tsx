import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AlertsPage from "@/pages/AlertsPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseQuery, mockUseQueryClient } = vi.hoisted(() => {
  return {
    mockUseQuery: vi.fn(),
    mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@test.com" },
  }),
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    companies: [{ id: "company-1", name: "Test Corp" }],
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...(actual as object),
    useQuery: mockUseQuery,
    useQueryClient: mockUseQueryClient,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ─── Test Data ──────────────────────────────────────────────────────────────

const MOCK_ALERTS = [
  {
    id: "alert-1",
    type: "critical_risk",
    title: "Riesgo crítico detectado",
    description: "El riesgo 'Falla en sistema' tiene nivel crítico (20)",
    is_read: false,
    created_at: "2026-06-15T10:00:00Z",
    company_id: "company-1",
  },
  {
    id: "alert-2",
    type: "overdue_action",
    title: "Acción vencida",
    description: "La acción 'Implementar parche' venció",
    is_read: false,
    created_at: "2026-06-14T08:00:00Z",
    company_id: "company-1",
  },
  {
    id: "alert-3",
    type: "info",
    title: "Nueva actualización disponible",
    description: null,
    is_read: true,
    created_at: "2026-06-10T12:00:00Z",
    company_id: "company-1",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderAlertsPage() {
  return render(<MemoryRouter><AlertsPage /></MemoryRouter>);
}

function setupDataMocks() {
  mockUseQuery.mockReturnValue({
    data: MOCK_ALERTS,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function setupEmptyMocks() {
  mockUseQuery.mockReturnValue({
    data: [],
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

function setupErrorMocks() {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error("Error al cargar alertas"),
    refetch: vi.fn(),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AlertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page structure", () => {
    it("should render the page title and description", () => {
      setupDataMocks();
      renderAlertsPage();

      expect(screen.getByText("Alertas")).toBeInTheDocument();
      expect(screen.getByText(/Notificaciones del sistema de riesgos/)).toBeInTheDocument();
    });

    it("should render 'Actualizar' button", () => {
      setupDataMocks();
      renderAlertsPage();

      expect(screen.getByText("Actualizar")).toBeInTheDocument();
    });

    it("should show unread count badge when unread alerts exist", () => {
      setupDataMocks();
      renderAlertsPage();

      // 2 unread alerts (alert-1, alert-2), 1 read (alert-3)
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should show 'Marcar todas' button when unread > 0", () => {
      setupDataMocks();
      renderAlertsPage();

      expect(screen.getByText("Marcar todas")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show loading text while fetching", () => {
      setupLoadingMocks();
      renderAlertsPage();

      expect(screen.getByText("Cargando alertas...")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should show empty message when no alerts exist", () => {
      setupEmptyMocks();
      renderAlertsPage();

      expect(screen.getByText("No hay alertas")).toBeInTheDocument();
    });

    it("should show scan button in empty state", () => {
      setupEmptyMocks();
      renderAlertsPage();

      expect(screen.getByText("Escanear Riesgos y Acciones")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show error banner with retry button", () => {
      setupErrorMocks();
      renderAlertsPage();

      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
    });
  });

  describe("Alert list", () => {
    it("should render alert titles", () => {
      setupDataMocks();
      renderAlertsPage();

      expect(screen.getByText("Riesgo crítico detectado")).toBeInTheDocument();
      expect(screen.getByText("Acción vencida")).toBeInTheDocument();
      expect(screen.getByText("Nueva actualización disponible")).toBeInTheDocument();
    });

    it("should render alert type badges", () => {
      setupDataMocks();
      renderAlertsPage();

      expect(screen.getByText("Riesgo Crítico")).toBeInTheDocument();
      expect(screen.getByText("Acción Vencida")).toBeInTheDocument();
      expect(screen.getByText("Información")).toBeInTheDocument();
    });

    it("should show 'Marcar leída' button for unread alerts only", () => {
      setupDataMocks();
      renderAlertsPage();

      // 2 unread alerts => 2 "Marcar leída" buttons
      expect(screen.getAllByText("Marcar leída").length).toBe(2);
    });
  });

  describe("Read/unread styling", () => {
    it("should not have 'Marcar todas' nor unread badge when all read", () => {
      setupDataMocks();
      // Override to all read
      mockUseQuery.mockReturnValue({
        data: MOCK_ALERTS.map(a => ({ ...a, is_read: true })),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
      renderAlertsPage();

      expect(screen.queryByText("Marcar todas")).not.toBeInTheDocument();
      expect(screen.queryByText(/^\\d+$/)).not.toBeInTheDocument();
    });
  });
});

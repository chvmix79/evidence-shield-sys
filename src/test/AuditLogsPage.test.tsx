import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AuditLogsPage from "@/pages/AuditLogsPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseQuery } = vi.hoisted(() => {
  const mockUseQuery = vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  }));

  return { mockUseQuery };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...(actual as object),
    useQuery: mockUseQuery,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: { refreshSession: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Test Data ──────────────────────────────────────────────────────────────

const MOCK_LOGS = [
  {
    id: "log-1",
    created_at: "2026-06-15T10:30:00Z",
    action: "DELETE",
    entity_type: "companies",
    user_id: "user-1",
    old_data: { name: "Old Corp" },
    userEmail: "admin@test.com",
  },
  {
    id: "log-2",
    created_at: "2026-06-14T08:15:00Z",
    action: "UPDATE",
    entity_type: "risks",
    user_id: "user-2",
    old_data: { risk_level: 12 },
    userEmail: "analyst@test.com",
  },
  {
    id: "log-3",
    created_at: "2026-06-13T14:00:00Z",
    action: "INSERT",
    entity_type: "audit_sessions",
    user_id: null,
    old_data: null,
    userEmail: "Sistema / Externo",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <AuditLogsPage />
    </MemoryRouter>
  );
}

function setupDataMocks() {
  mockUseQuery.mockReturnValue({
    data: MOCK_LOGS,
    isLoading: false,
    error: null,
  });
}

function setupEmptyMocks() {
  mockUseQuery.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
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
    data: [],
    isLoading: false,
    error: new Error("Error de conexión"),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AuditLogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page structure", () => {
    it("should render the page title and description", () => {
      setupDataMocks();
      renderPage();

      expect(screen.getByText("Auditoría de Sistema")).toBeInTheDocument();
      expect(
        screen.getByText(/Registro inmutable de actividades/)
      ).toBeInTheDocument();
    });

    it("should render the card title and description", () => {
      setupDataMocks();
      renderPage();

      expect(screen.getByText(/Historial Reciente/)).toBeInTheDocument();
      expect(screen.getByText(/eventos interceptados/)).toBeInTheDocument();
    });

    it("should render table headers", () => {
      setupDataMocks();
      renderPage();

      expect(screen.getByText("Fecha / Hora")).toBeInTheDocument();
      expect(screen.getByText("Acción")).toBeInTheDocument();
      expect(screen.getByText("Entidad (Tabla)")).toBeInTheDocument();
      expect(screen.getByText("Usuario Modificador")).toBeInTheDocument();
      expect(screen.getByText("Detalles Técnicos")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show loading text when isLoading is true", () => {
      setupLoadingMocks();
      renderPage();

      expect(screen.getByText(/Cargando eventos/)).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should show empty state message when no logs exist", () => {
      setupEmptyMocks();
      renderPage();

      expect(
        screen.getByText(/No hay registros de auditoría/)
      ).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show empty state when error occurs (component returns [])", () => {
      setupErrorMocks();
      renderPage();

      // Component returns [] on error, showing empty state
      expect(
        screen.getByText(/No hay registros de auditoría/)
      ).toBeInTheDocument();
    });
  });

  describe("Log entries", () => {
    it("should render log action badges", async () => {
      setupDataMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("DELETE")).toBeInTheDocument();
      });
      expect(screen.getByText("UPDATE")).toBeInTheDocument();
      expect(screen.getByText("INSERT")).toBeInTheDocument();
    });

    it("should render entity types", async () => {
      setupDataMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/companies/)).toBeInTheDocument();
      });
      expect(screen.getByText(/risks/)).toBeInTheDocument();
      expect(screen.getByText(/audit sessions/)).toBeInTheDocument();
    });

    it("should render user emails", async () => {
      setupDataMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("admin@test.com")).toBeInTheDocument();
      });
      expect(screen.getByText("analyst@test.com")).toBeInTheDocument();
      expect(screen.getByText("Sistema / Externo")).toBeInTheDocument();
    });

    it("should render old_data details", async () => {
      setupDataMocks();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Old Corp/)).toBeInTheDocument();
      });
    });

    it("should show 'Sin detalles' for logs without old_data", async () => {
      setupDataMocks();
      renderPage();

      await waitFor(() => {
        // log-3 has null old_data, shows "Sin detalles"
        expect(screen.getAllByText("Sin detalles").length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});

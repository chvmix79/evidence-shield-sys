import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ReportsPage from "@/pages/ReportsPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseCompany, mockUseQuery } = vi.hoisted(() => {
  const mockUseCompany = vi.fn(() => ({
    selectedCompanyId: "company-1",
    companies: [{ id: "company-1", name: "Test Corp", sector_id: "sector-1" }],
    setSelectedCompanyId: vi.fn(),
    refresh: vi.fn(),
  }));

  const mockUseQuery = vi.fn();

  return { mockUseCompany, mockUseQuery };
});

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
    })),
    auth: { refreshSession: vi.fn() },
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

// Mock jspdf and jspdf-autotable to prevent actual file generation
vi.mock("jspdf", () => {
  const MockJsPDF = vi.fn(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFontSize: vi.fn(),
    text: vi.fn(),
    setFillColor: vi.fn(),
    rect: vi.fn(),
    setTextColor: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: () => 1,
    setPage: vi.fn(),
    save: vi.fn(),
  }));
  return { default: MockJsPDF };
});

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

// Mock recharts to avoid ResizeObserver/SVG measurement issues in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
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
  { id: "risk-1", name: "Falla en sistema", type: "operational", risk_level: 20, status: "active", description: null, companies: { name: "Test Corp" } },
  { id: "risk-2", name: "Incumplimiento legal", type: "legal", risk_level: 12, status: "active", description: null, companies: { name: "Test Corp" } },
  { id: "risk-3", name: "Riesgo financiero menor", type: "financial", risk_level: 6, status: "mitigated", description: null, companies: { name: "Test Corp" } },
];

const MOCK_ACTIONS = [
  { id: "action-1", description: "Implementar parche de seguridad", responsible: "Juan Pérez", due_date: "2026-07-15", status: "pending", risks: { name: "Falla en sistema" } },
  { id: "action-2", description: "Actualizar políticas de compliance", responsible: "María García", due_date: "2026-08-01", status: "in_progress", risks: { name: "Incumplimiento legal" } },
  { id: "action-3", description: "Revisión de estados financieros", responsible: "Carlos López", due_date: "2026-06-01", status: "completed", risks: { name: "Riesgo financiero menor" } },
];

const MOCK_EVIDENCES = [
  { id: "ev-1", name: "Reporte auditoría.pdf", file_type: "pdf", created_at: "2026-06-01" },
];

const QUERY_RESULT = {
  risks: MOCK_RISKS,
  actions: MOCK_ACTIONS,
  evidences: MOCK_EVIDENCES,
  lastAudit: null,
};

const EMPTY_RESULT = {
  risks: [],
  actions: [],
  evidences: [],
  lastAudit: null,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderReportsPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>
  );
}

function setupDataMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
    if (options.queryKey[0] === "reports-data") {
      return { data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() };
    }
    return { data: undefined, isLoading: false, error: null };
  });
}

function setupEmptyMocks() {
  mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
    if (options.queryKey[0] === "reports-data") {
      return { data: EMPTY_RESULT, isLoading: false, error: null, refetch: vi.fn() };
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
    error: new Error("Error al cargar datos"),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Page structure", () => {
    it("should render the page title", () => {
      setupDataMocks();
      renderReportsPage();

      expect(screen.getByText("Reportes")).toBeInTheDocument();
    });

    it("should render the export PDF button", () => {
      setupDataMocks();
      renderReportsPage();

      expect(screen.getByText("Exportar PDF")).toBeInTheDocument();
    });
  });

  describe("Stat cards", () => {
    it("should render stat cards with correct values", async () => {
      setupDataMocks();
      renderReportsPage();

      // Score Global = avg of (20+12+6)/3 = 12.7
      await waitFor(() => {
        expect(screen.getByText("12.7")).toBeInTheDocument();
      });
      // "3" appears in both Total Riesgos and Acciones
      expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("1")).toBeInTheDocument(); // Evidencias
    });

    it("should render stat card labels", async () => {
      setupDataMocks();
      renderReportsPage();

      await waitFor(() => {
        expect(screen.getByText("Score Global")).toBeInTheDocument();
      });
      expect(screen.getByText("Total Riesgos")).toBeInTheDocument();
      expect(screen.getByText("Acciones")).toBeInTheDocument();
      expect(screen.getByText("Evidencias")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show error banner with retry buttons", () => {
      setupErrorMocks();
      renderReportsPage();

      expect(screen.getByText(/Error de Carga/)).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
      expect(screen.getByText("Reparar Reportes")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show loading text instead of tables", () => {
      setupLoadingMocks();
      renderReportsPage();

      expect(screen.getByText("Cargando...")).toBeInTheDocument();
    });
  });

  describe("Risk and action tables", () => {
    it("should render risk names in the inventory table", async () => {
      setupDataMocks();
      renderReportsPage();

      await waitFor(() => {
        // Risk names appear in risk table AND action's risk name column
        expect(screen.getAllByText("Falla en sistema").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getAllByText("Incumplimiento legal").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Riesgo financiero menor").length).toBeGreaterThanOrEqual(1);
    });

    it("should render action descriptions in the action plan table", async () => {
      setupDataMocks();
      renderReportsPage();

      await waitFor(() => {
        expect(screen.getByText("Implementar parche de seguridad")).toBeInTheDocument();
      });
      expect(screen.getByText("Actualizar políticas de compliance")).toBeInTheDocument();
      expect(screen.getByText("Revisión de estados financieros")).toBeInTheDocument();
    });

    it("should render risk badges in the table", async () => {
      setupDataMocks();
      renderReportsPage();

      await waitFor(() => {
        // RiskLevelBadge renders "Crítico (20)"
        expect(screen.getByText(/Crítico/)).toBeInTheDocument();
      });
      expect(screen.getByText(/Alto/)).toBeInTheDocument();
    });

    it("should render status badges", async () => {
      setupDataMocks();
      renderReportsPage();

      await waitFor(() => {
        // "Activo" appears twice (2 risks with active status)
        expect(screen.getAllByText("Activo").length).toBeGreaterThanOrEqual(2);
      });
      expect(screen.getByText("Mitigado")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should show empty tables when no data exists", () => {
      setupEmptyMocks();
      renderReportsPage();

      // Tables render with headers but no rows
      expect(screen.getByText("Inventario de Riesgos")).toBeInTheDocument();
      expect(screen.getByText("Plan de Acción")).toBeInTheDocument();
    });
  });

  describe("Export button", () => {
    it("should render export button enabled by default", () => {
      setupDataMocks();
      renderReportsPage();

      const btn = screen.getByText("Exportar PDF");
      expect(btn).not.toBeDisabled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AuditorPage from "@/pages/AuditorPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseQuery, mockUseNavigate } = vi.hoisted(() => {
  return {
    mockUseQuery: vi.fn(),
    mockUseNavigate: vi.fn(),
  };
});

const DEFAULT_AUTH = {
  user: { id: "user-1", email: "auditor@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" },
  session: null,
  role: "auditor",
  loading: false,
  plan: { id: "41465153-4d90-41a3-a4af-66e4777e5738", name: "Profesional" },
  subscription: { status: "active", isBlocked: false, isGracePeriod: false, daysRemaining: 30, endDate: "2026-12-31" },
  mfaRequired: false,
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
  checkMfaStatus: vi.fn(),
};

const DEFAULT_COMPANY = {
  selectedCompanyId: "company-1",
  companies: [{ id: "company-1", name: "Test Corp" }],
  setSelectedCompanyId: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => DEFAULT_AUTH,
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => DEFAULT_COMPANY,
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

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...(actual as object),
    useNavigate: () => mockUseNavigate,
  };
});

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
  { id: "risk-1", name: "Falla en sistema", type: "operational", risk_level: 20, status: "active", description: "Riesgo crítico", company_id: "company-1" },
  { id: "risk-2", name: "Incumplimiento legal", type: "legal", risk_level: 12, status: "active", description: null, company_id: "company-1" },
  { id: "risk-3", name: "Riesgo bajo", type: "financial", risk_level: 3, status: "mitigated", description: "Bajo impacto", company_id: "company-1" },
];

const MOCK_ACTIONS = [
  { id: "action-1", description: "Implementar parche", responsible: "Juan", due_date: "2026-07-15", status: "pending", risk_id: "risk-1", risks: { name: "Falla en sistema" } },
  { id: "action-2", description: "Actualizar políticas", responsible: "María", due_date: "2026-08-01", status: "completed", risk_id: "risk-2", risks: { name: "Incumplimiento legal" } },
];

const MOCK_EVIDENCES = [
  { id: "ev-1", name: "Reporte.pdf", file_type: "pdf", created_at: "2026-06-01", risk_id: "risk-1" },
];

const MOCK_AUDIT_SESSIONS = [
  { id: "audit-1", status: "completed", score: 85, created_at: "2026-06-15", completed_at: "2026-06-16", audit_checklists: { name: "Checklist Seguridad" } },
  { id: "audit-2", status: "in_progress", score: null, created_at: "2026-06-20", completed_at: null, audit_checklists: { name: "Checklist Legal" } },
];

const QUERY_RESULT = { risks: MOCK_RISKS, actions: MOCK_ACTIONS, evidences: MOCK_EVIDENCES, auditSessions: MOCK_AUDIT_SESSIONS };

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderAuditorPage() {
  return render(<MemoryRouter><AuditorPage /></MemoryRouter>);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AuditorPage", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseNavigate.mockReset();
  });

  describe("Data view", () => {
    it("should render page title with data", async () => {
      mockUseQuery.mockReturnValue({ data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
      renderAuditorPage();

      await waitFor(() => {
        expect(screen.getByText("Panel de Auditor")).toBeInTheDocument();
      });
    });

    it("should render stat card labels", async () => {
      mockUseQuery.mockReturnValue({ data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
      renderAuditorPage();

      await waitFor(() => {
        // "Riesgos" appears in stat card label AND tab trigger
        expect(screen.getAllByText("Riesgos").length).toBeGreaterThanOrEqual(1);
      });
      // "Acciones" appears in stat card AND tab trigger
      expect(screen.getAllByText("Acciones").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Evidencias")).toBeInTheDocument();
      // "Auditorías" appears in stat card label AND tab trigger
      expect(screen.getAllByText("Auditorías").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Críticos")).toBeInTheDocument();
    });

    it("should render action buttons", async () => {
      mockUseQuery.mockReturnValue({ data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
      renderAuditorPage();

      await waitFor(() => {
        expect(screen.getByText("Nueva Auditoría")).toBeInTheDocument();
      });
      expect(screen.getByText("Actualizar")).toBeInTheDocument();
    });
  });

  describe("Risks tab (default)", () => {
    it("should show risks in the default risks tab", async () => {
      mockUseQuery.mockReturnValue({ data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
      renderAuditorPage();

      await waitFor(() => {
        expect(screen.getByText("Falla en sistema")).toBeInTheDocument();
      });
      expect(screen.getByText("Incumplimiento legal")).toBeInTheDocument();
      expect(screen.getByText("Riesgo bajo")).toBeInTheDocument();
    });
  });

  describe("Tabs", () => {
    it("should render all 3 tab triggers", async () => {
      mockUseQuery.mockReturnValue({ data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
      renderAuditorPage();

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "Riesgos" })).toBeInTheDocument();
      });
      expect(screen.getByRole("tab", { name: "Acciones" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Auditorías" })).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to audit execution on button click", async () => {
      mockUseQuery.mockReturnValue({ data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
      renderAuditorPage();

      await waitFor(() => {
        expect(screen.getByText("Nueva Auditoría")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Nueva Auditoría"));
      expect(mockUseNavigate).toHaveBeenCalledWith("/audit-execution");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CompaniesPage from "@/pages/CompaniesPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@test.com" },
    role: "admin",
    plan: { id: "plan-1", name: "Profesional", max_companies: 10 },
  }),
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    setSelectedCompanyId: vi.fn(),
  }),
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
      single: vi.fn().mockReturnThis(),
    })),
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

const SECTORS = [
  { id: "sector-1", name: "Tecnología" },
  { id: "sector-2", name: "Financiero" },
];

const PLANS = [
  { id: "plan-basic", name: "Básico", price: 49, max_companies: 1 },
  { id: "plan-pro", name: "Profesional", price: 99, max_companies: 5 },
];

const COMPANIES = [
  { id: "comp-1", name: "TechCorp S.A.", sector_id: "sector-1", employee_count: 250, risk_level: "high", owner_id: "user-1", created_at: "2026-06-01", plan_id: "plan-pro", sector_name: "Tecnología", plan_name: "Profesional" },
  { id: "comp-2", name: "FinLegal Ltda.", sector_id: "sector-2", employee_count: 50, risk_level: "medium", owner_id: "user-1", created_at: "2026-06-05", plan_id: "plan-basic", sector_name: "Financiero", plan_name: "Básico" },
  { id: "comp-3", name: "Startup Inc.", sector_id: null, employee_count: null, risk_level: "low", owner_id: "user-2", created_at: "2026-06-10", plan_id: null, sector_name: null, plan_name: null },
];

const QUERY_RESULT = { companies: COMPANIES, sectors: SECTORS, plans: PLANS };
const EMPTY_RESULT = { companies: [], sectors: [], plans: [] };

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderCompaniesPage() {
  return render(<MemoryRouter><CompaniesPage /></MemoryRouter>);
}

function setupDataMocks() {
  mockUseQuery.mockReturnValue({ data: QUERY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
}

function setupEmptyMocks() {
  mockUseQuery.mockReturnValue({ data: EMPTY_RESULT, isLoading: false, error: null, refetch: vi.fn() });
}

function setupLoadingMocks() {
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
}

function setupErrorMocks() {
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Error de conexión") });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("CompaniesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Page structure", () => {
    it("should render the page title and description", () => {
      setupDataMocks();
      renderCompaniesPage();

      expect(screen.getByText("Empresas")).toBeInTheDocument();
      expect(screen.getByText(/Gestiona las empresas registradas/)).toBeInTheDocument();
    });

    it("should render 'Nueva Empresa' button", () => {
      setupDataMocks();
      renderCompaniesPage();

      expect(screen.getByText("Nueva Empresa")).toBeInTheDocument();
    });

    it("should render search input", () => {
      setupDataMocks();
      renderCompaniesPage();

      expect(screen.getByPlaceholderText("Buscar empresas...")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show skeleton cards while loading", () => {
      setupLoadingMocks();
      renderCompaniesPage();

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Empty state", () => {
    it("should show empty message when no companies exist", () => {
      setupEmptyMocks();
      renderCompaniesPage();

      expect(screen.getByText("No hay empresas registradas")).toBeInTheDocument();
      expect(screen.getByText("Crear Empresa")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show error banner with retry buttons", () => {
      setupErrorMocks();
      renderCompaniesPage();

      expect(screen.getByText(/Error de Carga/)).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
      expect(screen.getByText("Reparar Conexión")).toBeInTheDocument();
    });
  });

  describe("Company cards", () => {
    it("should render company names", () => {
      setupDataMocks();
      renderCompaniesPage();

      expect(screen.getByText("TechCorp S.A.")).toBeInTheDocument();
      expect(screen.getByText("FinLegal Ltda.")).toBeInTheDocument();
      expect(screen.getByText("Startup Inc.")).toBeInTheDocument();
    });

    it("should render sector names on cards", () => {
      setupDataMocks();
      renderCompaniesPage();

      expect(screen.getByText("Tecnología")).toBeInTheDocument();
      expect(screen.getByText("Financiero")).toBeInTheDocument();
    });

    it("should render plan badges", () => {
      setupDataMocks();
      renderCompaniesPage();

      expect(screen.getByText("Profesional")).toBeInTheDocument();
      expect(screen.getByText("Básico")).toBeInTheDocument();
    });

    it("should render employee counts", () => {
      setupDataMocks();
      renderCompaniesPage();

      // "empleados" appears in 2 cards
      expect(screen.getByText(/250/)).toBeInTheDocument();
      // "50" appears in both "250" and "50" — use getAllByText
      expect(screen.getAllByText(/50/).length).toBeGreaterThanOrEqual(1);
    });

    it("should render risk level badges", () => {
      setupDataMocks();
      renderCompaniesPage();

      expect(screen.getByText("Alto")).toBeInTheDocument();
      expect(screen.getByText("Medio")).toBeInTheDocument();
      expect(screen.getByText("Bajo")).toBeInTheDocument();
    });
  });

  describe("Search", () => {
    it("should filter companies by search input", () => {
      setupDataMocks();
      renderCompaniesPage();

      const searchInput = screen.getByPlaceholderText("Buscar empresas...");
      fireEvent.change(searchInput, { target: { value: "TechCorp" } });

      expect(screen.getByText("TechCorp S.A.")).toBeInTheDocument();
      expect(screen.queryByText("FinLegal Ltda.")).not.toBeInTheDocument();
    });
  });

  describe("Create dialog", () => {
    it("should open create dialog when clicking 'Nueva Empresa'", () => {
      setupDataMocks();
      renderCompaniesPage();

      fireEvent.click(screen.getByText("Nueva Empresa"));

      // Button + dialog title both show "Nueva Empresa"
      expect(screen.getAllByText("Nueva Empresa").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByPlaceholderText("Ej: TechCorp S.A.")).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WebhooksPage from "@/pages/WebhooksPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseQuery, mockPlanRef } = vi.hoisted(() => {
  const planRef: { current: { id: string; name: string } } = {
    current: { id: "6a8803e7-ea12-4e31-9270-b660cf6de8d1", name: "Enterprise" },
  };
  return {
    mockUseQuery: vi.fn(),
    mockPlanRef: planRef,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@test.com" },
    role: "admin",
    plan: mockPlanRef.current,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
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

const MOCK_WEBHOOKS = [
  { id: "wh-1", url: "https://mi-erp.com/api/webhooks/risk", events: ["risk.created", "action.completed"], active: true, created_at: "2026-06-15T10:00:00Z" },
  { id: "wh-2", url: "https://crm.example.com/hooks/evidence", events: ["evidence.uploaded"], active: false, created_at: "2026-06-10T08:00:00Z" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderWebhooksPage() {
  return render(<MemoryRouter><WebhooksPage /></MemoryRouter>);
}

function setupDataMocks() {
  mockUseQuery.mockReturnValue({ data: MOCK_WEBHOOKS, isLoading: false, error: null, refetch: vi.fn() });
}

function setupEmptyMocks() {
  mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
}

function setupLoadingMocks() {
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
}

function setupErrorMocks() {
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Error de conexión"), refetch: vi.fn() });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("WebhooksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset to enterprise by default for all tests except no-access
    mockPlanRef.current = { id: "6a8803e7-ea12-4e31-9270-b660cf6de8d1", name: "Enterprise" };
    // Default mock return to prevent undefined destructuring crash
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: vi.fn() });
  });

  describe("No access", () => {
    it("should show enterprise-only message for non-enterprise users", () => {
      mockPlanRef.current = { id: "plan-basic", name: "Básico" };

      renderWebhooksPage();

      expect(screen.getByText("Módulo Enterprise")).toBeInTheDocument();
    });
  });

  describe("Page structure", () => {
    it("should render the page title", () => {
      setupDataMocks();
      renderWebhooksPage();

      expect(screen.getByText(/Integraciones ERP/)).toBeInTheDocument();
    });

    it("should render 'Nuevo Webhook' button", () => {
      setupDataMocks();
      renderWebhooksPage();

      expect(screen.getByText("Nuevo Webhook")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show loading text while fetching", () => {
      setupLoadingMocks();
      renderWebhooksPage();

      expect(screen.getByText("Cargando integraciones...")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should show empty message with config button", () => {
      setupEmptyMocks();
      renderWebhooksPage();

      expect(screen.getByText("Sin Integraciones Activas")).toBeInTheDocument();
      expect(screen.getByText("Configurar Primer Endpoint")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("should show error banner with retry buttons", () => {
      setupErrorMocks();
      renderWebhooksPage();

      expect(screen.getByText(/Error de Comunicación/)).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
      expect(screen.getByText("Reparar Integración")).toBeInTheDocument();
    });
  });

  describe("Webhook list", () => {
    it("should render webhook URLs", () => {
      setupDataMocks();
      renderWebhooksPage();

      expect(screen.getByText("https://mi-erp.com/api/webhooks/risk")).toBeInTheDocument();
      expect(screen.getByText("https://crm.example.com/hooks/evidence")).toBeInTheDocument();
    });

    it("should render active/inactive badges", () => {
      setupDataMocks();
      renderWebhooksPage();

      expect(screen.getByText("Activo")).toBeInTheDocument();
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
    });

    it("should render event badges", () => {
      setupDataMocks();
      renderWebhooksPage();

      expect(screen.getByText("risk.created")).toBeInTheDocument();
      expect(screen.getByText("action.completed")).toBeInTheDocument();
      expect(screen.getByText("evidence.uploaded")).toBeInTheDocument();
    });
  });

  describe("Create dialog", () => {
    it("should open create dialog when clicking 'Nuevo Webhook'", () => {
      setupDataMocks();
      renderWebhooksPage();

      fireEvent.click(screen.getByText("Nuevo Webhook"));

      expect(screen.getByText("Añadir Endpoint Webhook")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("https://mi-erp.com/api/webhooks/risk")).toBeInTheDocument();
      expect(screen.getByText("Guardar Webhook")).toBeInTheDocument();
    });
  });
});

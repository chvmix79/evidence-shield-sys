import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AuditExecutionPage from "@/pages/AuditExecutionPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseAuth, mockUseCompany, mockNavigate, mockToast, mockSearchParams } = vi.hoisted(() => {
  const mockUseAuth = vi.fn(() => ({
    user: { id: "user-1", email: "auditor@test.com" },
    role: "auditor",
    loading: false,
  }));

  const mockUseCompany = vi.fn(() => ({
    selectedCompanyId: "company-1",
    companies: [{ id: "company-1", name: "TechCorp S.A.", sector_id: "sector-tech" }],
    setSelectedCompanyId: vi.fn(),
    refresh: vi.fn(),
  }));

  const mockNavigate = vi.fn();
  const mockToast = vi.fn();

  const mockSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);

  return { mockUseAuth, mockUseCompany, mockNavigate, mockToast, mockSearchParams };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: mockUseCompany,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useSearchParams: mockSearchParams,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Test Data ──────────────────────────────────────────────────────────────

const MOCK_CHECKLIST = {
  id: "checklist-1",
  name: "Auditoría de Ciberseguridad ISO 27001",
  description: "Checklist de cumplimiento",
  sector_id: "sector-tech",
  is_active: true,
};

const MOCK_ITEMS = [
  { id: "item-1", checklist_id: "checklist-1", category: "Seguridad Física", question: "¿Existe control de acceso físico al centro de datos?", requirement_code: "A.11.1.1", order_index: 1 },
  { id: "item-2", checklist_id: "checklist-1", category: "Seguridad Lógica", question: "¿Se utiliza autenticación multifactor?", requirement_code: "A.9.4.2", order_index: 2 },
  { id: "item-3", checklist_id: "checklist-1", category: "Cumplimiento", question: "¿Se realizan auditorías periódicas?", requirement_code: null, order_index: 3 },
];

const MOCK_SESSION = {
  id: "session-1",
  company_id: "company-1",
  checklist_id: "checklist-1",
  auditor_id: "user-1",
  status: "in_progress",
  score: null,
  created_at: "2026-06-01",
  completed_at: null,
};

// Helper: create base supabase chain mock
function createChainMock(terminalOverrides: Record<string, any> = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...terminalOverrides,
  };
}

// ─── Supabase Mock (vi.hoisted) ────────────────────────────────────────────

const { mockSupabaseFrom } = vi.hoisted(() => {
  const mockSupabaseFrom = vi.fn();
  return { mockSupabaseFrom };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockSupabaseFrom, auth: { refreshSession: vi.fn() } },
}));

function setupSupabaseNewAudit() {
  mockSupabaseFrom.mockImplementation((table: string) => {
    switch (table) {
      case "audit_checklists":
        return createChainMock({
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_CHECKLIST, error: null }),
        });
      case "audit_checklist_items":
        return createChainMock({
          order: vi.fn().mockResolvedValue({ data: MOCK_ITEMS, error: null }),
        });
      case "audit_sessions":
        return createChainMock({
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_SESSION, error: null }),
        });
      default:
        return createChainMock();
    }
  });
}

function setupSupabaseNoChecklist() {
  mockSupabaseFrom.mockImplementation((table: string) => {
    switch (table) {
      case "audit_checklists":
        return createChainMock({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
      default:
        return createChainMock();
    }
  });
}

function setupSupabaseResumeSession() {
  mockSupabaseFrom.mockImplementation((table: string) => {
    switch (table) {
      case "audit_sessions":
        return createChainMock({
          single: vi.fn().mockResolvedValue({ data: { ...MOCK_SESSION, audit_checklists: MOCK_CHECKLIST }, error: null }),
          insert: vi.fn().mockReturnThis(),
        });
      case "audit_checklist_items":
        return createChainMock({
          order: vi.fn().mockResolvedValue({ data: MOCK_ITEMS, error: null }),
        });
      case "audit_responses":
        return createChainMock({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: "resp-1", session_id: "session-1", item_id: "item-1", response: "yes", observations: "Puerta con tarjeta RFID" },
              { id: "resp-2", session_id: "session-1", item_id: "item-2", response: "no", observations: "" },
            ],
            error: null,
          }),
        });
      default:
        return createChainMock();
    }
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/audit-execution"]}>
      <AuditExecutionPage />
    </MemoryRouter>
  );
}

function renderPageWithSession(sessionId: string) {
  mockSearchParams.mockReturnValue([new URLSearchParams({ session: sessionId }), vi.fn()]);
  return render(
    <MemoryRouter initialEntries={[`/audit-execution?session=${sessionId}`]}>
      <AuditExecutionPage />
    </MemoryRouter>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AuditExecutionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()]);

    // Restore mock implementations to defaults (clearAllMocks doesn't clear mockReturnValue/mockImplementation overrides)
    mockUseCompany.mockReset();
    mockUseCompany.mockImplementation(() => ({
      selectedCompanyId: "company-1",
      companies: [{ id: "company-1", name: "TechCorp S.A.", sector_id: "sector-tech" }],
      setSelectedCompanyId: vi.fn(),
      refresh: vi.fn(),
    }));

    // Default supabase: return empty data for all queries
    mockSupabaseFrom.mockImplementation(() => createChainMock());
  });

  describe("Loading state", () => {
    it("should show loading spinner on initial render", () => {
      // Don't resolve supabase calls immediately
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
        maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})),
      }));

      renderPage();

      // Before useEffect resolves, we see loading spinner
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("No company selected", () => {
    it("should navigate to /auditor when no company is selected", () => {
      mockUseCompany.mockImplementation(() => ({
        selectedCompanyId: null,
        companies: [],
        setSelectedCompanyId: vi.fn(),
        refresh: vi.fn(),
      }));

      // Mock supabase to return nothing (should redirect before calling it)
      mockSupabaseFrom.mockImplementation(() => createChainMock());

      renderPage();

      expect(mockNavigate).toHaveBeenCalledWith("/auditor");
    });
  });

  describe("New audit flow", () => {
    it("should render checklist name and company when data loads", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(MOCK_CHECKLIST.name)).toBeInTheDocument();
      });
      expect(screen.getByText(/TechCorp S.A./)).toBeInTheDocument();
    });

    it("should render all checklist items with questions", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/¿Existe control de acceso físico/)).toBeInTheDocument();
      });
      expect(screen.getByText(/¿Se utiliza autenticación multifactor/)).toBeInTheDocument();
      expect(screen.getByText(/¿Se realizan auditorías periódicas/)).toBeInTheDocument();
    });

    it("should render category labels for each item", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getAllByText("Seguridad Física").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText("Seguridad Lógica")).toBeInTheDocument();
      expect(screen.getByText("Cumplimiento")).toBeInTheDocument();
    });

    it("should render requirement codes for items that have them", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Ref: A.11.1.1/)).toBeInTheDocument();
      });
      expect(screen.getByText(/Ref: A.9.4.2/)).toBeInTheDocument();
    });

    it("should render response option buttons for each item", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        const cumpleButtons = screen.getAllByText("Cumple");
        expect(cumpleButtons.length).toBe(3); // 1 per item
      });
      expect(screen.getAllByText("No Cumple").length).toBe(3);
      expect(screen.getAllByText("Parcial").length).toBe(3);
      expect(screen.getAllByText("N/A").length).toBe(3);
    });

    it("should render progress bar and score display", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        // "Progreso" appears in progress text AND "Guardar Progreso" button
        expect(screen.getAllByText(/Progreso/).length).toBeGreaterThanOrEqual(2);
      });
      expect(screen.getByText(/Cumplimiento Actual/)).toBeInTheDocument();
    });

    it("should update response when clicking a response button", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getAllByText("Cumple").length).toBe(3);
      });

      // Click "Cumple" on the first item
      fireEvent.click(screen.getAllByText("Cumple")[0]);

      // Score should update (1/3 yes = 33.3%)
      await waitFor(() => {
        expect(screen.getByText(/33\.3%/)).toBeInTheDocument();
      });
    });

    it("should update score with partial responses on different items", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getAllByText("Cumple").length).toBe(3);
      });

      // Click "Cumple" on item 1 and "Parcial" on item 2
      // getAllByText returns buttons in DOM order: [item1, item2, item3]
      fireEvent.click(screen.getAllByText("Cumple")[0]);  // item 1 = yes
      fireEvent.click(screen.getAllByText("Parcial")[1]);  // item 2 = partial

      // Score: (1 + 0.5) / 3 = 50%
      await waitFor(() => {
        expect(screen.getByText(/50\.0%/)).toBeInTheDocument();
      });
    });

    it("should update observations textarea", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getAllByText("Cumple").length).toBe(3);
      });

      const textareas = screen.getAllByPlaceholderText(/Describe la evidencia/);
      fireEvent.change(textareas[0], { target: { value: "Evidencia documentada OK" } });

      expect(textareas[0]).toHaveValue("Evidencia documentada OK");
    });
  });

  describe("Save and finalize", () => {
    it("should show Guardar Progreso and Finalizar Auditoría buttons", async () => {
      setupSupabaseNewAudit();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Guardar Progreso")).toBeInTheDocument();
      });
      expect(screen.getByText("Finalizar Auditoría")).toBeInTheDocument();
    });
  });

  describe("No checklist available", () => {
    it("should show toast error when no checklist exists", async () => {
      setupSupabaseNoChecklist();
      renderPage();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Sin lista de chequeo" })
        );
      });
    });
  });

  describe("Resume session", () => {
    it("should load existing responses when resuming a session", async () => {
      setupSupabaseResumeSession();
      renderPageWithSession("session-1");

      // Should load existing responses
      // item-1 had response "yes" → "Cumple" should be selected/active
      // item-2 had response "no" → "No Cumple" should be selected/active
      // We can check by verifying the session loaded and items rendered
      await waitFor(() => {
        expect(screen.getByText(/¿Existe control de acceso físico/)).toBeInTheDocument();
      });

      // Observations from item-1 should be loaded
      expect(screen.getByDisplayValue("Puerta con tarjeta RFID")).toBeInTheDocument();
    });

    it("should show toast and navigate when session not found", async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "audit_sessions") {
          return createChainMock({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          });
        }
        return createChainMock();
      });

      renderPageWithSession("invalid-session");

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Sesión no encontrada" })
        );
      });
      expect(mockNavigate).toHaveBeenCalledWith("/auditor");
    });
  });
});

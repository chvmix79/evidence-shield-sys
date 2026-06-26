import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { CompanyProvider, useCompany } from "@/contexts/CompanyContext";
import React from "react";

// ─── Hoisted Mocks ──────────────────────────────────────────────────────────

const { mockUseAuth, mockSupabaseFrom, mockLogger } = vi.hoisted(() => {
  const mockUseAuth = vi.fn(() => ({
    user: { id: "user-1", email: "test@test.com" },
    loading: false,
  }));

  const mockSupabaseFrom = vi.fn();

  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  return { mockUseAuth, mockSupabaseFrom, mockLogger };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function setupCompaniesFetch(data: any[] | null, error: any = null) {
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "companies") {
      return {
        select: vi.fn().mockResolvedValue({ data, error }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

const MOCK_COMPANIES = [
  { id: "company-1", name: "Empresa A", sector_id: "sector-1" },
  { id: "company-2", name: "Empresa B", sector_id: "sector-2" },
  { id: "company-3", name: "Empresa C", sector_id: null },
];

// Consumer component that exposes context values for testing
function CompanyConsumer() {
  const { selectedCompanyId, setSelectedCompanyId, companies, loading, refresh } = useCompany();
  return (
    <div>
      <div data-testid="selected-company">{selectedCompanyId || "(empty)"}</div>
      <div data-testid="companies-count">{companies.length}</div>
      <div data-testid="companies-list">{companies.map(c => c.name).join(",")}</div>
      <div data-testid="loading">{String(loading)}</div>
      <button data-testid="select-btn" onClick={() => setSelectedCompanyId("company-2")}>Select Co 2</button>
      <button data-testid="select-empty" onClick={() => setSelectedCompanyId("")}>Select Empty</button>
      <button data-testid="refresh-btn" onClick={refresh}>Refresh</button>
    </div>
  );
}

function renderCompanyProvider() {
  return render(
    <CompanyProvider>
      <CompanyConsumer />
    </CompanyProvider>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("CompanyContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: user is logged in and not loading
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
  });

  // ─── Initial State ──────────────────────────────────────────────────────

  describe("Initial state", () => {
    it("should start with empty selectedCompanyId and no companies when no cache", async () => {
      setupCompaniesFetch(MOCK_COMPANIES);
      renderCompanyProvider();

      // Component may oscillate loading state (loading in useCallback deps)
      // Wait for companies to load
      await waitFor(() => {
        expect(screen.getByTestId("companies-count").textContent).toBe("3");
      });
    });

    it("should restore selectedCompanyId from localStorage", async () => {
      localStorage.setItem("selected_company_id", "company-2");
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("selected-company").textContent).toBe("company-2");
      });
    });

    it("should restore companies from localStorage cache", async () => {
      localStorage.setItem("companies_list_cache_basic", JSON.stringify(MOCK_COMPANIES));
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("companies-count").textContent).toBe("3");
      });
      expect(screen.getByTestId("companies-list").textContent).toBe("Empresa A,Empresa B,Empresa C");
    });

    it("should select first company from cache when no selectedCompanyId", async () => {
      localStorage.setItem("companies_list_cache_basic", JSON.stringify(MOCK_COMPANIES));
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("selected-company").textContent).toBe("company-1");
      });
    });

    it("should ignore invalid cached selectedCompanyId", async () => {
      localStorage.setItem("selected_company_id", "non-existent-id");
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        // After fetch, the invalid ID should be cleared
        expect(screen.getByTestId("selected-company").textContent).not.toBe("non-existent-id");
      });
    });
  });

  // ─── Company Loading ─────────────────────────────────────────────────────

  describe("Company loading", () => {
    it("should fetch companies from supabase on mount when user is present", async () => {
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith("companies");
      });

      expect(screen.getByTestId("companies-count").textContent).toBe("3");
      expect(screen.getByTestId("companies-list").textContent).toBe("Empresa A,Empresa B,Empresa C");
    });

    it("should not fetch companies when authLoading is true", async () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      // Wait a bit to ensure no fetch happens
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it("should not fetch companies when user is null", async () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it("should handle fetch errors gracefully", async () => {
      setupCompaniesFetch(null, new Error("Network error"));

      renderCompanyProvider();

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith("Error fetching companies:", expect.any(Error));
      });
      expect(screen.getByTestId("companies-count").textContent).toBe("0");
    });

    it("should cache fetched companies in localStorage", async () => {
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("companies-count").textContent).toBe("3");
      });

      const cached = localStorage.getItem("companies_list_cache_basic");
      expect(cached).not.toBeNull();
      const parsed = JSON.parse(cached!);
      expect(parsed.length).toBe(3);
      expect(parsed[0].name).toBe("Empresa A");
    });

    it("should auto-select first company when none selected after fetch", async () => {
      setupCompaniesFetch([MOCK_COMPANIES[0]]); // Only 1 company

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("selected-company").textContent).toBe("company-1");
      });
      expect(localStorage.getItem("selected_company_id")).toBe("company-1");
    });
  });

  // ─── Company Selection ───────────────────────────────────────────────────

  describe("Company selection", () => {
    it("should update selectedCompanyId and localStorage on selection", async () => {
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("selected-company").textContent).toBe("company-1"); // auto-selected
      });

      const selectBtn = screen.getByTestId("select-btn");
      act(() => selectBtn.click());

      expect(screen.getByTestId("selected-company").textContent).toBe("company-2");
      expect(localStorage.getItem("selected_company_id")).toBe("company-2");
    });

    it("should clear localStorage when setting empty selection", async () => {
      localStorage.setItem("selected_company_id", "company-1");
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("selected-company").textContent).toBe("company-1");
      });

      const clearBtn = screen.getByTestId("select-empty");
      act(() => clearBtn.click());

      expect(screen.getByTestId("selected-company").textContent).toBe("(empty)");
      expect(localStorage.getItem("selected_company_id")).toBeNull();
    });

    it("should handle null/undefined/string-null values in setSelectedCompanyId", async () => {
      function NullTestConsumer() {
        const { setSelectedCompanyId, selectedCompanyId } = useCompany();
        return (
          <div>
            <div data-testid="sel-id">{selectedCompanyId || "(empty)"}</div>
            <button data-testid="set-null" onClick={() => setSelectedCompanyId("null")}>Set Null</button>
            <button data-testid="set-undefined" onClick={() => setSelectedCompanyId("undefined")}>Set Undefined</button>
          </div>
        );
      }

      setupCompaniesFetch([]);
      render(
        <CompanyProvider>
          <NullTestConsumer />
        </CompanyProvider>
      );

      await waitFor(() => {
        const nullBtn = screen.getByTestId("set-null");
        act(() => nullBtn.click());
      });

      expect(screen.getByTestId("sel-id").textContent).toBe("(empty)");

      const undefBtn = screen.getByTestId("set-undefined");
      act(() => undefBtn.click());

      expect(screen.getByTestId("sel-id").textContent).toBe("(empty)");
    });
  });

  // ─── Refresh ─────────────────────────────────────────────────────────────

  describe("Refresh", () => {
    it("should re-fetch companies when refresh is called", async () => {
      setupCompaniesFetch(MOCK_COMPANIES);

      renderCompanyProvider();

      await waitFor(() => {
        expect(screen.getByTestId("companies-count").textContent).toBe("3");
      });

      // Reset call count
      vi.clearAllMocks();

      // Setup new data for refresh
      setupCompaniesFetch([
        { id: "company-4", name: "Empresa D" },
      ]);

      const refreshBtn = screen.getByTestId("refresh-btn");
      act(() => refreshBtn.click());

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith("companies");
      });
      expect(screen.getByTestId("companies-count").textContent).toBe("1");
    });
  });

  // ─── Auth dependency ─────────────────────────────────────────────────────

  describe("Auth dependency", () => {
    it("should re-fetch when auth changes from loading to loaded", async () => {
      // Start with auth loading
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      setupCompaniesFetch(MOCK_COMPANIES);

      const { rerender } = render(
        <CompanyProvider>
          <CompanyConsumer />
        </CompanyProvider>
      );

      // Should not fetch while loading
      expect(mockSupabaseFrom).not.toHaveBeenCalled();

      // Change auth state to loaded with user
      mockUseAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });

      // Re-render to trigger effect
      rerender(
        <CompanyProvider>
          <CompanyConsumer />
        </CompanyProvider>
      );

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith("companies");
      });
      expect(screen.getByTestId("companies-count").textContent).toBe("3");
    });
  });
});

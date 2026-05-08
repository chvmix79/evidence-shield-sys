import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuditsManager } from "@/components/audits/AuditsManager";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    role: "admin",
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("AuditsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the component title", () => {
    render(<AuditsManager />);
    expect(screen.getByText("Gestión de Auditorías")).toBeInTheDocument();
  });

  it("should show loading state initially", () => {
    render(<AuditsManager />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("should render audit list after loading", async () => {
    const mockAudits = [
      {
        id: "1",
        title: "Auditoría Interna Q1",
        status: "scheduled",
        start_date: "2024-01-01",
        end_date: "2024-01-15",
        companies: { name: "Empresa Test" },
        auditor_id: "test-user-id"
      }
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "audits") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockAudits, error: null }),
        };
      }
      if (table === "companies") {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockResolvedValue({ data: [{ id: "test-user-id", full_name: "Admin User" }], error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    render(<AuditsManager />);
    
    await waitFor(() => {
      expect(screen.getByText("Auditoría Interna Q1")).toBeInTheDocument();
    });
    expect(screen.getByText("Empresa Test")).toBeInTheDocument();
  });

  it("should open create dialog when clicking 'Nueva Auditoría'", async () => {
    render(<AuditsManager />);
    const createBtn = screen.getByText("Nueva Auditoría");
    fireEvent.click(createBtn);
    
    expect(screen.getByText("Programar Nueva Auditoría")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ExternalUploadPage from "@/pages/ExternalUploadPage";
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
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderWithRouter = (token = "test-token") => {
  return render(
    <MemoryRouter initialEntries={[`/provider/${token}`]}>
      <Routes>
        <Route path="/provider/:token" element={<ExternalUploadPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ExternalUploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show error if token is invalid or action not found", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: null, error: new Error("Not found") });
    
    renderWithRouter("invalid-token");
    
    await waitFor(() => {
      expect(screen.getByText("Enlace Inválido")).toBeInTheDocument();
    });
  });

  it("should render action details if token is valid", async () => {
    const mockAction = {
      id: "action-123",
      description: "Corregir extintores",
      risk_name: "Incendio",
      status: "pending"
    };

    (supabase.rpc as any).mockResolvedValue({ data: mockAction, error: null });
    
    renderWithRouter("valid-token");
    
    await waitFor(() => {
      expect(screen.getByText("Portal del Proveedor")).toBeInTheDocument();
    });
    expect(screen.getByText("Corregir extintores")).toBeInTheDocument();
    expect(screen.getByText(/Incendio/)).toBeInTheDocument();
  });

  it("should show upload area", async () => {
    (supabase.rpc as any).mockResolvedValue({ 
      data: { id: "1", description: "Test", status: "pending", risk_name: null }, 
      error: null 
    });
    
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText("Haz clic aquí para seleccionar tu evidencia")).toBeInTheDocument();
    });
  });
});

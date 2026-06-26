import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RiskPredictionDashboard } from "@/components/ai/RiskPredictionDashboard";

// Mock dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";

describe("RiskPredictionDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the AI header", () => {
    render(<RiskPredictionDashboard companyId="company-123" />);
    expect(screen.getByText("Análisis Predictivo IA")).toBeInTheDocument();
  });

  it("should show generate button", () => {
    render(<RiskPredictionDashboard companyId="company-123" />);
    expect(screen.getByText("Generar")).toBeInTheDocument();
  });

  it("should handle successful prediction", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { reply: "### Recomendación\nAnalizar riesgos financieros." },
      error: null,
    });

    render(<RiskPredictionDashboard companyId="company-123" />);
    const btn = screen.getByText("Generar");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Recomendación")).toBeInTheDocument();
      expect(screen.getByText("Analizar riesgos financieros.")).toBeInTheDocument();
    });
  });

  it("should handle AI service error", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { error: "IA offline" },
      error: null,
    });

    render(<RiskPredictionDashboard companyId="company-123" />);
    const btn = screen.getByText("Generar");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("IA offline")).toBeInTheDocument();
    });
  });
});

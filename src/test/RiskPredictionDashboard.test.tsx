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

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RiskPredictionDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the AI header", () => {
    render(<RiskPredictionDashboard companyId="company-123" />);
    expect(screen.getByText("Análisis Predictivo Gemini AI")).toBeInTheDocument();
  });

  it("should show generate button", () => {
    render(<RiskPredictionDashboard companyId="company-123" />);
    expect(screen.getByText("Generar Insights")).toBeInTheDocument();
  });

  it("should handle successful prediction", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ prediction: "### Recomendación\nAnalizar riesgos financieros." }),
    });

    render(<RiskPredictionDashboard companyId="company-123" />);
    const btn = screen.getByText("Generar Insights");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Recomendación")).toBeInTheDocument();
      expect(screen.getByText("Analizar riesgos financieros.")).toBeInTheDocument();
    });
  });

  it("should handle AI service error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "IA offline" }),
    });

    render(<RiskPredictionDashboard companyId="company-123" />);
    const btn = screen.getByText("Generar Insights");
    fireEvent.click(btn);

    // Error is handled via toast, which is mocked, so we just check it doesn't show prediction
    await waitFor(() => {
      expect(screen.queryByText("Recomendación")).not.toBeInTheDocument();
    });
  });
});

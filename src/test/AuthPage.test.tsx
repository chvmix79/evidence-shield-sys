import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthPage from "@/pages/AuthPage";
import React from "react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks (vi.hoisted) ────────────────────────────────────────────────────

const { mockUseAuth } = vi.hoisted(() => {
  const mockUseAuth = vi.fn(() => ({
    user: null,
    session: null,
    role: null,
    loading: false,
    plan: null,
    mfaRequired: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    checkMfaStatus: vi.fn(),
  }));
  return { mockUseAuth };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      mfa: {
        listFactors: vi.fn(),
        challenge: vi.fn(),
        verify: vi.fn(),
      },
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock image assets so vitest doesn't fail on jpg/png imports
vi.mock("@/assets/auth-bg.jpg", () => ({ default: "auth-bg.jpg" }));
vi.mock("@/assets/CHV_Logo.png", () => ({ default: "chv-logo.png" }));

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prevent window.location redirects during tests
    Object.defineProperty(window, "location", {
      value: { href: "", reload: vi.fn(), origin: "http://localhost" },
      writable: true,
    });
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn() as unknown as (
      arg?: boolean | ScrollIntoViewOptions | undefined
    ) => void;
  });

  describe("Login mode (default)", () => {
    it("should render the login title and form", () => {
      renderAuthPage();

      expect(screen.getByText("Hola de nuevo")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("nombre@empresa.com")).toBeInTheDocument();
      expect(screen.getByText("Entrar al Sistema")).toBeInTheDocument();
    });

    it("should show 'Contratar Plan' toggle link to switch to signup", () => {
      renderAuthPage();

      expect(screen.getByText("Contratar Plan")).toBeInTheDocument();
    });

    it("should show navbar with support and access buttons", () => {
      renderAuthPage();

      // "Soporte" appears in navbar AND footer — use getAllByText
      expect(screen.getAllByText("Soporte").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Acceder ahora")).toBeInTheDocument();
    });
  });

  describe("Signup mode", () => {
    it("should switch to signup when clicking the toggle link", () => {
      renderAuthPage();
      fireEvent.click(screen.getByText("Contratar Plan"));

      expect(screen.getByText("Crea tu cuenta")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("Registrarme")).toBeInTheDocument();
      expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
    });

    it("should show selected plan name when plan is chosen", () => {
      renderAuthPage();
      const elegirButtons = screen.getAllByText("Elegir Plan");
      fireEvent.click(elegirButtons[0]); // Básico

      expect(screen.getByText("Crea tu cuenta")).toBeInTheDocument();
      expect(screen.getByText(/Plan seleccionado/)).toBeInTheDocument();
      // "Básico" appears in plan card title AND as the selected plan name
      expect(screen.getAllByText("Básico").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Initial state", () => {
    it("should not show error or message initially", () => {
      renderAuthPage();

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe("Plan selection and billing", () => {
    it("should render all 3 plan cards", () => {
      renderAuthPage();

      expect(screen.getByText("Básico")).toBeInTheDocument();
      expect(screen.getByText("Profesional")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("should highlight Profesional as 'Más Popular'", () => {
      renderAuthPage();

      expect(screen.getByText("Más Popular")).toBeInTheDocument();
    });

    it("should show monthly prices by default", () => {
      renderAuthPage();

      expect(screen.getByText("$49")).toBeInTheDocument();
      expect(screen.getByText("$99")).toBeInTheDocument();
      expect(screen.getByText("$199")).toBeInTheDocument();
      // "USD / mes" appears in all 3 plan cards
      expect(screen.getAllByText(/USD \/ mes/).length).toBeGreaterThanOrEqual(3);
    });

    it("should show annual prices when billing period toggled", () => {
      renderAuthPage();

      const toggleBtn = document.querySelector("button.bg-slate-200");
      expect(toggleBtn).not.toBeNull();
      fireEvent.click(toggleBtn!);

      expect(screen.getByText("$499")).toBeInTheDocument();
      expect(screen.getByText("$999")).toBeInTheDocument();
      expect(screen.getByText("$1999")).toBeInTheDocument();
      // "USD / año" appears in all 3 plan cards
      expect(screen.getAllByText(/USD \/ año/).length).toBeGreaterThanOrEqual(3);
    });

    it("should select a plan and switch to signup mode", () => {
      renderAuthPage();

      const elegirButtons = screen.getAllByText("Elegir Plan");
      fireEvent.click(elegirButtons[1]); // Profesional

      // "Profesional" appears in plan card AND selected plan message
      expect(screen.getAllByText("Profesional").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Hero section", () => {
    it("should render the hero heading and subtitle", () => {
      renderAuthPage();

      expect(screen.getByText(/Control Total/)).toBeInTheDocument();
      // "Inteligente" appears in heading AND as the amber-colored span
      expect(screen.getAllByText(/Inteligente/).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/plataforma SaaS líder para la automatización/)
      ).toBeInTheDocument();
    });

    it("should render benefit cards", () => {
      renderAuthPage();

      expect(screen.getByText("Control Centralizado")).toBeInTheDocument();
      expect(screen.getByText("Cumplimiento Normativo")).toBeInTheDocument();
      expect(screen.getByText("Evidencias Inmutables")).toBeInTheDocument();
    });
  });

  describe("Sectors section", () => {
    it("should render industry sectors", () => {
      renderAuthPage();

      expect(screen.getByText("Agencia de Aduanas")).toBeInTheDocument();
      expect(screen.getByText("Salud / IPS")).toBeInTheDocument();
      expect(screen.getByText("Financiero")).toBeInTheDocument();
      expect(screen.getByText("Tecnología / SaaS")).toBeInTheDocument();
    });

    it("should render sector standards", () => {
      renderAuthPage();

      expect(screen.getByText("BASC / OEA")).toBeInTheDocument();
      expect(screen.getByText("ISO 27001 / SOC2")).toBeInTheDocument();
    });

    it("should render the AI predictive section", () => {
      renderAuthPage();

      expect(screen.getByText("IA Predictiva")).toBeInTheDocument();
      expect(screen.getByText(/Sistema Activo/)).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("should render footer with links and copyright", () => {
      renderAuthPage();

      expect(screen.getByText("Risk & Evidence Manager")).toBeInTheDocument();
      expect(screen.getByText("Términos")).toBeInTheDocument();
      expect(screen.getByText("Privacidad")).toBeInTheDocument();
      // "Soporte" appears in navbar AND footer — use getAllByText
      expect(screen.getAllByText("Soporte").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/2026 Todos los derechos reservados/)).toBeInTheDocument();
    });
  });

  describe("MFA challenge mode", () => {
    it("should switch from login mode when mfaRequired becomes true", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        role: null,
        loading: false,
        plan: null,
        mfaRequired: true,
        signOut: vi.fn(),
        refreshProfile: vi.fn(),
        checkMfaStatus: vi.fn(),
      });

      renderAuthPage();

      // In mfa_challenge mode the button text changes (no longer shows "Entrar al Sistema")
      expect(screen.queryByText("Entrar al Sistema")).not.toBeInTheDocument();
    });
  });
});

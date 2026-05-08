import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskLevelBadge, StatusBadge, TypeBadge, getRiskLabel } from "@/components/RiskBadges";

describe("RiskBadges", () => {
  describe("getRiskLabel", () => {
    it("should return 'Bajo' for levels <= 4", () => {
      expect(getRiskLabel(1)).toEqual({ label: "Bajo", className: "risk-badge-low" });
      expect(getRiskLabel(4)).toEqual({ label: "Bajo", className: "risk-badge-low" });
    });

    it("should return 'Medio' for levels 5-9", () => {
      expect(getRiskLabel(5)).toEqual({ label: "Medio", className: "risk-badge-medium" });
      expect(getRiskLabel(9)).toEqual({ label: "Medio", className: "risk-badge-medium" });
    });

    it("should return 'Alto' for levels 10-16", () => {
      expect(getRiskLabel(10)).toEqual({ label: "Alto", className: "risk-badge-high" });
      expect(getRiskLabel(16)).toEqual({ label: "Alto", className: "risk-badge-high" });
    });

    it("should return 'Crítico' for levels >= 17", () => {
      expect(getRiskLabel(17)).toEqual({ label: "Crítico", className: "risk-badge-critical" });
      expect(getRiskLabel(25)).toEqual({ label: "Crítico", className: "risk-badge-critical" });
    });
  });

  describe("RiskLevelBadge", () => {
    it("should render risk level badge with correct label and level", () => {
      render(<RiskLevelBadge level={12} />);
      expect(screen.getByText("Alto (12)")).toBeInTheDocument();
    });

    it("should render critical badge for high levels", () => {
      render(<RiskLevelBadge level={20} />);
      expect(screen.getByText("Crítico (20)")).toBeInTheDocument();
    });
  });

  describe("StatusBadge", () => {
    it("should render pending status", () => {
      render(<StatusBadge status="pending" />);
      expect(screen.getByText("Pendiente")).toBeInTheDocument();
    });

    it("should render in_progress status", () => {
      render(<StatusBadge status="in_progress" />);
      expect(screen.getByText("En Proceso")).toBeInTheDocument();
    });

    it("should render completed status", () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText("Completado")).toBeInTheDocument();
    });

    it("should render active status", () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText("Activo")).toBeInTheDocument();
    });

    it("should render mitigated status", () => {
      render(<StatusBadge status="mitigated" />);
      expect(screen.getByText("Mitigado")).toBeInTheDocument();
    });
  });

  describe("TypeBadge", () => {
    it("should render operational type", () => {
      render(<TypeBadge type="operational" />);
      expect(screen.getByText("Operativo")).toBeInTheDocument();
    });

    it("should render legal type", () => {
      render(<TypeBadge type="legal" />);
      expect(screen.getByText("Legal")).toBeInTheDocument();
    });

    it("should render financial type", () => {
      render(<TypeBadge type="financial" />);
      expect(screen.getByText("Financiero")).toBeInTheDocument();
    });

    it("should render security type", () => {
      render(<TypeBadge type="security" />);
      expect(screen.getByText("Seguridad")).toBeInTheDocument();
    });

    it("should render unknown type as-is", () => {
      render(<TypeBadge type="unknown" />);
      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });
});

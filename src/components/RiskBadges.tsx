import { cn } from "@/lib/utils";

type RiskLevel = number;

export function getRiskLabel(level: RiskLevel): { label: string; className: string } {
  if (level <= 4) return { label: "Bajo", className: "risk-badge-low" };
  if (level <= 9) return { label: "Medio", className: "risk-badge-medium" };
  if (level <= 16) return { label: "Alto", className: "risk-badge-high" };
  return { label: "Crítico", className: "risk-badge-critical" };
}

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const { label, className } = getRiskLabel(level);
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold", className)}>
      {label} ({level})
    </span>
  );
}

type StatusType = "pending" | "in_progress" | "completed" | "active" | "mitigated" | "pending_review";

export function StatusBadge({ status }: { status: StatusType }) {
  const map: Record<StatusType, { label: string; className: string }> = {
    pending: { label: "Pendiente", className: "status-badge-pending" },
    in_progress: { label: "En Proceso", className: "status-badge-progress" },
    completed: { label: "Completado", className: "status-badge-completed" },
    active: { label: "Activo", className: "risk-badge-high" },
    mitigated: { label: "Mitigado", className: "risk-badge-low" },
    pending_review: { label: "En Revisión", className: "status-badge-pending" },
  };
  const { label, className } = map[status] ?? map.pending;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold", className)}>
      {label}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    operational: "Operativo",
    legal: "Legal",
    financial: "Financiero",
    security: "Seguridad",
  };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
      {map[type] ?? type}
    </span>
  );
}

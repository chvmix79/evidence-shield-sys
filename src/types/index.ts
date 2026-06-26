/**
 * Tipos compartidos para CHV RiskInsight
 */

// ─── Planes ─────────────────────────────────────────────────────────────────
export interface PlanInfo {
  id: string;
  name: string;
  max_companies: number;
}

// ─── Riesgos ────────────────────────────────────────────────────────────────
export interface RiskRecord {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  probability: number | null;
  impact: number | null;
  risk_level: number | null;
  status: string | null;
  company_id: string | null;
  owner_id: string | null;
  standard_id: string | null;
  created_at: string | null;
}

export interface RiskSummary {
  id: string;
  name: string | null;
  risk_level: number | null;
  type: string | null;
  status: string | null;
  company_id: string | null;
}

// ─── Acciones ───────────────────────────────────────────────────────────────
export interface ActionRecord {
  id: string;
  description: string | null;
  responsible: string | null;
  due_date: string | null;
  status: string | null;
  risk_id: string | null;
  created_at?: string | null;
}

export interface ActionSummary {
  id: string;
  status: string | null;
  due_date: string | null;
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────
export interface DashboardStats {
  totalRisks: number;
  criticalRisks: number;
  activeRisks: number;
  pendingActions: number;
  overdueActions: number;
  completedActions: number;
  evidences: number;
  companies: number;
  recentRisks: RiskSummary[];
  risksByLevel: RiskLevelEntry[];
  score: number;
}

export interface RiskLevelEntry {
  name: string;
  value: number;
}

// ─── StatCard Props ─────────────────────────────────────────────────────────
export interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  desc: string;
}

export interface ProgressItemProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

// ─── Sidebar ────────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: readonly string[];
  plans?: readonly string[];
}

export interface SidebarContentProps {
  user: { email?: string } | null;
  role: string | null;
  signOut: () => void;
  setSidebarOpen: (open: boolean) => void;
  location: { pathname: string };
}

// ─── Alertas ────────────────────────────────────────────────────────────────
export interface AlertRecord {
  id: string;
  company_id: string | null;
  type: string | null;
  title: string | null;
  description: string | null;
  is_read: boolean | null;
  created_at: string | null;
  message?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  tipo?: string | null;
  leido?: boolean | null;
  fecha_creacion?: string | null;
}

export type AlertType = "overdue_action" | "critical_risk" | "missing_evidence" | "info";

// ─── Empresas ───────────────────────────────────────────────────────────────
export interface CompanyRecord {
  id: string;
  name: string | null;
  sector_id: string | null;
  employee_count: string | null;
  risk_level: string | null;
  owner_id: string | null;
  plan_id: string | null;
  created_at: string | null;
  sector_name?: string;
  plan_name?: string;
}

export interface SectorRecord {
  id: string;
  name: string;
}

export interface PlanRecord {
  id: string;
  name: string;
  price: number;
  max_companies: number;
}

// ─── Plantillas de Riesgo ───────────────────────────────────────────────────
export interface RiskTemplate {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  probability: number | null;
  impact: number | null;
  recommended_actions: string | null;
  sector_id: string | null;
  standard_id?: string | null;
}

// ─── Estándares ─────────────────────────────────────────────────────────────
export interface StandardRecord {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_mandatory: boolean | null;
}

// ─── Formularios ────────────────────────────────────────────────────────────
export interface RiskFormData {
  name: string;
  description: string;
  type: "operational" | "legal" | "financial" | "security";
  probability: string;
  impact: string;
  status: "active" | "mitigated" | "pending_review";
}

export interface ActionFormData {
  description: string;
  responsible: string;
  due_date: string;
  status: string;
  risk_id: string;
}

export interface CompanyFormData {
  name: string;
  sector_id: string;
  employee_count: string;
  risk_level: string;
  plan_id: string;
}

// ─── Auditoría ──────────────────────────────────────────────────────────────
export interface AuditChecklist {
  id: string;
  name: string;
  description: string | null;
  sector_id: string | null;
  is_active: boolean | null;
}

export interface AuditChecklistItem {
  id: string;
  checklist_id: string | null;
  category: string;
  question: string;
  requirement_code: string | null;
  order_index: number | null;
}

export interface AuditSession {
  id: string;
  company_id: string | null;
  checklist_id: string | null;
  auditor_id: string | null;
  status: string | null;
  score: number | null;
  created_at: string | null;
  completed_at: string | null;
  audit_checklists?: AuditChecklist | null;
}

export interface AuditResponse {
  id: string;
  session_id: string | null;
  item_id: string | null;
  response: string | null;
  observations: string | null;
  evidence_url: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  old_data: unknown;
  new_data: unknown;
  created_at: string | null;
  userEmail?: string;
}

// ─── Webhooks ───────────────────────────────────────────────────────────────
export interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string | null;
  created_at: string | null;
}

// ─── Perfiles y Roles ───────────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  plan_id: string | null;
  subscription_end_date: string | null;
  subscription_status: string | null;
  created_at: string | null;
}

export interface UserRole {
  id: string;
  user_id: string | null;
  role: string | null;
  created_at: string | null;
  email?: string;
  plan_id?: string;
  subscription_end_date?: string | null;
  subscription_status?: string;
}

// ─── Evidencia extendida ───────────────────────────────────────────────────
export interface EvidenceRecord {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  action_id: string | null;
  risk_id: string | null;
  owner_id: string;
  created_at: string;
  risks?: { name: string } | null;
  actions?: { description: string } | null;
}

import { vi } from "vitest";

export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: "test/path" }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.com/file" } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
};

export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  user_metadata: { full_name: "Test User" },
};

export const mockCompanies = [
  { id: "1", name: "Empresa A", sector: "Tecnología", employee_count: 100, risk_level: "medium", owner_id: "test-user-id", created_at: "2024-01-01" },
  { id: "2", name: "Empresa B", sector: "Salud", employee_count: 50, risk_level: "low", owner_id: "test-user-id", created_at: "2024-01-02" },
];

export const mockRisks = [
  { id: "1", company_id: "1", name: "Riesgo A", description: "Descripción A", type: "operational", probability: 3, impact: 4, risk_level: 12, status: "active", owner_id: "test-user-id", created_at: "2024-01-01" },
  { id: "2", company_id: "1", name: "Riesgo B", description: "Descripción B", type: "legal", probability: 5, impact: 5, risk_level: 25, status: "active", owner_id: "test-user-id", created_at: "2024-01-02" },
];

export const mockActions = [
  { id: "1", risk_id: "1", description: "Acción 1", responsible: "Juan", due_date: "2024-12-31", status: "pending", owner_id: "test-user-id", created_at: "2024-01-01" },
  { id: "2", risk_id: "2", description: "Acción 2", responsible: "Maria", due_date: "2024-11-30", status: "in_progress", owner_id: "test-user-id", created_at: "2024-01-02" },
];

export const mockEvidences = [
  { id: "1", risk_id: "1", action_id: null, name: "Evidencia 1", description: "Desc 1", file_url: "https://test.com/file.pdf", file_type: "application/pdf", file_size: 1024, owner_id: "test-user-id", created_at: "2024-01-01" },
  { id: "2", risk_id: null, action_id: "1", name: "Evidencia 2", description: "Desc 2", file_url: "https://test.com/image.jpg", file_type: "image/jpeg", file_size: 2048, owner_id: "test-user-id", created_at: "2024-01-02" },
];

export const mockAlerts = [
  { id: "1", user_id: "test-user-id", type: "critical_risk", title: "Alerta 1", message: "Mensaje 1", is_read: false, created_at: "2024-01-01" },
  { id: "2", user_id: "test-user-id", type: "overdue_action", title: "Alerta 2", message: "Mensaje 2", is_read: true, created_at: "2024-01-02" },
];

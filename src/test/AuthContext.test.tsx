import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React from "react";

// ─── Hoisted Mocks ──────────────────────────────────────────────────────────

const { mockGetSession, mockOnAuthStateChange, mockMfaLevel, mockSignOut, mockFrom, mockLogger, mockHardCacheClear, mockDifferenceInDays } = vi.hoisted(() => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  const mockGetSession = vi.fn().mockResolvedValue({
    data: { session: null },
  });

  const mockOnAuthStateChange = vi.fn((callback: (event: string, session: any) => void) => {
    authStateCallback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  const mockMfaLevel = vi.fn().mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
  });

  const mockSignOut = vi.fn().mockResolvedValue({ error: null });

  const mockFrom = vi.fn();

  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  const mockHardCacheClear = vi.fn();

  const mockDifferenceInDays = vi.fn();

  return {
    mockGetSession,
    mockOnAuthStateChange,
    mockMfaLevel,
    mockSignOut,
    mockFrom,
    mockLogger,
    mockHardCacheClear,
    mockDifferenceInDays,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
      mfa: {
        getAuthenticatorAssuranceLevel: mockMfaLevel,
      },
    },
    from: mockFrom,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

vi.mock("@/lib/safeCacheClear", () => ({
  hardCacheClear: mockHardCacheClear,
}));

vi.mock("date-fns", () => ({
  differenceInDays: mockDifferenceInDays,
  addDays: vi.fn((date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

// Helper to set up mock supabase chain for user_roles and profiles
function setupSupabaseChain() {
  // Default: no role, basic profile
  const roleChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  
  const profileChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { plan_id: null, subscription_end_date: null, subscription_status: null },
      error: null,
    }),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === "user_roles") return roleChain;
    if (table === "profiles") return profileChain;
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
  });

  return { roleChain, profileChain };
}

// Consumer component that exposes context values for testing
function AuthConsumer() {
  const { session, user, role, plan, subscription, loading, mfaRequired, signOut, refreshProfile, checkMfaStatus } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="session">{session ? "present" : "null"}</div>
      <div data-testid="user">{user ? user.email || "present" : "null"}</div>
      <div data-testid="role">{role || "null"}</div>
      <div data-testid="plan">{plan ? plan.name : "null"}</div>
      <div data-testid="subscription-status">{subscription?.status || "null"}</div>
      <div data-testid="subscription-blocked">{String(subscription?.isBlocked)}</div>
      <div data-testid="subscription-grace">{String(subscription?.isGracePeriod)}</div>
      <div data-testid="subscription-days">{subscription?.daysRemaining ?? "null"}</div>
      <div data-testid="mfa-required">{String(mfaRequired)}</div>
      <button data-testid="signout-btn" onClick={signOut}>Sign Out</button>
      <button data-testid="refresh-btn" onClick={refreshProfile}>Refresh</button>
      <button data-testid="mfa-check-btn" onClick={checkMfaStatus}>Check MFA</button>
    </div>
  );
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: no session, no MFA
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockMfaLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });
    mockDifferenceInDays.mockReturnValue(30); // active subscription by default
  });

  afterEach(() => {
    // Clean up timers
    vi.useRealTimers();
  });

  // ─── Initial State ──────────────────────────────────────────────────────

  describe("Initial state", () => {
    it("should start with loading=true and no session when no cached role", async () => {
      setupSupabaseChain();
      renderAuthProvider();

      // Initially loading, then getSession resolves to null → sets loading=false
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(screen.getByTestId("session").textContent).toBe("null");
      expect(screen.getByTestId("user").textContent).toBe("null");
      expect(screen.getByTestId("role").textContent).toBe("null");
    });

    it("should restore role from localStorage when present", async () => {
      localStorage.setItem("last_user_role", "admin");
      setupSupabaseChain();
      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      // Role should be restored from cache initially
      expect(screen.getByTestId("role").textContent).toBe("admin");
    });
  });

  // ─── Session ─────────────────────────────────────────────────────────────

  describe("Session handling", () => {
    it("should load session from supabase.auth.getSession on mount", async () => {
      const mockUser = { id: "user-1", email: "test@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: "41465153-4d90-41a3-a4af-66e4777e5738", subscription_end_date: "2027-01-01", subscription_status: "active" },
        error: null,
      });

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("session").textContent).toBe("present");
      });
      expect(screen.getByTestId("user").textContent).toBe("test@test.com");
      expect(screen.getByTestId("role").textContent).toBe("admin");
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it("should handle getSession error gracefully", async () => {
      mockGetSession.mockRejectedValue(new Error("Network error"));
      setupSupabaseChain();

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
      expect(screen.getByTestId("session").textContent).toBe("null");
    });
  });

  // ─── Profile & Role ──────────────────────────────────────────────────────

  describe("Profile and role", () => {
    it("should fetch user role and profile when session is present", async () => {
      const mockUser = { id: "user-1", email: "admin@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "superadmin" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: "6a8803e7-ea12-4e31-9270-b660cf6de8d1", subscription_end_date: "2027-06-01", subscription_status: "active" },
        error: null,
      });

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("role").textContent).toBe("superadmin");
      });
      expect(screen.getByTestId("plan").textContent).toBe("Enterprise");
      expect(mockFrom).toHaveBeenCalledWith("user_roles");
      expect(mockFrom).toHaveBeenCalledWith("profiles");
    });

    it("should default to 'user' role when role fetch returns null", async () => {
      const mockUser = { id: "user-2", email: "user@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: null, error: null });

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("role").textContent).toBe("user");
      });
    });

    it("should fallback to Básico plan when plan_id is null", async () => {
      const mockUser = { id: "user-3", email: "basic@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      setupSupabaseChain(); // default profile has null plan_id

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("plan").textContent).toBe("Básico");
      });
    });

    it("should handle role fetch error gracefully", async () => {
      const mockUser = { id: "user-4", email: "error@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockRejectedValue(new Error("DB Error"));

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("role").textContent).toBe("user"); // fallback to "user"
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ─── Subscription ────────────────────────────────────────────────────────

  describe("Subscription handling", () => {
    it("should set subscription as active when endDate is in the future", async () => {
      const mockUser = { id: "user-5", email: "active@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: null, subscription_end_date: "2027-06-01", subscription_status: "active" },
        error: null,
      });
      mockDifferenceInDays.mockReturnValue(30); // 30 days remaining

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("subscription-status").textContent).toBe("active");
      });
      expect(screen.getByTestId("subscription-blocked").textContent).toBe("false");
      expect(screen.getByTestId("subscription-grace").textContent).toBe("false");
      expect(screen.getByTestId("subscription-days").textContent).toBe("30");
    });

    it("should set grace period when endDate is 1 day overdue", async () => {
      const mockUser = { id: "user-6", email: "grace@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: null, subscription_end_date: "2026-01-01", subscription_status: "active" },
        error: null,
      });
      mockDifferenceInDays.mockReturnValue(-1); // 1 day overdue

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("subscription-status").textContent).toBe("grace");
      });
      expect(screen.getByTestId("subscription-grace").textContent).toBe("true");
      expect(screen.getByTestId("subscription-blocked").textContent).toBe("false");
    });

    it("should set blocked when endDate is 3+ days overdue", async () => {
      const mockUser = { id: "user-7", email: "blocked@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: null, subscription_end_date: "2026-01-01", subscription_status: "active" },
        error: null,
      });
      mockDifferenceInDays.mockReturnValue(-5); // 5 days overdue

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("subscription-status").textContent).toBe("blocked");
      });
      expect(screen.getByTestId("subscription-blocked").textContent).toBe("true");
      expect(screen.getByTestId("subscription-grace").textContent).toBe("false");
    });

    it("should never block superadmin regardless of endDate", async () => {
      const mockUser = { id: "user-8", email: "super@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "superadmin" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: null, subscription_end_date: "2026-01-01", subscription_status: "active" },
        error: null,
      });
      mockDifferenceInDays.mockReturnValue(-10); // 10 days overdue

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("subscription-status").textContent).toBe("active");
      });
      expect(screen.getByTestId("subscription-blocked").textContent).toBe("false");
    });

    it("should set blocked when subscription_status is 'blocked' in profile", async () => {
      const mockUser = { id: "user-9", email: "manually-blocked@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: null, subscription_end_date: "2027-06-01", subscription_status: "blocked" },
        error: null,
      });

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("subscription-status").textContent).toBe("blocked");
      });
      expect(screen.getByTestId("subscription-blocked").textContent).toBe("true");
    });

    it("should handle missing subscription_end_date as active", async () => {
      const mockUser = { id: "user-10", email: "no-end@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: null, subscription_end_date: null, subscription_status: null },
        error: null,
      });

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("subscription-status").textContent).toBe("active");
      });
      expect(screen.getByTestId("subscription-blocked").textContent).toBe("false");
    });
  });

  // ─── MFA ─────────────────────────────────────────────────────────────────

  describe("MFA handling", () => {
    it("should set mfaRequired when nextLevel is aal2 and current is aal1", async () => {
      const mockUser = { id: "user-11", email: "mfa@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });
      mockMfaLevel.mockResolvedValue({
        data: { currentLevel: "aal1", nextLevel: "aal2" },
      });

      setupSupabaseChain();

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("mfa-required").textContent).toBe("true");
      });
    });

    it("should not set mfaRequired when levels are the same", async () => {
      const mockUser = { id: "user-12", email: "nomfa@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });
      mockMfaLevel.mockResolvedValue({
        data: { currentLevel: "aal2", nextLevel: "aal2" },
      });

      setupSupabaseChain();

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("mfa-required").textContent).toBe("false");
      });
    });

    it("should handle MFA check error gracefully", async () => {
      const mockUser = { id: "user-13", email: "mfa-error@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });
      mockMfaLevel.mockRejectedValue(new Error("MFA Error"));

      setupSupabaseChain();

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("mfa-required").textContent).toBe("false");
      });
    });

    it("should allow manual MFA check via checkMfaStatus", async () => {
      mockMfaLevel.mockResolvedValue({
        data: { currentLevel: "aal1", nextLevel: "aal2" },
      });

      // Render with no session → MFA not checked initially
      setupSupabaseChain();
      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      // Click MFA check button
      const mfaBtn = screen.getByTestId("mfa-check-btn");
      act(() => mfaBtn.click());

      await waitFor(() => {
        expect(screen.getByTestId("mfa-required").textContent).toBe("true");
      });
    });
  });

  // ─── signOut ─────────────────────────────────────────────────────────────

  describe("signOut", () => {
    it("should clear localStorage, sessionStorage, and redirect on signOut", async () => {
      // Store items to verify they get cleared
      localStorage.setItem("test_key", "value");
      sessionStorage.setItem("test_key", "session_value");
      document.cookie = "test_cookie=value; path=/";

      // Set initial href
      Object.defineProperty(window, "location", {
        value: { href: "/" },
        writable: true,
      });

      setupSupabaseChain();
      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      const signOutBtn = screen.getByTestId("signout-btn");
      act(() => signOutBtn.click());

      // After signOut, localStorage/sessionStorage cleared and redirected
      expect(localStorage.getItem("test_key")).toBeNull();
      expect(sessionStorage.getItem("test_key")).toBeNull();
      expect(window.location.href).toBe("/auth");
      expect(mockHardCacheClear).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  // ─── Auth Events ─────────────────────────────────────────────────────────

  describe("Auth state changes", () => {
    it("should handle SIGNED_IN event", async () => {
      let authCb: ((event: string, session: any) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((cb: (event: string, session: any) => void) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: "41465153-4d90-41a3-a4af-66e4777e5738", subscription_end_date: "2027-06-01", subscription_status: "active" },
        error: null,
      });

      renderAuthProvider();

      act(() => {
        authCb!("SIGNED_IN", {
          user: { id: "user-signedin", email: "signedin@test.com" },
          access_token: "new-token",
          refresh_token: "new-refresh",
          expires_in: 3600,
          token_type: "bearer",
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("session").textContent).toBe("present");
      });
      expect(screen.getByTestId("role").textContent).toBe("admin");
    });

    it("should handle SIGNED_OUT event", async () => {
      localStorage.setItem("selected_company_id", "company-1");
      localStorage.setItem("last_user_role", "admin");

      let authCb: ((event: string, session: any) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((cb: (event: string, session: any) => void) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      setupSupabaseChain();
      renderAuthProvider();

      // Initially show admin role from cache
      await waitFor(() => {
        expect(screen.getByTestId("role").textContent).toBe("admin");
      });

      act(() => {
        authCb!("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(screen.getByTestId("role").textContent).toBe("null");
      });
      expect(screen.getByTestId("session").textContent).toBe("null");
      expect(screen.getByTestId("plan").textContent).toBe("null");
      expect(screen.getByTestId("subscription-status").textContent).toBe("null");
      expect(localStorage.getItem("selected_company_id")).toBeNull();
    });

    it("should handle USER_UPDATED event", async () => {
      let authCb: ((event: string, session: any) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((cb: (event: string, session: any) => void) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      setupSupabaseChain();
      renderAuthProvider();

      act(() => {
        authCb!("USER_UPDATED", {
          user: { id: "user-updated", email: "updated@test.com" },
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
          token_type: "bearer",
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("session").textContent).toBe("present");
      });
    });
  });

  // ─── refreshProfile ──────────────────────────────────────────────────────

  describe("refreshProfile", () => {
    it("should re-fetch profile data when called", async () => {
      const mockUser = { id: "user-refresh", email: "refresh@test.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2024-01-01" };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser, access_token: "token", refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } },
      });

      const { roleChain, profileChain } = setupSupabaseChain();
      roleChain.maybeSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      profileChain.maybeSingle.mockResolvedValue({
        data: { plan_id: null, subscription_end_date: null, subscription_status: null },
        error: null,
      });

      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("role").textContent).toBe("user");
      });

      // Click refresh button - should call fetchProfileData again
      const refreshBtn = screen.getByTestId("refresh-btn");
      act(() => refreshBtn.click());

      // After refresh, it should call from again
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("user_roles");
      });
    });

    it("should not fetch profile when user is null", async () => {
      setupSupabaseChain();
      renderAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      // refreshProfile should early-return when no user
      expect(mockFrom).not.toHaveBeenCalledWith("user_roles");
    });
  });

  // ─── Failsafe ────────────────────────────────────────────────────────────

  describe("Failsafe timeout", () => {
    it("should set loading=false after 10s even if getSession hangs", async () => {
      vi.useFakeTimers();

      // getSession never resolves
      mockGetSession.mockReturnValue(new Promise(() => {}));

      setupSupabaseChain();
      renderAuthProvider();

      // Should still be loading
      expect(screen.getByTestId("loading").textContent).toBe("true");

      // Advance timer past 10s failsafe
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // waitFor doesn't work with fake timers (uses setTimeout internally)
      // Use microtask flush + re-render to verify loading changed
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId("loading").textContent).toBe("false");
      expect(mockLogger.debug).toHaveBeenCalledWith("[Auth] Desbloqueo preventivo por tiempo agotado.");

      vi.useRealTimers();
    });
  });
});

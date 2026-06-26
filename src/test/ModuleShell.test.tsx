import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModuleShell } from "@/components/ModuleShell";
import { MemoryRouter } from "react-router-dom";

// Mock child components used by ModuleShell
vi.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/safeCacheClear", () => ({
  hardCacheClear: vi.fn(),
  moduleCacheClear: vi.fn(),
}));

vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
}));

describe("ModuleShell", () => {
  it("should render children content inside the shell", () => {
    render(
      <MemoryRouter>
        <ModuleShell>
          <div>Module Content</div>
        </ModuleShell>
      </MemoryRouter>
    );

    expect(screen.getByText("Module Content")).toBeInTheDocument();
  });
});

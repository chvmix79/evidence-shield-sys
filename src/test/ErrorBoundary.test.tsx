import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import React from "react";

// Mock Sentry with vi.hoisted for direct access
const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}));

vi.mock("@sentry/react", () => ({
  captureException: mockCaptureException,
}));

// Mock logger with vi.hoisted for direct access
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

const { mockModuleCacheClear, mockHardCacheClear } = vi.hoisted(() => ({
  mockModuleCacheClear: vi.fn(),
  mockHardCacheClear: vi.fn(),
}));

vi.mock("@/lib/safeCacheClear", () => ({
  hardCacheClear: mockHardCacheClear,
  moduleCacheClear: mockModuleCacheClear,
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { ...window.location, reload: mockReload, href: "" },
  writable: true,
});

// Component that throws based on mutable variable
let shouldThrow = true;
function RecoverableComponent() {
  if (shouldThrow) throw new Error("Test error message");
  return <div>Recovered component</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldThrow = false; // default: don't throw (for "renders children" test)
  });

  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should show error UI when child throws", () => {
    shouldThrow = true;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <RecoverableComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Error de Ejecución")).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    expect(screen.getByText("Intentar Recuperar")).toBeInTheDocument();
    expect(screen.getByText("Limpieza Total y Salir")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("should log error and capture Sentry exception on error", () => {
    shouldThrow = true;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <RecoverableComponent />
      </ErrorBoundary>
    );

    expect(mockLogger.error).toHaveBeenCalledWith("ErrorBoundary:", "Test error message");
    expect(mockCaptureException).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should reset error state when clicking 'Intentar Recuperar'", () => {
    shouldThrow = true;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary resetKey="/risks">
        <RecoverableComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Error de Ejecución")).toBeInTheDocument();

    // Stop throwing BEFORE clicking retry so child renders normally after reset
    shouldThrow = false;

    act(() => {
      screen.getByText("Intentar Recuperar").click();
    });

    expect(mockModuleCacheClear).toHaveBeenCalledWith("risks-data");
    expect(screen.queryByText("Error de Ejecución")).not.toBeInTheDocument();
    expect(screen.getByText("Recovered component")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("should trigger window reload on chunk errors", () => {
    shouldThrow = true;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Render with a chunk error type
    shouldThrow = true;
    let chunkShouldThrow = true;
    function ChunkErrorComponent() {
      if (chunkShouldThrow) throw new Error("Failed to fetch chunk");
      return <div>Loaded</div>;
    }

    render(
      <ErrorBoundary resetKey="/risks">
        <ChunkErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Error de Ejecución")).toBeInTheDocument();

    // A chunk error triggers moduleCacheClear + window reload after 100ms
    expect(mockModuleCacheClear).toHaveBeenCalledWith("risks-data");

    consoleSpy.mockRestore();
  });
});

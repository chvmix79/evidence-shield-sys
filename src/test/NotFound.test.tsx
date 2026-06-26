import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/pages/NotFound";
import { MemoryRouter } from "react-router-dom";

// Shared mockLogger accessible in all tests
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

describe("NotFound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render 404 heading", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render page not found message", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText(/Oops! Page not found/)).toBeInTheDocument();
  });

  it("should render a link to return to home", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    const link = screen.getByText("Return to Home");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/");
  });

  it("should log the 404 error with the attempted path", () => {
    render(
      <MemoryRouter initialEntries={["/nonexistent-path"]}>
        <NotFound />
      </MemoryRouter>
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/nonexistent-path"
    );
  });
});

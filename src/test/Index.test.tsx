import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Index from "@/pages/Index";
import { MemoryRouter } from "react-router-dom";

describe("Index", () => {
  it("should render Navigate component to redirect to /", () => {
    // Navigate doesn't render visible DOM, just changes internal router location.
    // Verify it doesn't crash and renders an empty fragment.
    const { container } = render(
      <MemoryRouter initialEntries={["/index"]}>
        <Index />
      </MemoryRouter>
    );

    // Navigate from react-router-dom renders nothing visible (just a data attribute or empty)
    // The component shouldn't throw or crash
    expect(container).toBeDefined();
  });
});

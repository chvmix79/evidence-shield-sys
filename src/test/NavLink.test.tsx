import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavLink } from "@/components/NavLink";
import { MemoryRouter } from "react-router-dom";

describe("NavLink", () => {
  it("should render a link with the correct href", () => {
    render(
      <MemoryRouter>
        <NavLink to="/risks" className="text-sm">Mis Riesgos</NavLink>
      </MemoryRouter>
    );

    const link = screen.getByText("Mis Riesgos");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/risks");
  });

  it("should apply custom className", () => {
    render(
      <MemoryRouter>
        <NavLink to="/" className="custom-class">Home</NavLink>
      </MemoryRouter>
    );

    const link = screen.getByText("Home");
    expect(link.className).toContain("custom-class");
  });

  it("should apply activeClassName when route matches", () => {
    render(
      <MemoryRouter initialEntries={["/active-page"]}>
        <NavLink to="/active-page" className="base" activeClassName="is-active">Active Link</NavLink>
      </MemoryRouter>
    );

    const link = screen.getByText("Active Link");
    expect(link.className).toContain("is-active");
  });
});

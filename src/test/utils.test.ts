import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conflicting tailwind classes", () => {
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toContain("bg-blue-500");
  });

  it("should handle conditional classes", () => {
    const result = cn("foo", true && "bar", false && "baz");
    expect(result).toBe("foo bar");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle array inputs", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toBe("foo bar");
  });

  it("should handle object inputs", () => {
    const result = cn({ foo: true, bar: false });
    expect(result).toBe("foo");
  });
});

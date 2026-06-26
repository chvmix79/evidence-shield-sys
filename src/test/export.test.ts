import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportToExcel } from "@/lib/export";

// ─── Hoisted Mocks ──────────────────────────────────────────────────────────

const { mockWorkbook, mockWorksheet, mockLogger, mockFormat } = vi.hoisted(() => {
  const mockWorksheet = {
    columns: undefined as any,
    addRows: vi.fn(),
    getRow: vi.fn(() => ({ font: {} })),
  };

  const mockWorkbook = {
    addWorksheet: vi.fn(() => mockWorksheet),
    xlsx: {
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };

  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  const mockFormat = vi.fn(() => "2026-06-25");

  return { mockWorkbook, mockWorksheet, mockLogger, mockFormat };
});

vi.mock("exceljs", () => ({
  default: {
    Workbook: vi.fn(function () { return mockWorkbook; }),
  },
  Workbook: vi.fn(function () { return mockWorkbook; }),
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

vi.mock("date-fns", () => ({
  format: mockFormat,
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("exportToExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset worksheet mocks
    mockWorksheet.addRows = vi.fn();
    mockWorksheet.getRow = vi.fn(() => ({ font: {} }));
    mockWorksheet.columns = undefined;
    mockWorkbook.addWorksheet = vi.fn(() => mockWorksheet);
    mockWorkbook.xlsx.writeFile = vi.fn().mockResolvedValue(undefined);
  });

  describe("Input validation", () => {
    it("should warn and return early when data is null", async () => {
      await exportToExcel(null as any, "test", "Sheet1");

      expect(mockLogger.warn).toHaveBeenCalledWith("No data provided to exportToExcel.");
      expect(mockWorkbook.addWorksheet).not.toHaveBeenCalled();
    });

    it("should warn and return early when data is empty array", async () => {
      await exportToExcel([], "test", "Sheet1");

      expect(mockLogger.warn).toHaveBeenCalledWith("No data provided to exportToExcel.");
      expect(mockWorkbook.addWorksheet).not.toHaveBeenCalled();
    });

    it("should warn and return early when data is undefined", async () => {
      await exportToExcel(undefined as any, "test", "Sheet1");

      expect(mockLogger.warn).toHaveBeenCalledWith("No data provided to exportToExcel.");
      expect(mockWorkbook.addWorksheet).not.toHaveBeenCalled();
    });
  });

  describe("Workbook creation", () => {
    it("should create a new workbook", async () => {
      const data = [{ name: "Test", value: 123 }];

      await exportToExcel(data, "test-file", "MySheet");

      // Workbook constructor was called (via the mock)
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith("MySheet");
    });

    it("should use default sheet name 'Hoja1' when not provided", async () => {
      const data = [{ name: "Test" }];

      await exportToExcel(data, "test-file");

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith("Hoja1");
    });
  });

  describe("Column mapping", () => {
    it("should map object keys to worksheet columns", async () => {
      const data = [
        { name: "Risk A", level: 5, status: "active" },
      ];

      await exportToExcel(data, "test", "Sheet1");

      expect(mockWorksheet.columns).toEqual([
        { header: "name", key: "name", width: expect.any(Number) },
        { header: "level", key: "level", width: expect.any(Number) },
        { header: "status", key: "status", width: expect.any(Number) },
      ]);
    });

    it("should calculate column width based on key length", async () => {
      const data = [
        { short: "val", very_long_key_name: "val" },
      ];

      await exportToExcel(data, "test", "Sheet1");

      const columns = mockWorksheet.columns as any[];
      // short: Math.max(5*2, 15) = 15
      expect(columns[0].width).toBe(15);
      // very_long_key_name: Math.max(18*2, 15) = 36
      expect(columns[1].width).toBe(36);
    });
  });

  describe("Data rows", () => {
    it("should add all data rows to the worksheet", async () => {
      const data = [
        { name: "Risk A", level: 5 },
        { name: "Risk B", level: 3 },
        { name: "Risk C", level: 4 },
      ];

      await exportToExcel(data, "test", "Sheet1");

      expect(mockWorksheet.addRows).toHaveBeenCalledWith(data);
      expect(mockWorksheet.addRows).toHaveBeenCalledTimes(1);
    });

    it("should handle single row of data", async () => {
      const data = [{ id: 1, name: "Single" }];

      await exportToExcel(data, "test", "Sheet1");

      expect(mockWorksheet.addRows).toHaveBeenCalledWith(data);
    });
  });

  describe("Header styling", () => {
    it("should set header row font to bold", async () => {
      const data = [{ name: "Test" }];
      const mockRow = { font: {} };

      mockWorksheet.getRow = vi.fn(() => mockRow);

      await exportToExcel(data, "test", "Sheet1");

      expect(mockWorksheet.getRow).toHaveBeenCalledWith(1);
      expect(mockRow.font).toEqual({ bold: true });
    });
  });

  describe("File name and write", () => {
    it("should generate filename with date stamp", async () => {
      mockFormat.mockReturnValue("2026-06-25");
      const data = [{ name: "Test" }];

      await exportToExcel(data, "Riesgos", "Riesgos");

      expect(mockFormat).toHaveBeenCalled();
      expect(mockWorkbook.xlsx.writeFile).toHaveBeenCalledWith("Riesgos-2026-06-25.xlsx");
    });

    it("should call writeFile to save the workbook", async () => {
      const data = [{ name: "Test" }];

      await exportToExcel(data, "export", "Data");

      expect(mockWorkbook.xlsx.writeFile).toHaveBeenCalledTimes(1);
      expect(mockWorkbook.xlsx.writeFile).toHaveBeenCalledWith(expect.stringContaining("export-"));
    });

    it("should handle special characters in filename", async () => {
      mockFormat.mockReturnValue("2026-06-25");
      const data = [{ name: "Test" }];

      await exportToExcel(data, "Plan_Accion", "Acciones");

      expect(mockWorkbook.xlsx.writeFile).toHaveBeenCalledWith("Plan_Accion-2026-06-25.xlsx");
    });
  });

  describe("Complex data", () => {
    it("should handle objects with nested values as flat keys", async () => {
      const data = [
        { id: 1, "risk.name": "Test", score: 10 },
      ];

      await exportToExcel(data, "test", "Sheet1");

      expect(mockWorksheet.columns).toHaveLength(3);
      expect(mockWorksheet.addRows).toHaveBeenCalledWith(data);
    });

    it("should handle large datasets without error", async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random(),
      }));

      await expect(exportToExcel(largeData, "large", "Data")).resolves.not.toThrow();
      expect(mockWorksheet.addRows).toHaveBeenCalledWith(largeData);
    });
  });
});

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

/**
 * Utility to export an array of JSON objects to an Excel (.xlsx) file.
 * @param {any[]} data - The JSON data to export.
 * @param {string} fileName - The base name of the file to save (without extension).
 * @param {string} sheetName - The name of the worksheet inside the Excel document.
 */
export async function exportToExcel(data: Record<string, any>[], fileName: string, sheetName: string = "Hoja1") {
  if (!data || data.length === 0) {
    logger.warn("No data provided to exportToExcel.");
    return;
  }

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();

  // Add worksheet
  const worksheet = workbook.addWorksheet(sheetName);

  // Define columns from the keys of the first data object
  const keys = Object.keys(data[0]);
  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(key.length * 2, 15),
  }));

  // Add rows from JSON array
  worksheet.addRows(data);

  // Style the header row
  worksheet.getRow(1).font = { bold: true };

  // Generate date stamp string formatted YYYY-MM-DD
  const dateStr = format(new Date(), "yyyy-MM-dd");

  // Create the final filename
  const finalFileName = `${fileName}-${dateStr}.xlsx`;

  // Write file to user's computer
  await workbook.xlsx.writeFile(finalFileName);
}

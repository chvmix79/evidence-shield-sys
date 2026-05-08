import * as XLSX from "xlsx";
import { format } from "date-fns";

/**
 * Utility to export an array of JSON objects to an Excel (.xlsx) file.
 * @param {any[]} data - The JSON data to export.
 * @param {string} fileName - The base name of the file to save (without extension).
 * @param {string} sheetName - The name of the worksheet inside the Excel document.
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName: string = "Hoja1") {
  if (!data || data.length === 0) {
    console.warn("No data provided to exportToExcel.");
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert JSON to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate date stamp string formatted YYYY-MM-DD
  const dateStr = format(new Date(), "yyyy-MM-dd");
  
  // Create the final filename
  const finalFileName = `${fileName}-${dateStr}.xlsx`;

  // Write file to user's computer
  XLSX.writeFile(workbook, finalFileName);
}

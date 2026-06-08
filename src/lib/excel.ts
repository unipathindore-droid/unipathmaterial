import ExcelJS from "exceljs";

const MAX_WORKBOOK_BYTES = 5 * 1024 * 1024;
const MAX_WORKBOOK_ROWS = 5000;
const ALLOWED_WORKBOOK_EXTENSIONS = new Set([".xlsx"]);

function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

export async function parseWorkbookRows(file: File) {
  if (file.size > MAX_WORKBOOK_BYTES) {
    throw new Error("Workbook is too large. Upload a file up to 5 MB.");
  }

  if (!ALLOWED_WORKBOOK_EXTENSIONS.has(getFileExtension(file.name))) {
    throw new Error("Unsupported workbook type. Upload an .xlsx file.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return [];
  }

  const headerRow = sheet.getRow(1);
  const headers = headerRow.values as ExcelJS.CellValue[];
  const rows: Record<string, unknown>[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record: Record<string, unknown> = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (index === 0 || !header) {
        return;
      }

      const key = String(header).trim();
      if (!key) {
        return;
      }

      const value = row.getCell(index).value ?? "";
      record[key] = value;
      hasValue ||= value !== "";
    });

    if (hasValue) {
      rows.push(record);
    }
  });

  if (rows.length > MAX_WORKBOOK_ROWS) {
    throw new Error("Workbook has too many rows. Upload up to 5000 rows at a time.");
  }

  return rows;
}

export function buildWorkbookBuffer(
  rows: Record<string, unknown>[],
  sheetName: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
  }));
  worksheet.addRows(rows);

  return workbook.xlsx.writeBuffer().then((buffer) => new Uint8Array(buffer as ArrayBuffer));
}

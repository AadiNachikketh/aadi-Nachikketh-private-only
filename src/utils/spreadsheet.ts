import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { sanitizeSpreadsheetCell } from '../lib/crm-logic';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

export async function parseUploadedSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          const headers = results.meta.fields || Object.keys(results.data[0] || {});
          resolve({
            headers,
            rows: results.data,
          });
        },
        error: (err) => reject(err),
      });
    });
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Spreadsheet contains no sheets.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    const rows = jsonData.map((r) => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        clean[k] = v === null || v === undefined ? '' : String(v);
      }
      return clean;
    });
    return { headers, rows };
  }

  throw new Error('Unsupported file format. Please upload a .csv or .xlsx file.');
}

export interface ExportColumnDef<T> {
  key: string;
  label: string;
  getValue: (row: T) => unknown;
}

export function exportRecordsToFile<T>(
  records: T[],
  columns: ExportColumnDef<T>[],
  filenameBase: string,
  format: 'csv' | 'xlsx'
) {
  const safeData = records.map((item) => {
    const rowObj: Record<string, string> = {};
    for (const col of columns) {
      const rawVal = col.getValue(item);
      rowObj[col.label] = sanitizeSpreadsheetCell(rawVal);
    }
    return rowObj;
  });

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const cleanBase = filenameBase
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (format === 'csv') {
    const csvContent = Papa.unparse(safeData, { quotes: true });
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanBase}_${dateSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return `${cleanBase}_${dateSuffix}.csv`;
  } else {
    const worksheet = XLSX.utils.json_to_sheet(safeData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    const filename = `${cleanBase}_${dateSuffix}.xlsx`;
    XLSX.writeFile(workbook, filename);
    return filename;
  }
}

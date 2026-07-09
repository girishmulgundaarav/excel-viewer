import * as XLSX from 'xlsx';
import type { WorkbookData, SheetData } from '../types/excel';

export function parseExcelFile(file: File): Promise<WorkbookData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheets: SheetData[] = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          const jsonData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
            worksheet,
            { header: 1, defval: null }
          );

          if (jsonData.length === 0) {
            return { name, headers: [], rows: [] };
          }

          const headers = (jsonData[0] as (string | number | boolean | null)[]).map((h) =>
            h !== null && h !== undefined ? String(h) : ''
          );
          const rows = jsonData.slice(1) as (string | number | boolean | null)[][];

          return { name, headers, rows };
        });

        resolve({ fileName: file.name, sheets });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

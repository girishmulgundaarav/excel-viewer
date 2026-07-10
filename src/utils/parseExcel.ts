import * as XLSX from 'xlsx';
import type { WorkbookData, SheetData } from '../types/excel';

export function parseExcelFile(file: File): Promise<WorkbookData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // cellDates: false ensures that CSV/Excel dates are loaded exactly as pre-formatted strings (e.g. 11/08/1966)
        // rather than parsed into standard short JavaScript Date formats
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: false });

        const sheets: SheetData[] = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          const jsonData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
            worksheet,
            { header: 1, defval: null, raw: false }
          );

          if (jsonData.length === 0) {
            return { name, headers: [], rows: [] };
          }

          const headers = (jsonData[0] as (string | number | boolean | null)[]).map((h) =>
            h !== null && h !== undefined ? String(h) : ''
          );
          let rows = jsonData.slice(1) as (string | number | boolean | null)[][];

          // Function to standardize date formats to DD/MM/YYYY
          const standardizeDateValue = (val: string | number | boolean | null): string | number | boolean | null => {
            if (typeof val !== 'string') return val;
            
            // Matches formats like D/M/YY, DD/M/YY, D/MM/YY, DD/MM/YYYY with slashes, dots or hyphens
            const dateRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/;
            const match = val.trim().match(dateRegex);
            
            if (match) {
              let [_, d, m, y] = match;
              
              // Pad day with leading zero if single digit
              const day = d.padStart(2, '0');
              // Pad month with leading zero if single digit
              const month = m.padStart(2, '0');
              
              // Standardize 2-digit years to 4-digit years based on DOB standard (current year is 2026)
              let year = y;
              if (y.length === 2) {
                const numericYear = parseInt(y, 10);
                if (numericYear <= 26) {
                  year = `20${y.padStart(2, '0')}`;
                } else {
                  year = `19${y.padStart(2, '0')}`;
                }
              }
              
              return `${day}/${month}/${year}`;
            }
            
            return val;
          };

          // Apply date standardizations across all cells
          rows = rows.map((row) => row.map(standardizeDateValue));

          // Auto-fill merged cells down and right
          if (worksheet['!merges']) {
            worksheet['!merges'].forEach((merge) => {
              const startRow = merge.s.r; // 0-based row index in SheetJS
              const startCol = merge.s.c; // 0-based col index
              const endRow = merge.e.r;
              const endCol = merge.e.c;

              // The main value sits at the top-left cell of the merged block
              // Subtract 1 because headers (row 0) were sliced off.
              const dataStartRow = startRow - 1;
              const dataEndRow = endRow - 1;

              // Ensure the coordinates fall inside the parsed rows bounds
              if (dataStartRow >= 0 && dataStartRow < rows.length) {
                const mergedValue = rows[dataStartRow][startCol];

                // Replicate the value down and right across the entire merged range
                for (let r = Math.max(0, dataStartRow); r <= Math.min(rows.length - 1, dataEndRow); r++) {
                  for (let c = startCol; c <= endCol; c++) {
                    if (r === dataStartRow && c === startCol) continue; // Skip top-left itself
                    
                    // Pad cols dynamically if the row array is too short
                    while (rows[r].length <= c) {
                      rows[r].push(null);
                    }
                    rows[r][c] = mergedValue;
                  }
                }
              }
            });
          }

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

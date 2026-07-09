export interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

export interface WorkbookData {
  fileName: string;
  sheets: SheetData[];
}

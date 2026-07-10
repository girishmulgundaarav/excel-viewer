import { useState, useMemo, useRef } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Eye, EyeOff, SlidersHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import type { SheetData } from '../types/excel';
import * as XLSX from 'xlsx';

interface SheetTableProps {
  sheet: SheetData;
  fileName: string;
}

type SortDir = 'asc' | 'desc' | null;

export default function SheetTable({ sheet, fileName }: SheetTableProps) {
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<number, string>>({});
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [showColPanel, setShowColPanel] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Record<number, boolean>>({});
  const PAGE_SIZE = 50;

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeftMost = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollRightMost = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        left: tableContainerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  };

  const toggleColumn = (idx: number) => {
    setHiddenCols((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const showAllColumns = () => {
    setHiddenCols({});
  };

  const hideAllColumns = () => {
    const allHidden: Record<number, boolean> = {};
    sheet.headers.forEach((_, i) => {
      allHidden[i] = true;
    });
    setHiddenCols(allHidden);
  };

  const handleColumnFilter = (idx: number, val: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [idx]: val,
    }));
    setPage(1);
  };

  const clearColumnFilters = () => {
    setColumnFilters({});
    setPage(1);
  };

  const filtered = useMemo(() => {
    return sheet.rows.filter((row) => {
      // 1. Global Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesGlobal = row.some(
          (cell, ci) => !hiddenCols[ci] && cell !== null && String(cell).toLowerCase().includes(q)
        );
        if (!matchesGlobal) return false;
      }

      // 2. Individual Column Filters
      for (const [colIdxStr, filterVal] of Object.entries(columnFilters)) {
        const colIdx = Number(colIdxStr);
        const q = filterVal.trim().toLowerCase();
        if (!q || hiddenCols[colIdx]) continue;
        
        const cellVal = row[colIdx];
        const isBlank = cellVal === null || cellVal === undefined || String(cellVal).trim() === '';

        if (q === 'empty' || q === 'blank' || q === 'null' || q === '—') {
          if (!isBlank) return false;
        } else {
          if (isBlank) return false;
          const formattedVal = String(cellVal).toLowerCase();
          if (!formattedVal.includes(q)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [sheet.rows, search, hiddenCols, columnFilters]);

  const sorted = useMemo(() => {
    if (sortCol === null || sortDir === null) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (idx: number) => {
    if (sortCol !== idx) {
      setSortCol(idx);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortCol(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const exportSheet = () => {
    // Only export non-hidden columns
    const filteredHeaders = sheet.headers.filter((_, ci) => !hiddenCols[ci]);
    const filteredRows = sheet.rows.map((row) => row.filter((_, ci) => !hiddenCols[ci]));
    const ws = XLSX.utils.aoa_to_sheet([filteredHeaders, ...filteredRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    XLSX.writeFile(wb, `${fileName.replace(/\.[^.]+$/, '')}_${sheet.name}.xlsx`);
  };

  const SortIcon = ({ idx }: { idx: number }) => {
    if (sortCol !== idx) return <ArrowUpDown size={13} className="opacity-30" />;
    if (sortDir === 'asc') return <ArrowUp size={13} className="text-indigo-600" />;
    return <ArrowDown size={13} className="text-indigo-600" />;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search rows…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowColPanel(!showColPanel)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors ${
              showColPanel
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            Columns {Object.keys(hiddenCols).filter((k) => hiddenCols[Number(k)]).length > 0 && (
              <span className="bg-red-500 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                {Object.keys(hiddenCols).filter((k) => hiddenCols[Number(k)]).length} hidden
              </span>
            )}
          </button>
          
          {Object.keys(columnFilters).filter((k) => columnFilters[Number(k)]?.trim()).length > 0 && (
            <button
              onClick={clearColumnFilters}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-100 transition-colors"
            >
              Clear Filters ({Object.keys(columnFilters).filter((k) => columnFilters[Number(k)]?.trim()).length})
            </button>
          )}
        </div>
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 shadow-sm">
          <span className="font-semibold">💡 Pro-tip:</span>
          <span>Hold <kbd className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-sans font-bold text-[10px]">Shift</kbd> + scroll mouse wheel, or use:</span>
          <div className="flex items-center gap-1 ml-1 bg-white border border-indigo-200 rounded-md p-0.5">
            <button
              onClick={scrollLeftMost}
              title="Scroll to first column (Left)"
              className="p-1 rounded text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
            </button>
            <button
              onClick={scrollRightMost}
              title="Scroll to last column (Right)"
              className="p-1 rounded text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors cursor-pointer"
            >
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>{sorted.length.toLocaleString()} row{sorted.length !== 1 ? 's' : ''}</span>
          <button
            onClick={exportSheet}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Column Customizer Panel */}
      {showColPanel && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Toggle Visible Columns</h3>
            <div className="flex gap-3">
              <button
                onClick={hideAllColumns}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Hide All
              </button>
              <button
                onClick={showAllColumns}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Show All (Reset)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            {sheet.headers.map((h, i) => {
              const name = h || `Column ${i + 1}`;
              const isHidden = !!hiddenCols[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleColumn(i)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                    isHidden
                      ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                      : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div ref={tableContainerRef} className="overflow-auto rounded-xl border border-slate-200 shadow-sm max-h-[calc(100vh-280px)]">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-indigo-600 shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
            <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <th className="w-10 px-3 py-3 text-center font-medium text-indigo-400 text-xs">#</th>
              {sheet.headers.map((h, i) => {
                if (hiddenCols[i]) return null;
                return (
                  <th
                    key={i}
                    className="whitespace-nowrap px-4 py-3 text-left font-semibold select-none hover:bg-white/10 transition-colors"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Column Title and Sort Action Button */}
                      <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort(i)}>
                        <span>{h || `Col ${i + 1}`}</span>
                        <SortIcon idx={i} />
                      </div>
                      {/* Column filter input box */}
                      <input
                        type="text"
                        placeholder="Filter col…"
                        value={columnFilters[i] || ''}
                        onChange={(e) => handleColumnFilter(i, e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent triggering sort action when clicking input
                        className="w-full rounded border border-indigo-400/40 bg-indigo-950/40 py-1 px-2 text-xs font-normal text-white placeholder-indigo-200/50 focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-all"
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={sheet.headers.length + 1 - Object.keys(hiddenCols).filter((k) => hiddenCols[Number(k)]).length}
                  className="py-16 text-center text-slate-400"
                >
                  No rows match your search.
                </td>
              </tr>
            ) : (
              pageRows.map((row, ri) => {
                const absIdx = (page - 1) * PAGE_SIZE + ri;
                return (
                  <tr
                    key={absIdx}
                    className={`transition-colors hover:bg-indigo-50/60 ${
                      absIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400">
                      {absIdx + 1}
                    </td>
                    {sheet.headers.map((_, ci) => {
                      if (hiddenCols[ci]) return null;
                      const val = row[ci];
                      return (
                        <td
                          key={ci}
                          className="max-w-xs truncate px-4 py-2.5 text-slate-700"
                          title={val !== null && val !== undefined ? String(val) : ''}
                        >
                          {val !== null && val !== undefined ? String(val) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    p === page
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

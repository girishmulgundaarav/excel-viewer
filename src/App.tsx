import { useState } from 'react';
import { FileSpreadsheet, X, ChevronDown, LayoutGrid, Table2, AreaChart } from 'lucide-react';
import DropZone from './components/DropZone';
import SheetTable from './components/SheetTable';
import SheetStats from './components/SheetStats';
import SheetCharts from './components/SheetCharts';
import { parseExcelFile } from './utils/parseExcel';
import type { WorkbookData } from './types/excel';

type View = 'table' | 'stats' | 'charts';

export default function App() {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('table');

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const data = await parseExcelFile(file);
      setWorkbook(data);
      setActiveSheet(0);
      setView('table');
    } catch {
      setError('Could not parse the file. Please make sure it is a valid Excel or CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setWorkbook(null);
    setError(null);
    setActiveSheet(0);
  };

  const sheet = workbook?.sheets[activeSheet];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-full items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800 leading-none">ExcelView</span>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">Local spreadsheet viewer</p>
            </div>
          </div>

          {workbook && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
            >
              <X size={14} />
              Close file
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-full px-6 py-8">
        {!workbook ? (
          <div className="flex flex-col gap-6">
            {/* Hero */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800">
                View Excel files in your browser
              </h1>
              <p className="mt-2 text-slate-500">
                Drag &amp; drop any <strong>.xlsx</strong>, <strong>.xls</strong>, or{' '}
                <strong>.csv</strong> file — processed entirely on your device.
              </p>
            </div>

            <DropZone onFileSelected={handleFile} isLoading={loading} />

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Feature cards */}
            <div className="grid gap-4 sm:grid-cols-3 mt-2">
              {[
                { title: 'Sort & Filter', desc: 'Click any column header to sort. Use the search bar to filter rows instantly.' },
                { title: 'Multiple Sheets', desc: 'Navigate between all sheets in a workbook with a single click.' },
                { title: 'Column Stats', desc: 'Switch to Stats view to see types, unique counts, and numeric ranges.' },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-800">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* File info bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{workbook.fileName}</p>
                  <p className="text-xs text-slate-400">
                    {workbook.sheets.length} sheet{workbook.sheets.length !== 1 ? 's' : ''} &middot;{' '}
                    {workbook.sheets.reduce((a, s) => a + s.rows.length, 0).toLocaleString()} total rows
                  </p>
                </div>
              </div>

              {/* View toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                <button
                  onClick={() => setView('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    view === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Table2 size={14} /> Table
                </button>
                <button
                  onClick={() => setView('stats')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    view === 'stats' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LayoutGrid size={14} /> Stats
                </button>
                <button
                  onClick={() => setView('charts')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    view === 'charts' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AreaChart size={14} /> Charts
                </button>
              </div>
            </div>

            {/* Sheet tabs */}
            {workbook.sheets.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {workbook.sheets.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSheet(i)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      i === activeSheet
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                  >
                    <ChevronDown
                      size={13}
                      className={`transition-transform ${i === activeSheet ? 'rotate-180' : ''}`}
                    />
                    {s.name}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        i === activeSheet ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {s.rows.length.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            {sheet && (
              <>
                {sheet.headers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">
                    This sheet appears to be empty.
                  </div>
                ) : view === 'table' ? (
                  <SheetTable sheet={sheet} fileName={workbook.fileName} />
                ) : view === 'stats' ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-500">
                      Column overview for <strong>{sheet.name}</strong> — {sheet.headers.length} columns,{' '}
                      {sheet.rows.length.toLocaleString()} rows
                    </p>
                    <SheetStats sheet={sheet} />
                  </div>
                ) : (
                  <SheetCharts sheet={sheet} />
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        Files are processed locally in your browser. Nothing is sent to any server.
      </footer>
    </div>
  );
}


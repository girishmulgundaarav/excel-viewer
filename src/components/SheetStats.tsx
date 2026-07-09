import { useMemo } from 'react';
import type { SheetData } from '../types/excel';
import { Hash, Type, CheckSquare, HelpCircle, BarChart2 } from 'lucide-react';

interface SheetStatsProps {
  sheet: SheetData;
}

function inferType(vals: (string | number | boolean | null)[]) {
  const nonNull = vals.filter((v) => v !== null && v !== '');
  if (nonNull.length === 0) return 'empty';
  const allNum = nonNull.every((v) => typeof v === 'number' || !isNaN(Number(v)));
  if (allNum) return 'number';
  const allBool = nonNull.every((v) => typeof v === 'boolean');
  if (allBool) return 'boolean';
  return 'text';
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  number: <Hash size={13} className="text-blue-500" />,
  text: <Type size={13} className="text-emerald-500" />,
  boolean: <CheckSquare size={13} className="text-amber-500" />,
  empty: <HelpCircle size={13} className="text-slate-400" />,
};

export default function SheetStats({ sheet }: SheetStatsProps) {
  const stats = useMemo(() => {
    return sheet.headers.map((header, ci) => {
      const vals = sheet.rows.map((r) => r[ci] ?? null);
      const nonNull = vals.filter((v) => v !== null && v !== '');
      const nullCount = vals.length - nonNull.length;
      const type = inferType(vals);
      let min: string | null = null;
      let max: string | null = null;
      if (type === 'number' && nonNull.length > 0) {
        const nums = nonNull.map(Number);
        min = Math.min(...nums).toLocaleString();
        max = Math.max(...nums).toLocaleString();
      }
      const unique = new Set(nonNull.map(String)).size;
      return { header, type, nonNull: nonNull.length, nullCount, unique, min, max };
    });
  }, [sheet]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {stats.map((s, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-1"
        >
          <div className="flex items-center gap-1.5 truncate">
            {TYPE_ICON[s.type]}
            <span className="truncate text-xs font-semibold text-slate-700" title={s.header || `Col ${i + 1}`}>
              {s.header || `Col ${i + 1}`}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <BarChart2 size={11} />
            <span>{s.unique} unique</span>
          </div>
          {s.nullCount > 0 && (
            <span className="text-xs text-rose-400">{s.nullCount} empty</span>
          )}
          {s.type === 'number' && s.min !== null && (
            <span className="text-xs text-slate-500">{s.min} – {s.max}</span>
          )}
        </div>
      ))}
    </div>
  );
}

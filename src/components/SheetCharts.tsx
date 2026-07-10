import { useState, useMemo } from 'react';
import type { SheetData } from '../types/excel';
import { BarChart, LineChart as LineIcon, PieChart as PieIcon, HelpCircle } from 'lucide-react';

interface SheetChartsProps {
  sheet: SheetData;
}

type ChartType = 'bar' | 'line' | 'pie';

export default function SheetCharts({ sheet }: SheetChartsProps) {
  const [labelColIdx, setLabelColIdx] = useState<number>(0);
  const [valueColIdx, setValueColIdx] = useState<number>(1);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [limit, setLimit] = useState<number>(15);

  // Filter column choices
  const columns = useMemo(() => {
    return sheet.headers.map((name, idx) => ({
      idx,
      name: name || `Column ${idx + 1}`,
    }));
  }, [sheet.headers]);

  // Aggregate and extract data
  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();

    sheet.rows.forEach((row) => {
      const rawLabel = row[labelColIdx];
      const rawValue = row[valueColIdx];

      const label = rawLabel !== null && rawLabel !== undefined ? String(rawLabel).trim() : 'Blank';
      
      // Convert rawValue to float/number safely
      let value = 0;
      if (typeof rawValue === 'number') {
        value = rawValue;
      } else if (rawValue !== null && rawValue !== undefined) {
        const parsed = parseFloat(String(rawValue).replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) {
          value = parsed;
        }
      }

      dataMap.set(label, (dataMap.get(label) || 0) + value);
    });

    // Format and sort/limit top entries
    return Array.from(dataMap.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.label !== '' && !isNaN(item.value))
      .slice(0, limit);
  }, [sheet.rows, labelColIdx, valueColIdx, limit]);

  const maxVal = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    return vals.length > 0 ? Math.max(...vals, 1) : 1;
  }, [chartData]);

  const totalSum = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.value, 0);
  }, [chartData]);

  const renderSVGChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
          <HelpCircle size={32} className="mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No chartable data found</p>
          <p className="text-xs max-w-xs mt-1">Please select continuous columns containing text labels and numeric values respectively.</p>
        </div>
      );
    }

    const width = 800;
    const height = 400;
    const paddingLeft = 100;
    const paddingRight = 40;
    const paddingTop = 30;
    const paddingBottom = 50;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    if (chartType === 'bar') {
      const barPadding = 12;
      const barWidth = chartWidth / chartData.length - barPadding;

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const val = maxVal * ratio;
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[10px] font-medium fill-slate-400">
                  {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {/* Bar Rendering */}
          {chartData.map((d, idx) => {
            const x = paddingLeft + idx * (barWidth + barPadding) + barPadding / 2;
            const barHeight = (d.value / maxVal) * chartHeight;
            const y = paddingTop + chartHeight - barHeight;

            return (
              <g key={idx} className="group cursor-pointer">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx="4"
                  fill="url(#indigoGrad)"
                  className="transition-all hover:opacity-85"
                />
                
                {/* Value text above bar */}
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="text-[10px] font-bold fill-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>

                {/* X Axis Labels (Rotated for fit) */}
                <g transform={`translate(${x + barWidth / 2}, ${paddingTop + chartHeight + 15})`}>
                  <text
                    transform="rotate(-40)"
                    textAnchor="end"
                    className="text-[10px] font-semibold fill-slate-500 max-w-[80px]"
                  >
                    {d.label.length > 12 ? `${d.label.slice(0, 10)}…` : d.label}
                  </text>
                </g>
                
                {/* Tooltip detail tag */}
                <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
              </g>
            );
          })}

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    if (chartType === 'line') {
      const points = chartData.map((d, idx) => {
        const x = paddingLeft + (idx / (chartData.length - 1 || 1)) * chartWidth;
        const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
        return { x, y, ...d };
      });

      const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const val = maxVal * ratio;
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[10px] font-medium fill-slate-400">
                  {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {/* Line Path */}
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Markers / Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#ffffff"
                stroke="#4338ca"
                strokeWidth="3"
                className="transition-all hover:r-7 hover:fill-indigo-600"
              />
              {/* Value text above plot point */}
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-bold fill-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {p.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </text>
              {/* X Axis label */}
              <g transform={`translate(${p.x}, ${paddingTop + chartHeight + 15})`}>
                <text
                  transform="rotate(-40)"
                  textAnchor="end"
                  className="text-[10px] font-semibold fill-slate-500"
                >
                  {p.label.length > 12 ? `${p.label.slice(0, 10)}…` : p.label}
                </text>
              </g>
              <title>{`${p.label}: ${p.value.toLocaleString()}`}</title>
            </g>
          ))}
        </svg>
      );
    }

    if (chartType === 'pie') {
      const radius = Math.min(chartWidth, chartHeight) / 2 + 10;
      const centerX = paddingLeft + chartWidth / 2;
      const centerY = paddingTop + chartHeight / 2;

      // Color Palette
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b', '#06b6d4'];

      let currentAngle = -Math.PI / 2; // Start from top

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <g transform={`translate(${centerX}, ${centerY})`}>
            {chartData.map((d, idx) => {
              const sliceAngle = (d.value / (totalSum || 1)) * 2 * Math.PI;

              // Arc coordinates
              const x1 = radius * Math.cos(currentAngle);
              const y1 = radius * Math.sin(currentAngle);
              const x2 = radius * Math.cos(currentAngle + sliceAngle);
              const y2 = radius * Math.sin(currentAngle + sliceAngle);

              const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

              const pathData = `
                M 0 0
                L ${x1} ${y1}
                A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
              `;

              const color = colors[idx % colors.length];

              // Angle for text label placement
              const labelAngle = currentAngle + sliceAngle / 2;
              const lx = (radius * 0.7) * Math.cos(labelAngle);
              const ly = (radius * 0.7) * Math.sin(labelAngle);

              currentAngle += sliceAngle;

              return (
                <g key={idx} className="group cursor-pointer">
                  <path d={pathData} fill={color} className="transition-all hover:opacity-90" />
                  
                  {/* Local percentage callout overlay */}
                  {sliceAngle > 0.15 && (
                    <text x={lx} y={ly} textAnchor="middle" className="text-[10px] font-bold fill-white">
                      {((d.value / (totalSum || 1)) * 100).toFixed(0)}%
                    </text>
                  )}
                  <title>{`${d.label}: ${d.value.toLocaleString()} (${((d.value / (totalSum || 1)) * 100).toFixed(1)}%)`}</title>
                </g>
              );
            })}
          </g>

          {/* Right side map legends */}
          <g transform={`translate(${centerX + radius + 30}, ${paddingTop + 20})`}>
            {chartData.slice(0, 10).map((d, idx) => {
              const color = colors[idx % colors.length];
              const y = idx * 24;
              return (
                <g key={idx} transform={`translate(0, ${y})`}>
                  <rect width="14" height="14" fill={color} rx="3" />
                  <text x="22" y="11" className="text-xs font-semibold fill-slate-700">
                    {d.label.length > 18 ? `${d.label.slice(0, 15)}…` : d.label}{' '}
                    <span className="font-normal text-slate-400">({d.value.toLocaleString()})</span>
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Chart controls toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Label selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Labels Column (X-Axis)</label>
            <select
              value={labelColIdx}
              onChange={(e) => setLabelColIdx(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.idx} value={c.idx}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Value selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Values Column (Y-Axis)</label>
            <select
              value={valueColIdx}
              onChange={(e) => setValueColIdx(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.idx} value={c.idx}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chart count limit */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Show Top Rows</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
            >
              {[5, 10, 15, 20, 30].map((v) => (
                <option key={v} value={v}>
                  Top {v} entries
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart type toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm self-end">
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
              chartType === 'bar' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BarChart size={14} /> Bar
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
              chartType === 'line' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LineIcon size={14} /> Line
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
              chartType === 'pie' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PieIcon size={14} /> Pie
          </button>
        </div>
      </div>

      {/* Main SVG Render Area */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-400 font-medium">
          Plotting <strong>{chartData.length} entries</strong> of{' '}
          {sheet.headers[valueColIdx] || `Col ${valueColIdx + 1}`} grouped by{' '}
          {sheet.headers[labelColIdx] || `Col ${labelColIdx + 1}`}
        </p>
        {renderSVGChart()}
      </div>
    </div>
  );
}

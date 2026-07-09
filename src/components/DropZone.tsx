import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

const ACCEPTED = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  '.xlsx',
  '.xls',
  '.csv',
];

export default function DropZone({ onFileSelected, isLoading }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 transition-all duration-200 cursor-pointer
        ${dragging
          ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
          : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40'
        }`}
    >
      <input
        type="file"
        accept={ACCEPTED.join(',')}
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={handleChange}
        disabled={isLoading}
      />

      <div className={`flex h-20 w-20 items-center justify-center rounded-2xl shadow-md transition-colors
        ${dragging ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
        {isLoading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        ) : (
          <FileSpreadsheet size={36} />
        )}
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-slate-700">
          {isLoading ? 'Processing…' : 'Drop your Excel file here'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          or <span className="font-medium text-indigo-600">browse</span> to choose a file
        </p>
        <p className="mt-2 text-xs text-slate-400">.xlsx · .xls · .csv supported</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-xs text-slate-500 border border-slate-200">
        <Upload size={13} />
        <span>Files are processed locally — nothing is uploaded</span>
      </div>
    </div>
  );
}

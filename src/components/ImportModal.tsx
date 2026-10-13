import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Download, FileDown } from 'lucide-react';
import { parseFile, importRows, type ImportRow, type ImportResult } from '../lib/import';
import { downloadTemplate } from '../lib/import';

interface Props {
  onClose: () => void;
  onDone: () => void;
}

type Phase = 'select' | 'preview' | 'importing' | 'result';

export default function ImportModal({ onClose, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setError('No data rows found in the file.');
        return;
      }
      setRows(parsed);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.');
    }
  }, []);

  const handleImport = async () => {
    setPhase('importing');
    setProgress({ done: 0, total: rows.length });
    try {
      const res = await importRows(rows, (done, total) =>
        setProgress({ done, total })
      );
      setResult(res);
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setPhase('preview');
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate();
  };

  const reset = () => {
    setPhase('select');
    setRows([]);
    setError('');
    setResult(null);
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Upload size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Applications</h2>
              <p className="text-xs text-white/70">Upload an Excel or CSV file to bulk-import</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 animate-slide-up rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          {/* Phase: select */}
          {phase === 'select' && (
            <div className="space-y-4">
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition ${
                  dragOver
                    ? 'border-slate-400 bg-slate-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-slate-500 transition group-hover:bg-slate-300">
                  <Upload size={22} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Drop your file here or <span className="text-slate-800 underline">browse</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Excel (.xlsx, .xls) or CSV (.csv) files</p>
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <FileSpreadsheet size={14} /> तुमचा एक्सेल फॉर्मॅट
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-2 py-1 text-left font-semibold text-slate-700">अ.क्र.</th>
                        <th className="px-2 py-1 text-left font-semibold text-slate-700">आवक अर्ज क्र.</th>
                        <th className="px-2 py-1 text-left font-semibold text-slate-700">आवक अर्ज दिनांक</th>
                        <th className="px-2 py-1 text-left font-semibold text-slate-700">मालमत्ता धारकाचे नाव</th>
                        <th className="px-2 py-1 text-left font-semibold text-slate-700">अर्जाचा प्रकार</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <td className="px-2 py-1">1</td>
                        <td className="px-2 py-1">10459</td>
                        <td className="px-2 py-1">30-07-2026</td>
                        <td className="px-2 py-1">Rupesh Laxman Dhanawade</td>
                        <td className="px-2 py-1">नवीन नोंद</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                  <p><span className="font-medium text-slate-700">मालमत्ता धारकाचे नाव</span> — required (becomes applicant name)</p>
                  <p><span className="font-medium text-slate-700">आवक अर्ज क्र.</span> — becomes the application number</p>
                  <p><span className="font-medium text-slate-700">आवक अर्ज दिनांक</span> — becomes the received date (DD-MM-YYYY format supported)</p>
                  <p><span className="font-medium text-slate-700">अर्जाचा प्रकार</span> — becomes the subject (नवीन नोंद → New Registration, भाडेकरी → Bhadekari, वधगत दुरुस्ती → Wadhghat Durusti, छोटी दुरुस्ती → Minor Correction)</p>
                  <p className="text-slate-400">स्थिती, वार्ड, शेरा, मालमत्ता क्र, भाग क्र — these columns are also recognized if present</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-800"
                >
                  <FileDown size={13} /> Download a template
                </button>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-700">
                <strong>Upload limit:</strong> Up to 1,000 rows per file. Each file attachment (for individual applications) is limited to 50 MB. Imports process in batches of 100 rows.
              </div>
            </div>
          )}

          {/* Phase: preview */}
          {phase === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span className="flex-1 truncate text-sm font-medium text-slate-700">{fileName}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {rows.length} rows
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">#</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">Name</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">Status</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">Ward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r) => (
                      <tr key={r.rowNumber} className={`border-b border-slate-100 ${!r.applicant_name ? 'bg-rose-50' : ''}`}>
                        <td className="px-2 py-1.5 text-slate-400">{r.rowNumber}</td>
                        <td className="px-2 py-1.5 font-medium text-slate-700">{r.applicant_name || <span className="text-rose-500">— missing —</span>}</td>
                        <td className="px-2 py-1.5 text-slate-500">{r.status}</td>
                        <td className="px-2 py-1.5 text-slate-500">{r.ward ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && (
                  <p className="px-2 py-1.5 text-center text-[11px] text-slate-400">
                    Showing first 50 of {rows.length} rows
                  </p>
                )}
              </div>

              {rows.filter((r) => !r.applicant_name).length > 0 && (
                <p className="text-xs text-amber-600">
                  {rows.filter((r) => !r.applicant_name).length} row(s) will be skipped (missing both name and application number).
                </p>
              )}
            </div>
          )}

          {/* Phase: importing */}
          {phase === 'importing' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <Loader2 size={32} className="animate-spin text-slate-400" />
              <div className="w-full max-w-xs">
                <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                  <span>Importing…</span>
                  <span>{progress.done} / {progress.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-900 transition-all duration-300"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Phase: result */}
          {phase === 'result' && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-6">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${result.errors.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {result.errors.length > 0 ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{result.inserted} imported</p>
                  <p className="text-sm text-slate-500">
                    {result.skipped.length} skipped · {result.errors.length} failed · of {result.total} total
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-rose-700">Errors ({result.errors.length})</p>
                  {result.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-[11px] text-rose-600">
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="mt-1 text-[11px] text-rose-400">+{result.errors.length - 10} more…</p>
                  )}
                </div>
              )}

              {result.skipped.length > 0 && (
                <div className="max-h-24 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-amber-700">Skipped ({result.skipped.length})</p>
                  {result.skipped.slice(0, 5).map((s, i) => (
                    <p key={i} className="text-[11px] text-amber-600">
                      Row {s.row}: {s.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          {phase === 'result' ? (
            <>
              <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
                <Upload size={16} /> Import another
              </button>
              <button
                onClick={onDone}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:shadow-lg active:scale-[0.98]"
              >
                <CheckCircle2 size={16} /> Done
              </button>
            </>
          ) : phase === 'preview' ? (
            <>
              <button onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Back</button>
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:shadow-lg active:scale-[0.98]"
              >
                <Download size={16} /> Import {rows.filter((r) => r.applicant_name).length} applications
              </button>
            </>
          ) : (
            <>
              <span />
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

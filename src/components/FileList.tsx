import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
  Paperclip,
} from 'lucide-react';
import type { ApplicationFile } from '../lib/supabase';
import {
  uploadFile,
  deleteFile,
  fetchFiles,
  getFileUrl,
  formatFileSize,
  getFileIcon,
} from '../lib/storage';

interface Props {
  applicationId: string;
  onCountChange?: (count: number) => void;
}

export default function FileList({ applicationId, onCountChange }: Props) {
  const [files, setFiles] = useState<ApplicationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchFiles(applicationId);
    setFiles(data);
    setLoading(false);
    onCountChange?.(data.length);
  }, [applicationId, onCountChange]);

  if (loadedRef.current !== applicationId) {
    loadedRef.current = applicationId;
    refresh();
  }

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 50 * 1024 * 1024) {
          setError(`${file.name} exceeds 50 MB limit.`);
          continue;
        }
        await uploadFile(applicationId, file);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async (file: ApplicationFile) => {
    if (!confirm(`Delete "${file.file_name}"?`)) return;
    try {
      await deleteFile(file);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleDownload = (file: ApplicationFile) => {
    const url = getFileUrl(file.file_path);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    a.target = '_blank';
    a.click();
  };

  const renderFileIcon = (fileType: string | null) => {
    const kind = getFileIcon(fileType);
    const cls = 'h-4 w-4';
    if (kind === 'image') return <ImageIcon className={`${cls} text-violet-500`} />;
    if (kind === 'pdf') return <FileText className={`${cls} text-rose-500`} />;
    if (kind === 'sheet') return <FileSpreadsheet className={`${cls} text-emerald-500`} />;
    if (kind === 'doc') return <FileText className={`${cls} text-blue-500`} />;
    return <FileIcon className={`${cls} text-slate-400`} />;
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition ${
          dragOver
            ? 'border-slate-400 bg-slate-100'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={20} className="animate-spin text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Uploading…</p>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500 transition group-hover:bg-slate-300">
              <Upload size={18} />
            </div>
            <p className="text-xs font-medium text-slate-600">
              Drop files here or <span className="text-slate-800 underline">browse</span>
            </p>
            <p className="text-[10px] text-slate-400">PDF, images, documents · 50 MB max</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      {/* File list */}
      {loading ? (
        <div className="mt-3 flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-slate-300" />
        </div>
      ) : files.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <Paperclip size={11} /> {files.length} file{files.length !== 1 ? 's' : ''}
          </p>
          {files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300"
            >
              <span className="shrink-0">{renderFileIcon(file.file_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{file.file_name}</p>
                <p className="text-[10px] text-slate-400">{formatFileSize(file.file_size)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="Download"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

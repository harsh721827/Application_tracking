import { useState } from 'react';
import { MoreVertical, Pencil, ArrowRight, Clock, AlertCircle, Paperclip } from 'lucide-react';
import type { Application } from '../lib/supabase';
import { STAGE_MAP, NEXT_STAGE } from '../lib/stages';

interface Props {
  app: Application;
  fileCount?: number;
  onEdit: (app: Application) => void;
  onMove: (id: string, status: Application['status']) => void;
  onForward: (id: string) => void;
}

export default function ApplicationCard({ app, fileCount, onEdit, onMove, onForward }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stage = STAGE_MAP[app.status];
  const nextStage = NEXT_STAGE[app.status];

  const daysInStage = app.updated_at
    ? Math.floor((Date.now() - new Date(app.updated_at).getTime()) / 86400000)
    : 0;
  const isTerminal = app.status === 'sent_to_approval' || app.status === 'rejected';
  const isStale = daysInStage >= 30 && !isTerminal;
  const isWarning = daysInStage >= 7 && daysInStage < 30 && !isTerminal;

  return (
    <div
      onClick={() => onEdit(app)}
      className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b ${stage.gradient}`} />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {app.applicant_name}
          </p>
          {app.application_number && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
              {app.application_number}
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="shrink-0 rounded-md p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {(app.subject || app.ward) && (
        <div className="mt-2 flex flex-wrap gap-1 pl-2">
          {app.subject && (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {app.subject}
            </span>
          )}
          {app.ward && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              {app.ward}
            </span>
          )}
        </div>
      )}

      {app.notes && (
        <p className="mt-2 line-clamp-2 pl-2 text-[11px] leading-relaxed text-slate-400">
          {app.notes}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between pl-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />
          {stage.shortLabel}
          {fileCount != null && fileCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-slate-500" title={`${fileCount} attached file${fileCount !== 1 ? 's' : ''}`}>
              <Paperclip size={10} /> {fileCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-200" title={`Stuck for ${daysInStage} days`}>
              <AlertCircle size={9} /> {daysInStage}d
            </span>
          )}
          {isWarning && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-200" title={`In stage for ${daysInStage} days`}>
              <Clock size={9} /> {daysInStage}d
            </span>
          )}
          {app.received_date && (
            <span>{new Date(app.received_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {nextStage && (
        <button
          onClick={(e) => { e.stopPropagation(); onForward(app.id); }}
          className="mt-2 ml-2 flex w-[calc(100%-0.5rem)] items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-[0.98]"
          title={`Advance to ${STAGE_MAP[nextStage].label}`}
        >
          <ArrowRight size={12} /> {STAGE_MAP[nextStage].shortLabel}
        </button>
      )}

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
          <div className="absolute right-2 top-10 z-20 w-44 animate-scale-in rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(app); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil size={13} /> Edit
            </button>
            <div className="my-1 border-t border-slate-100" />
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Move to</p>
            <div className="max-h-48 overflow-y-auto">
              {Object.values(STAGE_MAP).map((s) => (
                <button
                  key={s.id}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(app.id, s.id); }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-slate-50 ${s.id === app.status ? 'font-semibold text-slate-800' : 'text-slate-600'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

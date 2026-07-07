import { MoreVertical, Pencil, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Application, ApplicationStatus } from '../lib/supabase';
import { STAGES, STAGE_MAP, NEXT_STAGE } from '../lib/stages';

interface Props {
  app: Application;
  onEdit: (app: Application) => void;
  onMove: (id: string, status: ApplicationStatus) => void;
  onForward: (id: string) => void;
}

export default function ApplicationCard({ app, onEdit, onMove, onForward }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const stage = STAGE_MAP[app.status];
  const nextStage = NEXT_STAGE[app.status];

  const daysInStage = app.updated_at
    ? Math.floor((Date.now() - new Date(app.updated_at).getTime()) / 86400000)
    : 0;
  const isStale = daysInStage >= 30 && app.status !== 'sent_to_approval' && app.status !== 'approved' && app.status !== 'rejected';
  const isWarning = daysInStage >= 7 && daysInStage < 30 && app.status !== 'sent_to_approval' && app.status !== 'approved' && app.status !== 'rejected';

  useEffect(() => {
    if (!menuOpen && !moveOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoveOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, moveOpen]);

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {app.applicant_name}
          </p>
          {app.subject && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
              {app.subject}
            </p>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  onEdit(app);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => {
                  setMoveOpen((v) => !v);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowRight size={14} /> Move to…
              </button>
            </div>
          )}
          {moveOpen && (
            <div className="absolute right-0 top-7 z-10 max-h-72 w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  disabled={s.id === app.status}
                  onClick={() => {
                    onMove(app.id, s.id);
                    setMoveOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {s.shortLabel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {app.ward && (
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
            {app.ward}
          </span>
        )}
        {app.application_number && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
            {app.application_number}
          </span>
        )}
        {app.subject && (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
            {app.subject}
          </span>
        )}
      </div>

      {app.notes && (
        <p className="mt-2 line-clamp-2 border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
          {app.notes}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />
          {stage.shortLabel}
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
          onClick={() => onForward(app.id)}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-slate-900"
        >
          <CheckCircle2 size={13} />
          Mark Done &rarr; {STAGE_MAP[nextStage].shortLabel}
        </button>
      )}
    </div>
  );
}

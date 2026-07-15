import { useState, useRef } from 'react';
import { Loader2, ArrowRight, Flag } from 'lucide-react';
import type { StatusHistoryEntry } from '../lib/supabase';
import { STAGE_MAP } from '../lib/stages';
import { fetchHistory, formatRelativeTime, formatDuration } from '../lib/history';

interface Props {
  applicationId: string;
  refreshKey?: number;
}

export default function StatusTimeline({ applicationId, refreshKey }: Props) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef<{ id: string; key: number } | null>(null);

  const load = async () => {
    const data = await fetchHistory(applicationId);
    setHistory(data);
    setLoading(false);
  };

  if (loadedRef.current?.id !== applicationId || loadedRef.current?.key !== refreshKey) {
    loadedRef.current = { id: applicationId, key: refreshKey ?? 0 };
    setLoading(true);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-slate-400">No history recorded yet.</p>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const fromStage = entry.from_status ? STAGE_MAP[entry.from_status] : null;
        const toStage = STAGE_MAP[entry.to_status];
        const isLast = i === history.length - 1;
        const isInitial = entry.from_status === null;

        const duration = !isLast
          ? formatDuration(entry.created_at, history[i + 1].created_at)
          : null;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isInitial ? 'bg-slate-200' : toStage.badge} ring-4 ring-white`}>
                {isInitial ? (
                  <Flag size={12} className="text-slate-500" />
                ) : (
                  <span className={`h-2 w-2 rounded-full ${toStage.dot}`} />
                )}
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-slate-200" style={{ minHeight: '24px' }} />
              )}
            </div>

            {/* Content */}
            <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
              <div className="flex items-center gap-1.5">
                {isInitial ? (
                  <p className="text-xs font-semibold text-slate-700">
                    Application created
                  </p>
                ) : (
                  <>
                    {fromStage && (
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${fromStage.badge}`}>
                        {fromStage.shortLabel}
                      </span>
                    )}
                    <ArrowRight size={11} className="shrink-0 text-slate-400" />
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${toStage.badge}`}>
                      {toStage.shortLabel}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                <span>{formatRelativeTime(entry.created_at)}</span>
                <span>·</span>
                <span>{new Date(entry.created_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                {duration && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-slate-500">{duration} in stage</span>
                  </>
                )}
              </div>
              {entry.remark && (
                <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
                  {entry.remark}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

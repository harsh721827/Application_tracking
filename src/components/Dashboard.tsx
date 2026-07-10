import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Tag,
  Layers,
  XCircle,
  Clock,
  FileText,
  Grid3x3,
  Timer,
  Send,
} from 'lucide-react';
import type { Application } from '../lib/supabase';
import { STAGES, WARDS } from '../lib/stages';

interface Props {
  apps: Application[];
  onCardClick?: (group: 'in_progress' | 'approved' | 'kayam' | 'total') => void;
}

const SUBJECT_DOTS: Record<string, string> = {
  'New Registration': 'bg-sky-500',
  Bhadekari: 'bg-violet-500',
  'Wadhghat Durusti': 'bg-amber-500',
  'Minor Correction': 'bg-teal-500',
};

const SUBJECT_COLORS: Record<string, string> = {
  'New Registration': 'from-sky-400 to-sky-500',
  Bhadekari: 'from-violet-400 to-violet-500',
  'Wadhghat Durusti': 'from-amber-400 to-amber-500',
  'Minor Correction': 'from-teal-400 to-teal-500',
};

const STROKE_COLORS: Record<string, string> = {
  'bg-slate-500': '#64748b',
  'bg-sky-500': '#0ea5e9',
  'bg-cyan-500': '#06b6d4',
  'bg-blue-500': '#3b82f6',
  'bg-amber-500': '#f59e0b',
  'bg-violet-500': '#8b5cf6',
  'bg-indigo-500': '#6366f1',
  'bg-emerald-500': '#10b981',
  'bg-rose-500': '#f43f5e',
};

export default function Dashboard({ apps, onCardClick }: Props) {
  const stats = useMemo(() => {
    const total = apps.length;
    const inProgress = apps.filter(
      (a) => a.status !== 'sent_to_approval' && a.status !== 'rejected'
    ).length;
    const approved = apps.filter((a) => a.status === 'sent_to_approval').length;
    const rejected = apps.filter((a) => a.status === 'rejected').length;

    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    const stageCounts = STAGES.map((stage) => ({
      stage,
      count: apps.filter((a) => a.status === stage.id).length,
    }));

    const wardMap: Record<string, number> = {};
    apps.forEach((a) => { if (a.ward) wardMap[a.ward] = (wardMap[a.ward] ?? 0) + 1; });
    const wardCounts = Object.entries(wardMap)
      .sort((a, b) => b[1] - a[1])
      .map(([ward, count]) => ({ ward, count }));

    const subjectMap: Record<string, number> = {};
    let unspecified = 0;
    apps.forEach((a) => {
      if (a.subject) subjectMap[a.subject] = (subjectMap[a.subject] ?? 0) + 1;
      else unspecified++;
    });
    const subjectCounts = Object.entries(subjectMap)
      .sort((a, b) => b[1] - a[1])
      .map(([subject, count]) => ({ subject, count }));

    const now = Date.now();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400000);
      const key = d.toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        count: apps.filter((a) => a.created_at?.slice(0, 10) === key).length,
      };
    });

    const bottleneck = stageCounts
      .filter((s) => s.stage.id !== 'sent_to_approval' && s.stage.id !== 'rejected')
      .sort((a, b) => b.count - a.count)[0];

    const processedApps = apps.filter(
      (a) => a.received_date && (a.status === 'sent_to_approval' || a.status === 'rejected')
    );
    const avgProcessingDays = processedApps.length > 0
      ? Math.round(processedApps.reduce((sum, a) => {
          const start = new Date(a.received_date!).getTime();
          const end = new Date(a.updated_at).getTime();
          return sum + Math.max(0, (end - start) / 86400000);
        }, 0) / processedApps.length)
      : 0;

    const activeWards = WARDS.filter((w) => apps.some((a) => a.ward === w));
    const heatmap = activeWards.map((w) => ({
      ward: w,
      stages: STAGES.map((s) => ({
        stage: s,
        count: apps.filter((a) => a.ward === w && a.status === s.id).length,
      })),
      total: apps.filter((a) => a.ward === w).length,
    }));
    const maxCell = Math.max(1, ...heatmap.flatMap((h) => h.stages.map((s) => s.count)));

    return {
      total, inProgress, approved, rejected,
      completionRate, rejectionRate,
      stageCounts, wardCounts, subjectCounts, unspecified,
      days, bottleneck, avgProcessingDays, heatmap, maxCell,
    };
  }, [apps]);

  const maxDayCount = Math.max(1, ...stats.days.map((d) => d.count));
  const maxStageCount = Math.max(1, ...stats.stageCounts.map((s) => s.count));
  const maxWardCount = Math.max(1, ...stats.wardCounts.map((w) => w.count));
  const maxSubjectCount = Math.max(1, ...stats.subjectCounts.map((s) => s.count), stats.unspecified);

  const buildDonutSegments = (counts: { count: number; color: string }[]) => {
    const total = counts.reduce((s, c) => s + c.count, 0);
    if (total === 0) return [];
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return counts.map(({ count, color }) => {
      const dash = (count / total) * circumference;
      const seg = { dash, offset, color };
      offset += dash;
      return seg;
    });
  };

  const stageDonutData = stats.stageCounts.map((s) => ({
    count: s.count,
    color: STROKE_COLORS[s.stage.dot] ?? '#94a3b8',
    stage: s.stage,
  }));
  const stageSegments = buildDonutSegments(stageDonutData);

  const subjectDonutData = stats.subjectCounts.map((s) => ({
    count: s.count,
    color: STROKE_COLORS[SUBJECT_DOTS[s.subject] ?? ''] ?? '#94a3b8',
    subject: s.subject,
  }));
  const subjectSegments = buildDonutSegments(subjectDonutData);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total" value={stats.total} icon={<FileText size={18} />} tone="from-slate-600 to-slate-800" onClick={onCardClick ? () => onCardClick('total') : undefined} />
        <KpiCard label="In Progress" value={stats.inProgress} icon={<Clock size={18} />} tone="from-amber-400 to-orange-500" onClick={onCardClick ? () => onCardClick('in_progress') : undefined} />
        <KpiCard label="Sent to Approval" value={stats.approved} icon={<Send size={18} />} tone="from-emerald-500 to-green-600" onClick={onCardClick ? () => onCardClick('approved') : undefined} />
        <KpiCard label="कायम" value={stats.rejected} icon={<XCircle size={18} />} tone="from-rose-500 to-red-600" onClick={onCardClick ? () => onCardClick('kayam') : undefined} />
        <KpiCard label="Completion" value={`${stats.completionRate}%`} icon={<TrendingUp size={18} />} tone="from-sky-500 to-blue-600" />
        <KpiCard label="Rejection" value={`${stats.rejectionRate}%`} icon={<XCircle size={18} />} tone="from-rose-400 to-pink-500" />
      </div>

      {/* Bottleneck banner */}
      {stats.bottleneck && stats.bottleneck.count > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 animate-slide-up">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Layers size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Bottleneck: {stats.bottleneck.stage.label}
            </p>
            <p className="text-xs text-amber-600">
              {stats.bottleneck.count} application{stats.bottleneck.count !== 1 ? 's' : ''} waiting at this stage
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Stage Distribution */}
        <Panel title="Stage Distribution" icon={<BarChart3 size={18} />} subtitle={`${stats.total} applications across ${STAGES.length} stages`}>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                {stageSegments.map((seg, i) => (
                  <circle key={i} cx="50" cy="50" r="40" fill="none"
                    stroke={seg.color} strokeWidth="16"
                    strokeDasharray={`${seg.dash} 251.2`}
                    strokeDashoffset={-seg.offset}
                    className="transition-all duration-700"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-800">{stats.total}</span>
                <span className="text-[10px] text-slate-400">total</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {stats.stageCounts.filter((s) => s.count > 0).map(({ stage, count }) => (
                <div key={stage.id} className="group flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{stage.shortLabel}</span>
                  <div className="flex w-20 items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${stage.dot} transition-all duration-700 ease-out`} style={{ width: `${(count / maxStageCount) * 100}%` }} />
                    </div>
                    <span className="w-4 text-right text-[11px] font-semibold text-slate-700">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Ward Distribution */}
        <Panel title="Ward Distribution" icon={<MapPin size={18} />} subtitle={`${stats.wardCounts.length} wards with applications`}>
          <div className="space-y-2">
            {stats.wardCounts.slice(0, 8).map(({ ward, count }) => (
              <div key={ward} className="group flex items-center gap-2">
                <span className="w-12 text-xs font-medium text-slate-600">{ward}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-700 transition-all duration-700 ease-out group-hover:from-slate-700 group-hover:to-slate-800" style={{ width: `${(count / maxWardCount) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-[11px] font-semibold text-slate-700">{count}</span>
              </div>
            ))}
            {stats.wardCounts.length === 0 && (
              <p className="text-sm text-slate-400">No ward data yet.</p>
            )}
          </div>
        </Panel>

        {/* Subject Distribution */}
        <Panel title="Subject Distribution" icon={<Tag size={18} />} subtitle={`${stats.subjectCounts.reduce((s, x) => s + x.count, 0)} specified · ${stats.unspecified} unspecified`}>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                {subjectSegments.map((seg, i) => (
                  <circle key={i} cx="50" cy="50" r="40" fill="none"
                    stroke={seg.color} strokeWidth="16"
                    strokeDasharray={`${seg.dash} 251.2`}
                    strokeDashoffset={-seg.offset}
                    className="transition-all duration-700"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-800">{stats.subjectCounts.reduce((s, x) => s + x.count, 0)}</span>
                <span className="text-[10px] text-slate-400">specified</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {stats.subjectCounts.map(({ subject, count }) => (
                <div key={subject} className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${SUBJECT_DOTS[subject] ?? 'bg-slate-400'}`} />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{subject}</span>
                  <div className="flex w-20 items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full bg-gradient-to-r ${SUBJECT_COLORS[subject] ?? 'from-slate-400 to-slate-500'} transition-all duration-700 ease-out`} style={{ width: `${(count / maxSubjectCount) * 100}%` }} />
                    </div>
                    <span className="w-4 text-right text-[11px] font-semibold text-slate-700">{count}</span>
                  </div>
                </div>
              ))}
              {stats.unspecified > 0 && (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-400">Unspecified</span>
                  <div className="flex w-20 items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-300 transition-all duration-700 ease-out" style={{ width: `${(stats.unspecified / maxSubjectCount) * 100}%` }} />
                    </div>
                    <span className="w-4 text-right text-[11px] font-semibold text-slate-500">{stats.unspecified}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* 7-Day Trend */}
        <Panel title="7-Day Activity Trend" icon={<TrendingUp size={18} />} subtitle="New applications created per day">
          <div className="flex items-end justify-between gap-2 pt-2">
            {stats.days.map((day, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">{day.count}</span>
                <div className="flex h-32 w-full items-end justify-center">
                  <div
                    className="w-full max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-slate-700 to-slate-500 transition-all duration-700 ease-out hover:from-slate-800 hover:to-slate-600"
                    style={{ height: `${(day.count / maxDayCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '2px', opacity: day.count > 0 ? 1 : 0.2 }}
                  />
                </div>
                <span className="text-[11px] text-slate-400">{day.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Heatmap */}
      {stats.heatmap.length > 0 && (
        <Panel title="Ward × Stage Heatmap" icon={<Grid3x3 size={18} />} subtitle="Application density across wards and workflow stages">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 text-left font-medium text-slate-500">Ward</th>
                  {STAGES.map((s) => (
                    <th key={s.id} className="px-1.5 py-2 text-center font-medium text-slate-500">
                      <span className="flex flex-col items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <span className="whitespace-nowrap text-[10px]">{s.shortLabel}</span>
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.heatmap.map((row) => (
                  <tr key={row.ward} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="py-1.5 pr-3 font-medium text-slate-700">{row.ward}</td>
                    {row.stages.map(({ stage, count }) => {
                      const intensity = count / stats.maxCell;
                      const bg = count === 0 ? 'bg-slate-50' : intensity > 0.66 ? 'bg-slate-700 text-white' : intensity > 0.33 ? 'bg-slate-400 text-white' : 'bg-slate-200 text-slate-700';
                      return (
                        <td key={stage.id} className="px-1 py-1 text-center">
                          <span className={`inline-flex h-7 w-9 items-center justify-center rounded-md text-[11px] font-semibold transition ${bg}`} title={`${row.ward} — ${stage.shortLabel}: ${count}`}>
                            {count > 0 ? count : ''}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-bold text-slate-800">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Avg processing time */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Timer size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Average Processing Time</p>
          <p className="text-xs text-slate-500">
            {stats.avgProcessingDays} day{stats.avgProcessingDays !== 1 ? 's' : ''} from received to terminal stage
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, tone, onClick }: {
  label: string; value: number | string; icon: React.ReactNode; tone: string; onClick?: () => void;
}) {
  const cls = 'group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:shadow-md hover:border-slate-300';
  const inner = (
    <>
      <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br ${tone} opacity-10 transition group-hover:opacity-20`} />
      <div className="relative">
        <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-sm`}>
          {icon}
        </div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
      </div>
    </>
  );
  if (onClick) return <button onClick={onClick} className={`${cls} text-left`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

function Panel({ title, icon, subtitle, children }: {
  title: string; icon: React.ReactNode; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

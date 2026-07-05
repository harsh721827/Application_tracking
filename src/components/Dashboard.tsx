import { useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  MapPin,
  Tag,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  FileText,
} from 'lucide-react';
import type { Application, ApplicationStatus } from '../lib/supabase';
import { STAGES, STAGE_MAP, WARDS, SUBJECTS, NEXT_STAGE } from '../lib/stages';

interface Props {
  apps: Application[];
  onCardClick?: (group: 'in_progress' | 'approved' | 'rejected' | 'total') => void;
  onStageClick?: (stage: ApplicationStatus) => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  'New Registration': 'from-sky-500 to-blue-600',
  'Bhadekari': 'from-amber-500 to-orange-500',
  'Wadhghat Durusti': 'from-emerald-500 to-green-600',
  'Minor Correction': 'from-violet-500 to-purple-600',
};

const SUBJECT_DOTS: Record<string, string> = {
  'New Registration': 'bg-sky-500',
  'Bhadekari': 'bg-amber-500',
  'Wadhghat Durusti': 'bg-emerald-500',
  'Minor Correction': 'bg-violet-500',
};

export default function Dashboard({ apps, onCardClick, onStageClick }: Props) {
  const stats = useMemo(() => {
    const total = apps.length;
    const inProgress = apps.filter(
      (a) => a.status !== 'sent_to_approval' && a.status !== 'rejected'
    ).length;
    const approved = apps.filter((a) => a.status === 'sent_to_approval').length;
    const rejected = apps.filter((a) => a.status === 'rejected').length;
    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    const stageCounts = STAGES.map((s) => ({
      stage: s,
      count: apps.filter((a) => a.status === s.id).length,
    }));

    const wardCounts = WARDS.map((w) => ({
      ward: w,
      count: apps.filter((a) => a.ward === w).length,
    })).filter((w) => w.count > 0);

    // Subject breakdown — count per canonical subject + unspecified
    const subjectCounts = SUBJECTS.map((s) => ({
      subject: s,
      count: apps.filter((a) => (a.subject ?? '').trim() === s).length,
    }));
    const unspecified = apps.filter(
      (a) => !a.subject || !SUBJECTS.includes(a.subject as any)
    ).length;

    // 7-day trend
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const count = apps.filter((a) => {
        if (!a.created_at) return false;
        const created = new Date(a.created_at);
        return created >= d && created < next;
      }).length;
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      });
    }

    const bottleneck = stageCounts
      .filter((s) => s.stage.id !== 'sent_to_approval' && s.stage.id !== 'rejected')
      .sort((a, b) => b.count - a.count)[0];

    return {
      total,
      inProgress,
      approved,
      rejected,
      completionRate,
      rejectionRate,
      stageCounts,
      wardCounts,
      subjectCounts,
      unspecified,
      days,
      bottleneck,
    };
  }, [apps]);

  const maxStageCount = Math.max(1, ...stats.stageCounts.map((s) => s.count));
  const maxWardCount = Math.max(1, ...stats.wardCounts.map((w) => w.count));
  const maxSubjectCount = Math.max(1, ...stats.subjectCounts.map((s) => s.count));
  const maxDayCount = Math.max(1, ...stats.days.map((d) => d.count));

  // Donut chart
  const donutSegments = useMemo(() => {
    const active = stats.stageCounts.filter((s) => s.count > 0);
    const total = active.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return [];
    let offset = 0;
    return active.map((s) => {
      const pct = s.count / total;
      const dash = pct * 251.2;
      const seg = { stage: s.stage, count: s.count, pct: Math.round(pct * 100), dash, offset };
      offset += dash;
      return seg;
    });
  }, [stats.stageCounts]);

  // Subject donut
  const subjectDonut = useMemo(() => {
    const active = stats.subjectCounts.filter((s) => s.count > 0);
    const items = active.map((s) => ({
      label: s.subject,
      count: s.count,
      color: SUBJECT_DOTS[s.subject] ?? 'bg-slate-400',
    }));
    if (stats.unspecified > 0) {
      items.push({ label: 'Unspecified', count: stats.unspecified, color: 'bg-slate-300' });
    }
    const total = items.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return { items: [], total: 0 };
    let offset = 0;
    const segs = items.map((s) => {
      const pct = s.count / total;
      const dash = pct * 251.2;
      const seg = { ...s, pct: Math.round(pct * 100), dash, offset };
      offset += dash;
      return seg;
    });
    return { items: segs, total };
  }, [stats.subjectCounts, stats.unspecified]);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total" value={stats.total} icon={<Layers size={18} />} tone="from-slate-700 to-slate-900" onClick={onCardClick ? () => onCardClick('total') : undefined} />
        <KpiCard label="In Progress" value={stats.inProgress} icon={<Clock size={18} />} tone="from-amber-500 to-orange-500" onClick={onCardClick ? () => onCardClick('in_progress') : undefined} />
        <KpiCard label="Approved" value={stats.approved} icon={<CheckCircle2 size={18} />} tone="from-emerald-500 to-green-600" onClick={onCardClick ? () => onCardClick('approved') : undefined} />
        <KpiCard label="Rejected" value={stats.rejected} icon={<XCircle size={18} />} tone="from-rose-500 to-red-600" onClick={onCardClick ? () => onCardClick('rejected') : undefined} />
        <KpiCard label="Completion" value={`${stats.completionRate}%`} icon={<TrendingUp size={18} />} tone="from-sky-500 to-blue-600" />
        <KpiCard label="Rejection" value={`${stats.rejectionRate}%`} icon={<XCircle size={18} />} tone="from-rose-400 to-pink-500" />
      </div>

      {/* Bottleneck alert */}
      {stats.bottleneck && stats.bottleneck.count > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <Clock size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-800">
              Bottleneck: {stats.bottleneck.stage.label}
            </p>
            <p className="text-xs text-amber-600">
              {stats.bottleneck.count} application{stats.bottleneck.count === 1 ? '' : 's'} stuck in this stage
              {NEXT_STAGE[stats.bottleneck.stage.id] && (
                <> — next step: {STAGE_MAP[NEXT_STAGE[stats.bottleneck.stage.id]!].shortLabel}</>
              )}
            </p>
          </div>
          <ArrowRight size={16} className="text-amber-400" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Stage Distribution */}
        <Panel title="Stage Distribution" icon={<BarChart3 size={18} />} subtitle={`${stats.total} applications across ${STAGES.length} stages`}>
          <div className="space-y-2.5">
            {stats.stageCounts.map(({ stage, count }) => (
              <button
                key={stage.id}
                onClick={onStageClick ? () => onStageClick(stage.id) : undefined}
                disabled={!onStageClick || count === 0}
                className="group block w-full text-left disabled:cursor-default"
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                    {stage.shortLabel}
                  </span>
                  <span className="font-semibold text-slate-700">{count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${stage.dot} transition-all duration-700 ease-out group-hover:opacity-80`}
                    style={{ width: `${(count / maxStageCount) * 100}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Status Donut */}
        <Panel title="Status Breakdown" icon={<PieChart size={18} />} subtitle="Proportion of active stages">
          {donutSegments.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No data to display</div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  {donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="10"
                      strokeDasharray={`${seg.dash} 251.2`}
                      strokeDashoffset={-seg.offset}
                      className={seg.stage.dot.replace('bg-', 'stroke-')}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
                  <span className="text-[11px] text-slate-400">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {donutSegments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${seg.stage.dot}`} />
                      {seg.stage.shortLabel}
                    </span>
                    <span className="font-semibold text-slate-700">{seg.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Ward Distribution */}
        <Panel title="Ward Distribution" icon={<MapPin size={18} />} subtitle={`${stats.wardCounts.length} wards with applications`}>
          {stats.wardCounts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">No ward data</div>
          ) : (
            <div className="space-y-2">
              {stats.wardCounts.map(({ ward, count }) => (
                <div key={ward} className="group flex items-center gap-3">
                  <span className="w-12 shrink-0 text-xs font-medium text-slate-500">{ward}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <div
                      className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-blue-500 to-sky-400 px-2 text-[10px] font-bold text-white transition-all duration-700 ease-out"
                      style={{ width: `${(count / maxWardCount) * 100}%` }}
                    >
                      {count > 0 && count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Subject Breakdown — proper with donut + bars + per-stage detail */}
        <Panel
          title="Subject Breakdown"
          icon={<Tag size={18} />}
          subtitle={`${stats.subjectCounts.reduce((s, x) => s + x.count, 0)} specified · ${stats.unspecified} unspecified`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Donut */}
            <div className="relative mx-auto h-40 w-40 shrink-0 sm:mx-0">
              {subjectDonut.total === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No data
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    {subjectDonut.items.map((seg, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        strokeWidth="10"
                        strokeDasharray={`${seg.dash} 251.2`}
                        strokeDashoffset={-seg.offset}
                        className={seg.color.replace('bg-', 'stroke-')}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">{subjectDonut.total}</span>
                    <span className="text-[10px] text-slate-400">Total</span>
                  </div>
                </>
              )}
            </div>

            {/* Bars + legend */}
            <div className="flex-1 space-y-2.5">
              {stats.subjectCounts.map(({ subject, count }) => (
                <div key={subject} className="group">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${SUBJECT_DOTS[subject]}`} />
                      {subject}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {count}
                      {subjectDonut.total > 0 && (
                        <span className="ml-1 text-slate-400">
                          ({Math.round((count / subjectDonut.total) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${SUBJECT_COLORS[subject]} transition-all duration-700 ease-out group-hover:opacity-80`}
                      style={{ width: `${(count / maxSubjectCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.unspecified > 0 && (
                <div className="group">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-slate-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                      Unspecified
                    </span>
                    <span className="font-semibold text-slate-400">
                      {stats.unspecified}
                      <span className="ml-1 text-slate-300">
                        ({Math.round((stats.unspecified / subjectDonut.total) * 100)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-300 transition-all duration-700 ease-out"
                      style={{ width: `${(stats.unspecified / maxSubjectCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* Subject × Stage cross-tab */}
      <Panel
        title="Subject by Stage"
        icon={<FileText size={18} />}
        subtitle="How each subject type is distributed across workflow stages"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 text-left font-medium text-slate-500">Subject</th>
                {STAGES.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-center font-medium text-slate-500">
                    <span className="flex flex-col items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <span className="whitespace-nowrap">{s.shortLabel}</span>
                    </span>
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-semibold text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map((subject) => {
                const rowTotal = apps.filter((a) => (a.subject ?? '').trim() === subject).length;
                return (
                  <tr key={subject} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${SUBJECT_DOTS[subject]}`} />
                        {subject}
                      </span>
                    </td>
                    {STAGES.map((s) => {
                      const count = apps.filter(
                        (a) => (a.subject ?? '').trim() === subject && a.status === s.id
                      ).length;
                      return (
                        <td key={s.id} className="px-2 py-2 text-center">
                          {count > 0 ? (
                            <span className="inline-flex min-w-[1.5rem] justify-center rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                              {count}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold text-slate-800">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                  style={{
                    height: `${(day.count / maxDayCount) * 100}%`,
                    minHeight: day.count > 0 ? '4px' : '2px',
                    opacity: day.count > 0 ? 1 : 0.2,
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-400">{day.label}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br ${tone} opacity-10 transition group-hover:opacity-20`} />
      <div className="relative">
        <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${tone} text-white shadow-sm`}>
          {icon}
        </div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md hover:border-slate-300"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      {inner}
    </div>
  );
}

function Panel({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
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

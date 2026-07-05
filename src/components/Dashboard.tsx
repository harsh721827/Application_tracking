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
} from 'lucide-react';
import type { Application } from '../lib/supabase';
import { STAGES, STAGE_MAP, WARDS, SUBJECTS, NEXT_STAGE } from '../lib/stages';

interface Props {
  apps: Application[];
}

export default function Dashboard({ apps }: Props) {
  const stats = useMemo(() => {
    const total = apps.length;
    const inProgress = apps.filter(
      (a) => a.status !== 'sent_to_approval' && a.status !== 'rejected'
    ).length;
    const approved = apps.filter((a) => a.status === 'sent_to_approval').length;
    const rejected = apps.filter((a) => a.status === 'rejected').length;
    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    // Stage distribution
    const stageCounts = STAGES.map((s) => ({
      stage: s,
      count: apps.filter((a) => a.status === s.id).length,
    }));

    // Ward distribution
    const wardCounts = WARDS.map((w) => ({
      ward: w,
      count: apps.filter((a) => a.ward === w).length,
    })).filter((w) => w.count > 0);

    // Subject distribution
    const subjectCounts = SUBJECTS.map((s) => ({
      subject: s,
      count: apps.filter((a) => a.subject === s).length,
    }));

    // Trend: last 7 days
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

    // Bottleneck: stage with most items stuck (excluding terminal)
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
      days,
      bottleneck,
    };
  }, [apps]);

  const maxStageCount = Math.max(1, ...stats.stageCounts.map((s) => s.count));
  const maxWardCount = Math.max(1, ...stats.wardCounts.map((w) => w.count));
  const maxSubjectCount = Math.max(1, ...stats.subjectCounts.map((s) => s.count));
  const maxDayCount = Math.max(1, ...stats.days.map((d) => d.count));

  // Donut chart calculations
  const donutSegments = useMemo(() => {
    const active = stats.stageCounts.filter((s) => s.count > 0);
    const total = active.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return [];
    let offset = 0;
    return active.map((s) => {
      const pct = s.count / total;
      const dash = pct * 251.2; // 2 * PI * 40
      const seg = {
        stage: s.stage,
        count: s.count,
        pct: Math.round(pct * 100),
        dash,
        offset,
      };
      offset += dash;
      return seg;
    });
  }, [stats.stageCounts]);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total"
          value={stats.total}
          icon={<Layers size={18} />}
          tone="from-slate-700 to-slate-900"
        />
        <KpiCard
          label="In Progress"
          value={stats.inProgress}
          icon={<Clock size={18} />}
          tone="from-amber-500 to-orange-500"
        />
        <KpiCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle2 size={18} />}
          tone="from-emerald-500 to-green-600"
        />
        <KpiCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle size={18} />}
          tone="from-rose-500 to-red-600"
        />
        <KpiCard
          label="Completion"
          value={`${stats.completionRate}%`}
          icon={<TrendingUp size={18} />}
          tone="from-sky-500 to-blue-600"
        />
        <KpiCard
          label="Rejection"
          value={`${stats.rejectionRate}%`}
          icon={<XCircle size={18} />}
          tone="from-rose-400 to-pink-500"
        />
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
                <>
                  {' '}— next step: {STAGE_MAP[NEXT_STAGE[stats.bottleneck.stage.id]!].shortLabel}
                </>
              )}
            </p>
          </div>
          <ArrowRight size={16} className="text-amber-400" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Stage Distribution - Horizontal Bars */}
        <Panel
          title="Stage Distribution"
          icon={<BarChart3 size={18} />}
          subtitle={`${stats.total} applications across ${STAGES.length} stages`}
        >
          <div className="space-y-2.5">
            {stats.stageCounts.map(({ stage, count }) => (
              <div key={stage.id} className="group">
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
              </div>
            ))}
          </div>
        </Panel>

        {/* Donut Chart - Status Breakdown */}
        <Panel
          title="Status Breakdown"
          icon={<PieChart size={18} />}
          subtitle="Proportion of active stages"
        >
          {donutSegments.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              No data to display
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                  />
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
                  <span className="text-2xl font-bold text-slate-800">
                    {stats.total}
                  </span>
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
                    <span className="font-semibold text-slate-700">
                      {seg.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Ward Distribution */}
        <Panel
          title="Ward Distribution"
          icon={<MapPin size={18} />}
          subtitle={`${stats.wardCounts.length} wards with applications`}
        >
          {stats.wardCounts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">
              No ward data
            </div>
          ) : (
            <div className="space-y-2">
              {stats.wardCounts.map(({ ward, count }) => (
                <div key={ward} className="group flex items-center gap-3">
                  <span className="w-12 shrink-0 text-xs font-medium text-slate-500">
                    {ward}
                  </span>
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

        {/* Subject Breakdown */}
        <Panel
          title="Subject Breakdown"
          icon={<Tag size={18} />}
          subtitle="Applications by subject type"
        >
          <div className="space-y-3">
            {stats.subjectCounts.map(({ subject, count }) => (
              <div key={subject} className="group">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{subject}</span>
                  <span className="font-semibold text-slate-700">{count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700 ease-out group-hover:opacity-80"
                    style={{ width: `${(count / maxSubjectCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 7-Day Trend */}
      <Panel
        title="7-Day Activity Trend"
        icon={<TrendingUp size={18} />}
        subtitle="New applications created per day"
      >
        <div className="flex items-end justify-between gap-2 pt-2">
          {stats.days.map((day, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                {day.count}
              </span>
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
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br ${tone} opacity-10 transition group-hover:opacity-20`} />
      <div className="relative">
        <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${tone} text-white shadow-sm`}>
          {icon}
        </div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
      </div>
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

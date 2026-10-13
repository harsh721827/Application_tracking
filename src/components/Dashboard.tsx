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
  Siren,
  Star,
  AlertTriangle,
  Filter,
  Zap,
} from 'lucide-react';
import type { Application } from '../lib/supabase';
import { STAGES, WARDS, STAGE_MAP } from '../lib/stages';

interface Props {
  apps: Application[];
  onCardClick?: (group: 'in_progress' | 'approved' | 'kayam' | 'total' | 'emergency' | 'important') => void;
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

const STAGE_HEX: Record<string, string> = {
  received: '#64748b',
  spot: '#0ea5e9',
  lipik_sign_pending: '#06b6d4',
  karadhikari_sign_pending: '#3b82f6',
  correction_pending: '#f59e0b',
  noteshit_lipik_sign_pending: '#8b5cf6',
  noteshit_karadhikari_sign_pending: '#6366f1',
  sent_to_approval: '#10b981',
  rejected: '#f43f5e',
};

const DAY_MS = 86400000;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
}

export default function Dashboard({ apps, onCardClick }: Props) {
  const stats = useMemo(() => {
    const total = apps.length;
    const inProgress = apps.filter(
      (a) => a.status !== 'sent_to_approval' && a.status !== 'rejected'
    ).length;
    const approved = apps.filter((a) => a.status === 'sent_to_approval').length;
    const rejected = apps.filter((a) => a.status === 'rejected').length;
    const emergency = apps.filter((a) => a.is_emergency).length;
    const important = apps.filter((a) => a.is_important).length;

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
    const days30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
        weekday: d.toLocaleDateString('en', { weekday: 'short' }),
        count: apps.filter((a) => a.created_at?.slice(0, 10) === key).length,
        isToday: i === 29,
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
          return sum + Math.max(0, (end - start) / DAY_MS);
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

    // Aging analysis: how many days each in-progress app has been stuck
    const agingBuckets = { fresh: 0, week: 0, month: 0, twoMonths: 0, critical: 0 };
    const stuckByStage: Record<string, { week: number; month: number; critical: number }> = {};
    STAGES.forEach((s) => { stuckByStage[s.id] = { week: 0, month: 0, critical: 0 }; });

    apps.forEach((a) => {
      if (a.status === 'sent_to_approval' || a.status === 'rejected') return;
      const d = daysSince(a.updated_at);
      if (d < 7) agingBuckets.fresh++;
      else if (d < 30) { agingBuckets.week++; stuckByStage[a.status].week++; }
      else if (d < 60) { agingBuckets.month++; stuckByStage[a.status].month++; }
      else { agingBuckets.twoMonths++; stuckByStage[a.status].critical++; }
      if (d >= 60) agingBuckets.critical++;
    });

    const stuckTotal = agingBuckets.week + agingBuckets.month + agingBuckets.twoMonths;

    // Top 5 longest-stuck applications
    const longestStuck = apps
      .filter((a) => a.status !== 'sent_to_approval' && a.status !== 'rejected')
      .map((a) => ({ app: a, days: daysSince(a.updated_at) }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    // Trend: last 7 days vs previous 7 days
    const last7 = days30.slice(23, 30).reduce((s, d) => s + d.count, 0);
    const prev7 = days30.slice(16, 23).reduce((s, d) => s + d.count, 0);
    const trendDelta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 > 0 ? 100 : 0;

    // Funnel: cumulative counts at each stage transition
    const funnelStages = STAGES.filter((s) => s.id !== 'rejected');
    const funnel = funnelStages.map((s) => {
      const reached = apps.filter((a) => {
        const idx = funnelStages.findIndex((fs) => fs.id === a.status);
        const sIdx = funnelStages.findIndex((fs) => fs.id === s.id);
        if (a.status === 'rejected') return false;
        return idx >= sIdx;
      }).length;
      return { stage: s, reached, pct: total > 0 ? Math.round((reached / total) * 100) : 0 };
    });

    // Emergency + Important breakdown by status
    const priorityByStage = STAGES.map((s) => ({
      stage: s,
      emergency: apps.filter((a) => a.status === s.id && a.is_emergency).length,
      important: apps.filter((a) => a.status === s.id && a.is_important).length,
      normal: apps.filter((a) => a.status === s.id && !a.is_emergency && !a.is_important).length,
    }));

    return {
      total, inProgress, approved, rejected, emergency, important,
      completionRate, rejectionRate,
      stageCounts, wardCounts, subjectCounts, unspecified,
      days30, bottleneck, avgProcessingDays, heatmap, maxCell,
      agingBuckets, stuckByStage, stuckTotal, longestStuck,
      trendDelta, last7, funnel, priorityByStage,
    };
  }, [apps]);

  const maxDayCount = Math.max(1, ...stats.days30.map((d) => d.count));
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

  const maxFunnel = Math.max(1, ...stats.funnel.map((f) => f.reached));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Total" value={stats.total} icon={<FileText size={18} />} tone="from-slate-600 to-slate-800" onClick={onCardClick ? () => onCardClick('total') : undefined} />
        <KpiCard label="In Progress" value={stats.inProgress} icon={<Clock size={18} />} tone="from-amber-400 to-orange-500" onClick={onCardClick ? () => onCardClick('in_progress') : undefined} />
        <KpiCard label="Sent to Approval" value={stats.approved} icon={<Send size={18} />} tone="from-emerald-500 to-green-600" onClick={onCardClick ? () => onCardClick('approved') : undefined} />
        <KpiCard label="कायम" value={stats.rejected} icon={<XCircle size={18} />} tone="from-rose-500 to-red-600" onClick={onCardClick ? () => onCardClick('kayam') : undefined} />
        <KpiCard label="Emergency" value={stats.emergency} icon={<Siren size={18} />} tone="from-red-500 to-rose-700" onClick={onCardClick ? () => onCardClick('emergency') : undefined} />
        <KpiCard label="Important" value={stats.important} icon={<Star size={18} />} tone="from-amber-500 to-orange-600" onClick={onCardClick ? () => onCardClick('important') : undefined} />
        <KpiCard label="Completion" value={`${stats.completionRate}%`} icon={<TrendingUp size={18} />} tone="from-sky-500 to-blue-600" />
        <KpiCard label="Rejection" value={`${stats.rejectionRate}%`} icon={<XCircle size={18} />} tone="from-rose-400 to-pink-500" />
      </div>

      {/* Alert Row: Bottleneck + Stuck + Trend */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {stats.bottleneck && stats.bottleneck.count > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 animate-slide-up">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 truncate">
                Bottleneck: {stats.bottleneck.stage.label}
              </p>
              <p className="text-xs text-amber-600">
                {stats.bottleneck.count} app{stats.bottleneck.count !== 1 ? 's' : ''} waiting
              </p>
            </div>
          </div>
        )}

        {stats.stuckTotal > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 animate-slide-up">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-800">
                {stats.stuckTotal} app{stats.stuckTotal !== 1 ? 's' : ''} stuck 7+ days
              </p>
              <p className="text-xs text-rose-600">
                {stats.agingBuckets.week} this month · {stats.agingBuckets.month + stats.agingBuckets.twoMonths} over a month
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3 animate-slide-up">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sky-800">
              {stats.last7} new in last 7 days
            </p>
            <p className="text-xs text-sky-600">
              {stats.trendDelta > 0 ? `+${stats.trendDelta}%` : `${stats.trendDelta}%`} vs previous week
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: Stage Donut + 30-Day Trend */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

        <Panel title="30-Day Activity Trend" icon={<TrendingUp size={18} />} subtitle="New applications created per day">
          <div className="flex items-end justify-between gap-[2px] pt-2">
            {stats.days30.map((day, i) => (
              <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
                <div className="absolute -top-8 z-10 hidden whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block">
                  {day.label}: {day.count}
                </div>
                <span className="text-[10px] font-semibold text-slate-700">{day.count > 0 ? day.count : ''}</span>
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className={`w-full rounded-t-sm transition-all duration-500 ease-out ${day.isToday ? 'bg-gradient-to-t from-slate-800 to-slate-600' : 'bg-gradient-to-t from-slate-700 to-slate-400 hover:from-slate-800 hover:to-slate-500'}`}
                    style={{ height: `${(day.count / maxDayCount) * 100}%`, minHeight: day.count > 0 ? '3px' : '1px', opacity: day.count > 0 ? 1 : 0.15 }}
                  />
                </div>
                {i % 5 === 0 && (
                  <span className="text-[9px] text-slate-400">{day.label}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
            <span className="text-slate-400">Peak: {maxDayCount}/day</span>
            <span className="text-slate-400">Avg: {Math.round(stats.last7 / 7 * 10) / 10}/day (last 7d)</span>
            <span className={`font-semibold ${stats.trendDelta > 0 ? 'text-emerald-600' : stats.trendDelta < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {stats.trendDelta > 0 ? `▲ +${stats.trendDelta}%` : stats.trendDelta < 0 ? `▼ ${stats.trendDelta}%` : '— 0%'} WoW
            </span>
          </div>
        </Panel>
      </div>

      {/* Row 2: Ward + Subject */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Ward Distribution" icon={<MapPin size={18} />} subtitle={`${stats.wardCounts.length} wards with applications`}>
          <div className="space-y-2">
            {stats.wardCounts.slice(0, 10).map(({ ward, count }) => (
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
      </div>

      {/* Row 3: Aging Analysis + Longest Stuck */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Aging Analysis" icon={<Timer size={18} />} subtitle="How long applications have been in their current stage">
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <AgingBucket label="Fresh" sub="< 7 days" count={stats.agingBuckets.fresh} color="bg-emerald-500" text="text-emerald-700" bg="bg-emerald-50 border-emerald-200" />
              <AgingBucket label="Stuck" sub="7-29 days" count={stats.agingBuckets.week} color="bg-amber-500" text="text-amber-700" bg="bg-amber-50 border-amber-200" />
              <AgingBucket label="Late" sub="30-59 days" count={stats.agingBuckets.month} color="bg-orange-500" text="text-orange-700" bg="bg-orange-50 border-orange-200" />
              <AgingBucket label="Critical" sub="60+ days" count={stats.agingBuckets.twoMonths} color="bg-rose-500" text="text-rose-700" bg="bg-rose-50 border-rose-200" />
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-medium text-slate-500">Stuck applications by stage</p>
              {STAGES.filter((s) => {
                const st = stats.stuckByStage[s.id];
                return st && (st.week + st.month + st.critical) > 0;
              }).map((s) => {
                const st = stats.stuckByStage[s.id];
                const total = st.week + st.month + st.critical;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{s.shortLabel}</span>
                    <div className="flex w-32 items-center gap-0.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-l-full bg-amber-400" style={{ width: `${(st.week / total) * 100}%` }} title={`${st.week} stuck 7-29 days`} />
                      <div className="h-2 flex-1 bg-orange-400" style={{ width: `${(st.month / total) * 100}%` }} title={`${st.month} stuck 30-59 days`} />
                      <div className="h-2 flex-1 overflow-hidden rounded-r-full bg-rose-500" style={{ width: `${(st.critical / total) * 100}%` }} title={`${st.critical} stuck 60+ days`} />
                    </div>
                    <span className="w-6 text-right text-[11px] font-semibold text-slate-700">{total}</span>
                  </div>
                );
              })}
              {stats.stuckTotal === 0 && (
                <p className="py-2 text-sm text-emerald-600">All applications are progressing on time.</p>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Longest Stuck Applications" icon={<AlertTriangle size={18} />} subtitle="Top 5 needing immediate attention">
          <div className="space-y-2">
            {stats.longestStuck.map(({ app, days }, i) => {
              const stage = STAGE_MAP[app.status];
              const severity = days >= 60 ? 'rose' : days >= 30 ? 'orange' : 'amber';
              return (
                <div key={app.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 transition hover:bg-slate-50">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${severity === 'rose' ? 'bg-rose-100 text-rose-700' : severity === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">{app.applicant_name}</p>
                    <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className={`h-1.5 w-1.5 rounded-full ${stage?.dot ?? 'bg-slate-400'}`} />
                      {stage?.shortLabel ?? app.status}
                      {app.application_number && <span>· #{app.application_number}</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${severity === 'rose' ? 'bg-rose-100 text-rose-700' : severity === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                    {days}d
                  </span>
                </div>
              );
            })}
            {stats.longestStuck.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No stuck applications.</p>
            )}
          </div>
        </Panel>
      </div>

      {/* Row 4: Workflow Funnel */}
      <Panel title="Workflow Funnel" icon={<Filter size={18} />} subtitle="How many applications have reached each stage">
        <div className="space-y-1.5">
          {stats.funnel.map((f, i) => {
            const prev = i > 0 ? stats.funnel[i - 1] : null;
            const dropOff = prev ? prev.reached - f.reached : 0;
            const dropPct = prev && prev.reached > 0 ? Math.round((dropOff / prev.reached) * 100) : 0;
            return (
              <div key={f.stage.id} className="group">
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs font-medium text-slate-600">{f.stage.shortLabel}</span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className="flex h-full items-center justify-end rounded-lg px-2 transition-all duration-700 ease-out"
                      style={{
                        width: `${(f.reached / maxFunnel) * 100}%`,
                        backgroundColor: STAGE_HEX[f.stage.id] ?? '#64748b',
                      }}
                    >
                      <span className="text-[11px] font-bold text-white drop-shadow">
                        {f.reached} · {f.pct}%
                      </span>
                    </div>
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] text-slate-400">
                    {prev && dropOff > 0 ? (
                      <span className="text-rose-500">-{dropOff} ({dropPct}%)</span>
                    ) : i === 0 ? (
                      <span className="text-slate-500">start</span>
                    ) : (
                      <span className="text-emerald-500">no loss</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Row 5: Heatmap */}
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

      {/* Bottom Row: Processing Time + Priority Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

        <Panel title="Priority Breakdown by Stage" icon={<Zap size={18} />} subtitle="Emergency & Important applications across workflow">
          <div className="space-y-1.5">
            {stats.priorityByStage
              .filter((p) => p.emergency + p.important + p.normal > 0)
              .map((p) => {
                const total = p.emergency + p.important + p.normal;
                return (
                  <div key={p.stage.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-slate-600">{p.stage.shortLabel}</span>
                    <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      {p.emergency > 0 && (
                        <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(p.emergency / total) * 100}%` }} title={`${p.emergency} emergency`} />
                      )}
                      {p.important > 0 && (
                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(p.important / total) * 100}%` }} title={`${p.important} important`} />
                      )}
                      <div className="h-full bg-slate-300 transition-all duration-500" style={{ width: `${(p.normal / total) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-[11px] font-semibold text-slate-700">{total}</span>
                  </div>
                );
              })}
            <div className="flex items-center gap-4 pt-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Emergency</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Important</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Normal</span>
            </div>
          </div>
        </Panel>
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

function AgingBucket({ label, sub, count, color, text, bg }: {
  label: string; sub: string; count: number; color: string; text: string; bg: string;
}) {
  return (
    <div className={`rounded-lg border ${bg} p-2.5 text-center`}>
      <div className={`mx-auto mb-1.5 flex h-2 w-2 items-center justify-center rounded-full ${color}`} />
      <p className={`text-lg font-bold ${text}`}>{count}</p>
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className="text-[9px] text-slate-400">{sub}</p>
    </div>
  );
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

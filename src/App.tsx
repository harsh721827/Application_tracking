import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Search, LayoutGrid, Loader2, Inbox, Download, FileSpreadsheet, BarChart3, KanbanSquare, Filter, X, ArrowDownUp } from 'lucide-react';
import {
  supabase,
  type Application,
  type ApplicationStatus,
} from './lib/supabase';
import { STAGES, STAGE_MAP, WARDS, NEXT_STAGE, SUBJECTS } from './lib/stages';

type SortMode = 'newest' | 'oldest' | 'name';
// export utilities are dynamically imported on click to keep the bundle small
import ApplicationCard from './components/ApplicationCard';
import ApplicationModal from './components/ApplicationModal';
import Dashboard from './components/Dashboard';

type View = 'board' | 'dashboard';

type StatusFilter =
  | { kind: 'group'; group: 'in_progress' | 'approved' | 'kayam' | 'total' }
  | { kind: 'stage'; stage: ApplicationStatus }
  | null;

export default function App() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ApplicationStatus>('received');
  const [exportOpen, setExportOpen] = useState(false);
  const [view, setView] = useState<View>('board');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (e) {
      setError(e.message);
    } else {
      setApps((data as Application[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'n') { e.preventDefault(); openNew('received'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const allTotal = apps.length;
  const allPending = apps.filter(
    (a) => a.status !== 'sent_to_approval' && a.status !== 'approved' && a.status !== 'rejected'
  ).length;
  const allApproved = apps.filter((a) => a.status === 'sent_to_approval' || a.status === 'approved').length;
  const allKayam = apps.filter((a) => a.status === 'rejected').length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = apps.filter((a) => {
      const matchesQuery =
        !q ||
        a.applicant_name.toLowerCase().includes(q) ||
        (a.application_number ?? '').toLowerCase().includes(q) ||
        (a.subject ?? '').toLowerCase().includes(q) ||
        (a.notes ?? '').toLowerCase().includes(q);
      const matchesWard = wardFilter === 'all' || a.ward === wardFilter;
      const matchesSubject = subjectFilter === 'all' ||
        (subjectFilter === 'none' ? !a.subject || a.subject === '' : a.subject === subjectFilter);
      const matchesStatus =
        !statusFilter ||
        (statusFilter.kind === 'group' &&
          (statusFilter.group === 'total' ||
            (statusFilter.group === 'in_progress' &&
              a.status !== 'sent_to_approval' &&
              a.status !== 'rejected') ||
            (statusFilter.group === 'approved' && (a.status === 'sent_to_approval' || a.status === 'approved')) ||
            (statusFilter.group === 'kayam' && a.status === 'rejected'))) ||
        (statusFilter.kind === 'stage' && a.status === statusFilter.stage);
      return matchesQuery && matchesWard && matchesSubject && matchesStatus;
    });
    const sorted = [...result];
    if (sortMode === 'newest') sorted.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    else if (sortMode === 'oldest') sorted.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    else if (sortMode === 'name') sorted.sort((a, b) => a.applicant_name.localeCompare(b.applicant_name));
    return sorted;
  }, [apps, query, wardFilter, subjectFilter, statusFilter, sortMode]);

  const byStatus = (status: ApplicationStatus) =>
    filtered.filter((a) => a.status === status);



  const openNew = (status: ApplicationStatus = 'received') => {
    setEditing(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const openEdit = (app: Application) => {
    setEditing(app);
    setModalOpen(true);
  };

  const move = async (id: string, status: ApplicationStatus) => {
    const { error: e } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id);
    if (e) {
      setError(e.message);
      return;
    }
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  const forward = async (id: string) => {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    const next = NEXT_STAGE[app.status];
    if (!next) return;
    await move(id, next);
  };

  const handleCardClick = (group: 'in_progress' | 'approved' | 'kayam' | 'total') => {
    setStatusFilter({ kind: 'group', group });
    setView('board');
  };

  const handleStageClick = (stage: ApplicationStatus) => {
    setStatusFilter({ kind: 'stage', stage });
    setView('board');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-slate-800">
                Application Tracking System
              </h1>
              <p className="text-xs text-slate-500">
                Track applications across 9 workflow stages
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setView('board')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${view === 'board' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <KanbanSquare size={15} /> Board
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${view === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BarChart3 size={15} /> Dashboard
              </button>
            </div>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search… (press /)"
                className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Wards</option>
              {WARDS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="none">No Subject</option>
            </select>
            <div className="relative">
              <ArrowDownUp size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((v) => !v)}
                disabled={apps.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-10 z-40 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      import('./lib/export').then((m) => m.exportToExcel(filtered));
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => {
                      import('./lib/export').then((m) => m.exportToCSV(filtered));
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download size={15} className="text-slate-500" />
                    CSV (.csv)
                  </button>
                  {filtered.length !== apps.length && (
                    <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
                      Exports {filtered.length} of {apps.length} (filtered)
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => openNew('received')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
            >
              <Plus size={16} /> New Application
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6">
        {view === 'board' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={allTotal} tone="bg-slate-800" onClick={() => handleCardClick('total')} />
            <StatCard label="In Progress" value={allPending} tone="bg-amber-500" onClick={() => handleCardClick('in_progress')} />
            <StatCard label="Sent to Approval" value={allApproved} tone="bg-emerald-500" onClick={() => handleCardClick('approved')} />
            <StatCard label="कायम" value={allKayam} tone="bg-rose-500" onClick={() => handleCardClick('kayam')} />
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="mx-auto mt-4 max-w-[1600px] px-4 sm:px-6">
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        </div>
      )}

      {/* Active status filter indicator */}
      {view === 'board' && statusFilter && (
        <div className="mx-auto mt-4 flex max-w-[1600px] items-center gap-2 px-4 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
            <Filter size={14} className="text-slate-400" />
            Filtered by:{' '}
            <span className="font-semibold text-slate-800">
              {statusFilter.kind === 'group'
                ? statusFilter.group === 'total'
                  ? 'All Applications'
                  : statusFilter.group === 'in_progress'
                    ? 'In Progress'
                    : statusFilter.group === 'approved'
                      ? 'Sent to Approval'
                      : 'कायम'
                : STAGE_MAP[statusFilter.stage].label}
            </span>
            <button
              onClick={() => setStatusFilter(null)}
              className="ml-1 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-[1600px] animate-fade-in px-4 py-5 sm:px-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : view === 'dashboard' ? (
          apps.length === 0 ? (
            <EmptyState onNew={() => openNew('received')} />
          ) : (
            <Dashboard
              apps={apps}
              onCardClick={handleCardClick}
              onStageClick={handleStageClick}
            />
          )
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => openNew('received')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {STAGES.map((stage) => {
              const items = byStatus(stage.id);
              const Icon = stage.icon;
              return (
                <div
                  key={stage.id}
                  className="flex max-h-[calc(100vh-220px)] animate-slide-up flex-col rounded-2xl border border-slate-200 bg-slate-100/60"
                >
                  <div
                    className={`flex items-center justify-between rounded-t-2xl border-b-2 ${stage.ring} bg-white px-3 py-2.5`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${stage.badge}`}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {stage.shortLabel}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                    {items.length === 0 ? (
                      <button
                        onClick={() => openNew(stage.id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-3 text-xs text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
                      >
                        <Plus size={13} /> Add here
                      </button>
                    ) : (
                      <>
                        {items.map((app) => (
                          <ApplicationCard
                            key={app.id}
                            app={app}
                            onEdit={openEdit}
                            onMove={move}
                            onForward={forward}
                          />
                        ))}
                        <button
                          onClick={() => openNew(stage.id)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
                        >
                          <Plus size={13} /> Add
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-6 pt-2 text-center text-xs text-slate-400 sm:px-6">
        Application Tracking System &middot; {apps.length} total records
      </footer>

      <ApplicationModal
        open={modalOpen}
        initial={editing}
        defaultStatus={defaultStatus}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md hover:border-slate-300"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone} text-white`}
      >
        <span className="text-base font-bold">{value}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-700">
          {value} {value === 1 ? 'app' : 'apps'}
        </p>
      </div>
    </button>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox size={26} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-700">
        No applications yet
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Start by adding your first application. It will appear on the board in
        the stage you choose.
      </p>
      <button
        onClick={onNew}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
      >
        <Plus size={16} /> New Application
      </button>
    </div>
  );
}

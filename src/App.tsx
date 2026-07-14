import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Search, LayoutGrid, Loader2, Inbox, Download, FileSpreadsheet, BarChart3, KanbanSquare, X, ArrowDownUp } from 'lucide-react';
import { supabase, type Application, type ApplicationStatus } from './lib/supabase';
import { STAGES, STAGE_MAP, WARDS, NEXT_STAGE, SUBJECTS } from './lib/stages';
import ApplicationCard from './components/ApplicationCard';
import ApplicationModal from './components/ApplicationModal';
import Dashboard from './components/Dashboard';

type View = 'board' | 'dashboard';
type SortMode = 'newest' | 'oldest' | 'name';
type StatusFilter =
  | { kind: 'group'; group: 'in_progress' | 'approved' | 'kayam' | 'total' }
  | { kind: 'stage'; stage: ApplicationStatus };

export default function App() {
  const [apps, setApps] = useState<Application[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('board');
  const [query, setQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [editApp, setEditApp] = useState<Application | undefined>();
  const [defaultStatus, setDefaultStatus] = useState<ApplicationStatus>('received');
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApps((data ?? []) as Application[]);
    setLoading(false);

    const { data: fileData } = await supabase
      .from('application_files')
      .select('application_id');
    if (fileData) {
      const counts: Record<string, number> = {};
      fileData.forEach((f: { application_id: string }) => {
        counts[f.application_id] = (counts[f.application_id] ?? 0) + 1;
      });
      setFileCounts(counts);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'n') { e.preventDefault(); openNew('received'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openNew = (status: ApplicationStatus) => {
    setEditApp(undefined);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const openEdit = (app: Application) => {
    setEditApp(app);
    setModalOpen(true);
  };

  const move = useCallback(async (id: string, status: ApplicationStatus) => {
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    await supabase.from('applications').update({ status }).eq('id', id);
  }, []);

  const forward = useCallback(async (id: string) => {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    const next = NEXT_STAGE[app.status];
    if (!next) return;
    await move(id, next);
  }, [apps, move]);

  const allTotal = apps.length;
  const allPending = apps.filter(
    (a) => a.status !== 'sent_to_approval' && a.status !== 'rejected'
  ).length;
  const allApproved = apps.filter((a) => a.status === 'sent_to_approval').length;
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
            (statusFilter.group === 'approved' && a.status === 'sent_to_approval') ||
            (statusFilter.group === 'kayam' && a.status === 'rejected'))) ||
        (statusFilter.kind === 'stage' && a.status === statusFilter.stage);
      return matchesQuery && matchesWard && matchesSubject && matchesStatus;
    });
    const sorted = [...result];
    if (sortMode === 'newest') sorted.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    else if (sortMode === 'oldest') sorted.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    else sorted.sort((a, b) => a.applicant_name.localeCompare(b.applicant_name));
    return sorted;
  }, [apps, query, wardFilter, subjectFilter, statusFilter, sortMode]);

  const handleCardClick = (group: 'in_progress' | 'approved' | 'kayam' | 'total') => {
    setStatusFilter((prev) =>
      prev?.kind === 'group' && prev.group === group ? null : { kind: 'group', group }
    );
    setView('board');
  };

  const hasActiveFilters = wardFilter !== 'all' || subjectFilter !== 'all' || query.trim() !== '';

  const clearFilters = () => {
    setWardFilter('all');
    setSubjectFilter('all');
    setQuery('');
    setStatusFilter(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
          <p className="text-sm font-medium text-slate-500">Loading applications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-md">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-800">Application Tracking System</h1>
              <p className="text-xs text-slate-500">Track applications across {STAGES.length} workflow stages</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                onClick={() => setView('board')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === 'board' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <KanbanSquare size={15} /> Board
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === 'dashboard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BarChart3 size={15} /> Dashboard
              </button>
            </div>

            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search… (press /)"
                className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`btn-ghost ${hasActiveFilters ? 'border-slate-400 bg-slate-50' : ''}`}
            >
              <ArrowDownUp size={15} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-slate-700" />}
            </button>

            <div className="relative">
              <ArrowDownUp size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>

            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((v) => !v)}
                disabled={apps.length === 0}
                className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} /> <span className="hidden sm:inline">Export</span>
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-11 z-40 w-48 animate-scale-in rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { import('./lib/export').then((m) => m.exportToExcel(filtered)); setExportOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600" /> Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => { import('./lib/export').then((m) => m.exportToCSV(filtered)); setExportOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download size={15} className="text-slate-500" /> CSV (.csv)
                  </button>
                  {filtered.length !== apps.length && (
                    <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
                      Exports {filtered.length} of {apps.length} (filtered)
                    </p>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => openNew('received')} className="btn-primary">
              <Plus size={16} /> <span className="hidden sm:inline">New Application</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="animate-slide-up border-t border-slate-100 bg-slate-50/80">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400">
                <option value="all">All Wards</option>
                {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400">
                <option value="all">All Subjects</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="none">No Subject</option>
              </select>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-700">
                  <X size={12} /> Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {view === 'board' && (
        <section className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={allTotal} tone="from-slate-700 to-slate-900" icon={<Inbox size={16} />} onClick={() => handleCardClick('total')} />
            <StatCard label="In Progress" value={allPending} tone="from-amber-500 to-orange-500" icon={<Loader2 size={16} />} onClick={() => handleCardClick('in_progress')} />
            <StatCard label="Sent to Approval" value={allApproved} tone="from-emerald-500 to-green-600" icon={<BarChart3 size={16} />} onClick={() => handleCardClick('approved')} />
            <StatCard label="कायम" value={allKayam} tone="from-rose-500 to-red-600" icon={<X size={16} />} onClick={() => handleCardClick('kayam')} />
          </div>
        </section>
      )}

      {statusFilter && (
        <div className="mx-auto max-w-[1600px] px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filtering by:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white">
              {statusFilter.kind === 'group'
                ? statusFilter.group === 'total'
                  ? 'All Applications'
                  : statusFilter.group === 'in_progress'
                    ? 'In Progress'
                    : statusFilter.group === 'approved'
                      ? 'Sent to Approval'
                      : 'कायम'
                : STAGE_MAP[statusFilter.stage]?.shortLabel}
              <button onClick={() => setStatusFilter(null)} className="ml-1 rounded-full hover:text-slate-300">
                <X size={12} />
              </button>
            </span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        {view === 'dashboard' ? (
          <Dashboard apps={filtered} onCardClick={handleCardClick} />
        ) : apps.length === 0 ? (
          <EmptyState onNew={() => openNew('received')} />
        ) : filtered.length === 0 ? (
          <NoResults onClear={clearFilters} />
        ) : (
          <div className="grid auto-cols-[280px] grid-flow-col gap-4 overflow-x-auto pb-6">
            {STAGES.map((stage) => {
              const items = filtered.filter((a) => a.status === stage.id);
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex max-h-[calc(100vh-220px)] animate-slide-up flex-col rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm">
                  <div className={`flex items-center justify-between rounded-t-2xl border-b-2 ${stage.ring} bg-white px-3 py-2.5`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${stage.badge}`}>
                        <Icon size={15} />
                      </span>
                      <p className="truncate text-sm font-semibold text-slate-800">{stage.shortLabel}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${stage.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                    {items.length === 0 ? (
                      <button
                        onClick={() => openNew(stage.id)}
                        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-6 text-xs text-slate-400 transition hover:border-slate-400 hover:bg-white hover:text-slate-600"
                      >
                        <Plus size={16} /> Add application
                      </button>
                    ) : (
                      <>
                        {items.map((app) => (
                          <ApplicationCard
                            key={app.id}
                            app={app}
                            fileCount={fileCounts[app.id]}
                            onEdit={openEdit}
                            onMove={move}
                            onForward={forward}
                          />
                        ))}
                        <button
                          onClick={() => openNew(stage.id)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 py-2 text-xs text-slate-400 transition hover:border-slate-300 hover:bg-white hover:text-slate-500"
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

      {modalOpen && (
        <ApplicationModal
          initial={editApp}
          defaultStatus={defaultStatus}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone, icon, onClick }: {
  label: string; value: number; tone: string; icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-sm`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${tone} opacity-5 transition group-hover:opacity-10`} />
    </button>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center animate-slide-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox size={28} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-700">No applications yet</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Start by adding your first application. It will appear on the board in the stage you choose.
      </p>
      <button onClick={onNew} className="btn-primary mt-5">
        <Plus size={16} /> New Application
      </button>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center animate-slide-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Search size={28} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-700">No matching applications</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Try adjusting your search or filters to find what you're looking for.
      </p>
      <button onClick={onClear} className="btn-ghost mt-5">
        Clear all filters
      </button>
    </div>
  );
}

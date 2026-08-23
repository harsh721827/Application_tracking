import { useState } from 'react';
import { X, Save, Trash2, Plus, Pencil, Calendar, Tag, MapPin, FileText, User, Paperclip, History, Clock, Siren, Star } from 'lucide-react';
import { supabase, type Application, type ApplicationInsert } from '../lib/supabase';
import { STAGES, STAGE_MAP, WARDS, SUBJECTS } from '../lib/stages';
import FileList from './FileList';
import StatusTimeline from './StatusTimeline';

interface Props {
  initial?: Application;
  defaultStatus?: Application['status'];
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'details' | 'files' | 'history';

export default function ApplicationModal({ initial, defaultStatus, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ApplicationInsert>({
    applicant_name: initial?.applicant_name ?? '',
    application_number: initial?.application_number ?? '',
    subject: initial?.subject ?? '',
    department: initial?.department ?? '',
    ward: initial?.ward ?? '',
    status: initial?.status ?? defaultStatus ?? 'received',
    notes: initial?.notes ?? '',
    is_emergency: initial?.is_emergency ?? false,
    emergency_note: initial?.emergency_note ?? '',
    is_important: initial?.is_important ?? false,
    important_note: initial?.important_note ?? '',
    received_date: initial?.received_date ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<string | undefined>(initial?.id);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const set = (k: keyof ApplicationInsert, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const currentStage = STAGE_MAP[form.status as Application['status']];

  const handleSave = async () => {
    if (!form.applicant_name.trim()) { setError('Applicant name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      application_number: form.application_number || null,
      subject: form.subject || null,
      department: form.department || null,
      ward: form.ward || null,
      notes: form.notes || null,
      is_emergency: form.is_emergency,
      emergency_note: form.emergency_note || null,
      is_important: form.is_important,
      important_note: form.important_note || null,
    };
    if (initial) {
      const { error: err } = await supabase.from('applications').update(payload).eq('id', initial.id);
      setSaving(false);
      if (err) { setError(err.message); return; }
      setHistoryRefreshKey((k) => k + 1);
    } else {
      const { data, error: err } = await supabase.from('applications').insert(payload).select().single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      setSavedId(data.id);
      setHistoryRefreshKey((k) => k + 1);
      onSaved();
      return;
    }
    onSaved();
  };

  const handleDelete = async () => {
    if (!initial) return;
    if (!confirm('Delete this application? This cannot be undone.')) return;
    await supabase.from('applications').delete().eq('id', initial.id);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className={`bg-gradient-to-br ${currentStage?.gradient ?? 'from-slate-700 to-slate-900'} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                {initial ? <Pencil size={18} className="text-white" /> : <Plus size={18} className="text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {initial ? 'Edit Application' : 'New Application'}
                </h2>
                <p className="text-xs text-white/70">
                  {initial ? 'Update details, files, and history' : 'Create a new application entry'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs (only for existing applications) */}
        {savedId && (
          <div className="flex border-b border-slate-200 bg-slate-50/50 px-6">
            {([
              { id: 'details' as const, label: 'Details', icon: Pencil },
              { id: 'files' as const, label: 'Files', icon: Paperclip },
              { id: 'history' as const, label: 'History', icon: History },
            ]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'border-slate-800 text-slate-800'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 animate-slide-up rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          {/* Details tab */}
          {(!savedId || activeTab === 'details') && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <User size={13} /> Applicant Name *
                </label>
                <input
                  value={form.applicant_name}
                  onChange={(e) => set('applicant_name', e.target.value)}
                  className="input"
                  placeholder="Full name"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <FileText size={13} /> Application Number
                  </label>
                  <input value={form.application_number ?? ''} onChange={(e) => set('application_number', e.target.value)} className="input" placeholder="Optional" />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Calendar size={13} /> Received Date
                  </label>
                  <input type="date" value={form.received_date ?? ''} onChange={(e) => set('received_date', e.target.value)} className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Tag size={13} /> Subject
                  </label>
                  <select value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} className="input">
                    <option value="">Select subject</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <MapPin size={13} /> Ward
                  </label>
                  <select value={form.ward ?? ''} onChange={(e) => set('ward', e.target.value)} className="input">
                    <option value="">Select ward</option>
                    {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Department</label>
                  <input value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} className="input" placeholder="Optional" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Status</label>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.shortLabel}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Notes</label>
                <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} className="input min-h-[60px] resize-none" placeholder="Optional notes…" />
              </div>

              {/* Important section */}
              <div className={`rounded-xl border p-3 transition ${form.is_important ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_important: !p.is_important }))}
                  className="flex w-full items-center gap-2"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${form.is_important ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Star size={15} />
                  </span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${form.is_important ? 'text-amber-700' : 'text-slate-600'}`}>Important — Needs to Be Done</p>
                    <p className="text-[11px] text-slate-400">Flag this application as important so it shows an alert on the board</p>
                  </div>
                  <span className={`relative h-5 w-9 rounded-full transition ${form.is_important ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${form.is_important ? 'left-4' : 'left-0.5'}`} />
                  </span>
                </button>
                {form.is_important && (
                  <div className="mt-3 animate-slide-up">
                    <label className="mb-1 block text-[11px] font-medium text-amber-600">Important Note</label>
                    <textarea
                      value={form.important_note ?? ''}
                      onChange={(e) => set('important_note', e.target.value)}
                      className="input min-h-[50px] resize-none border-amber-200 bg-white"
                      placeholder="Describe what needs to be done and why it's important…"
                    />
                  </div>
                )}
              </div>

              {/* Emergency section */}
              <div className={`rounded-xl border p-3 transition ${form.is_emergency ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_emergency: !p.is_emergency }))}
                  className="flex w-full items-center gap-2"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${form.is_emergency ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Siren size={15} />
                  </span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${form.is_emergency ? 'text-rose-700' : 'text-slate-600'}`}>Emergency Application</p>
                    <p className="text-[11px] text-slate-400">Mark this application as urgent for priority handling</p>
                  </div>
                  <span className={`relative h-5 w-9 rounded-full transition ${form.is_emergency ? 'bg-rose-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${form.is_emergency ? 'left-4' : 'left-0.5'}`} />
                  </span>
                </button>
                {form.is_emergency && (
                  <div className="mt-3 animate-slide-up">
                    <label className="mb-1 block text-[11px] font-medium text-rose-600">Emergency Reminder Note</label>
                    <textarea
                      value={form.emergency_note ?? ''}
                      onChange={(e) => set('emergency_note', e.target.value)}
                      className="input min-h-[50px] resize-none border-rose-200 bg-white"
                      placeholder="Describe the emergency reason for quick reference…"
                    />
                  </div>
                )}
              </div>

              {!savedId && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-400">
                  Save the application first to upload files and view history
                </div>
              )}
            </div>
          )}

          {/* Files tab */}
          {savedId && activeTab === 'files' && (
            <FileList applicationId={savedId} />
          )}

          {/* History tab */}
          {savedId && activeTab === 'history' && (
            <div>
              <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Clock size={13} /> Status transition timeline
              </div>
              <StatusTimeline applicationId={savedId} refreshKey={historyRefreshKey} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          {initial ? (
            <button onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
              <Trash2 size={16} /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:shadow-lg disabled:opacity-50 active:scale-[0.98]">
              <Save size={16} /> {saving ? 'Saving…' : initial ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

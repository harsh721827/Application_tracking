import { useState } from 'react';
import { X, Save, Trash2, Plus, Pencil } from 'lucide-react';
import { supabase, type Application, type ApplicationInsert } from '../lib/supabase';
import { STAGES, WARDS, SUBJECTS } from '../lib/stages';

interface Props {
  initial?: Application;
  defaultStatus?: Application['status'];
  onClose: () => void;
  onSaved: () => void;
}

export default function ApplicationModal({ initial, defaultStatus, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ApplicationInsert>({
    applicant_name: initial?.applicant_name ?? '',
    application_number: initial?.application_number ?? '',
    subject: initial?.subject ?? '',
    department: initial?.department ?? '',
    ward: initial?.ward ?? '',
    status: initial?.status ?? defaultStatus ?? 'received',
    notes: initial?.notes ?? '',
    received_date: initial?.received_date ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof ApplicationInsert, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

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
    };
    const { error: err } = initial
      ? await supabase.from('applications').update(payload).eq('id', initial.id)
      : await supabase.from('applications').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
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
      <div className="relative w-full max-w-lg animate-scale-in rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white">
              {initial ? <Pencil size={15} /> : <Plus size={15} />}
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              {initial ? 'Edit Application' : 'New Application'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Field label="Applicant Name *">
              <input
                value={form.applicant_name}
                onChange={(e) => set('applicant_name', e.target.value)}
                className="input"
                placeholder="Full name"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Application Number">
                <input value={form.application_number ?? ''} onChange={(e) => set('application_number', e.target.value)} className="input" placeholder="Optional" />
              </Field>
              <Field label="Received Date">
                <input type="date" value={form.received_date ?? ''} onChange={(e) => set('received_date', e.target.value)} className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Subject">
                <select value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} className="input">
                  <option value="">Select subject</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Ward">
                <select value={form.ward ?? ''} onChange={(e) => set('ward', e.target.value)} className="input">
                  <option value="">Select ward</option>
                  {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">
                <input value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} className="input" placeholder="Optional" />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.shortLabel}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} className="input min-h-[80px] resize-none" placeholder="Optional notes…" />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          {initial ? (
            <button onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
              <Trash2 size={16} /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:shadow-lg disabled:opacity-50">
              <Save size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

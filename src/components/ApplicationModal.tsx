import { useEffect, useState } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import {
  supabase,
  type Application,
  type ApplicationStatus,
  type ApplicationInsert,
} from '../lib/supabase';
import { STAGES } from '../lib/stages';

interface Props {
  open: boolean;
  initial: Application | null;
  defaultStatus: ApplicationStatus;
  onClose: () => void;
  onSaved: () => void;
}

const empty: ApplicationInsert = {
  applicant_name: '',
  application_number: '',
  subject: '',
  department: '',
  status: 'received',
  notes: '',
  received_date: new Date().toISOString().slice(0, 10),
};

export default function ApplicationModal({
  open,
  initial,
  defaultStatus,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<ApplicationInsert>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        applicant_name: initial.applicant_name,
        application_number: initial.application_number ?? '',
        subject: initial.subject ?? '',
        department: initial.department ?? '',
        status: initial.status,
        notes: initial.notes ?? '',
        received_date: initial.received_date ?? new Date().toISOString().slice(0, 10),
      });
    } else {
      setForm({ ...empty, status: defaultStatus });
    }
    setError(null);
  }, [open, initial, defaultStatus]);

  if (!open) return null;

  const update = (field: keyof ApplicationInsert, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.applicant_name.trim()) {
      setError('Applicant name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        const { error: e } = await supabase
          .from('applications')
          .update(form)
          .eq('id', initial.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from('applications')
          .insert(form);
        if (e) throw e;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    if (!confirm('Delete this application? This cannot be undone.')) return;
    setSaving(true);
    try {
      const { error: e } = await supabase
        .from('applications')
        .delete()
        .eq('id', initial.id);
      if (e) throw e;
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {initial ? 'Edit Application' : 'New Application'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          <Field label="Applicant Name" required>
            <input
              value={form.applicant_name}
              onChange={(e) => update('applicant_name', e.target.value)}
              className="input"
              placeholder="e.g. Rajesh Sharma"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Application No.">
              <input
                value={form.application_number ?? ''}
                onChange={(e) => update('application_number', e.target.value)}
                className="input"
                placeholder="e.g. APP-2026-001"
              />
            </Field>
            <Field label="Department">
              <input
                value={form.department ?? ''}
                onChange={(e) => update('department', e.target.value)}
                className="input"
                placeholder="e.g. Revenue"
              />
            </Field>
          </div>

          <Field label="Subject">
            <input
              value={form.subject ?? ''}
              onChange={(e) => update('subject', e.target.value)}
              className="input"
              placeholder="What is the application about?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="input"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Received Date">
              <input
                type="date"
                value={form.received_date ?? ''}
                onChange={(e) => update('received_date', e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Remarks, correction details, etc."
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          {initial ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

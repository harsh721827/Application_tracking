import { supabase } from './supabase';
import type { ApplicationInsert, ApplicationStatus } from './supabase';
import { STAGE_MAP, WARDS, SUBJECTS } from './stages';

export interface ImportRow {
  rowNumber: number;
  applicant_name: string;
  application_number: string | null;
  subject: string | null;
  ward: string | null;
  status: ApplicationStatus;
  department: string | null;
  received_date: string | null;
  notes: string | null;
  is_emergency: boolean;
  is_important: boolean;
}

export interface ImportResult {
  total: number;
  inserted: number;
  errors: { row: number; message: string }[];
  skipped: { row: number; message: string }[];
}

const HEADER_ALIASES: Record<string, string> = {
  'application number': 'application_number',
  'application no': 'application_number',
  'app no': 'application_number',
  'applicant name': 'applicant_name',
  'name': 'applicant_name',
  subject: 'subject',
  ward: 'ward',
  status: 'status',
  department: 'department',
  'received date': 'received_date',
  date: 'received_date',
  notes: 'notes',
  note: 'notes',
  emergency: 'is_emergency',
  important: 'is_important',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return v === 'yes' || v === 'true' || v === '1' || v === 'y';
  }
  return false;
}

function parseStatus(val: unknown): ApplicationStatus {
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    for (const stage of Object.values(STAGE_MAP)) {
      if (
        stage.label.toLowerCase() === v ||
        stage.shortLabel.toLowerCase() === v ||
        stage.id === v
      ) {
        return stage.id;
      }
    }
  }
  return 'received';
}

function validateWard(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const v = val.trim();
  if (!v) return null;
  const match = WARDS.find((w) => w.toLowerCase() === v.toLowerCase());
  return match ?? (v.startsWith('BMC') ? v : null);
}

function validateSubject(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const v = val.trim();
  if (!v) return null;
  const match = SUBJECTS.find((s) => s.toLowerCase() === v.toLowerCase());
  return match ?? v;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

export async function parseFile(file: File): Promise<ImportRow[]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('No sheet found in the file.');

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: true,
  });

  if (rawRows.length === 0) throw new Error('The file has no data rows.');

  const headers = Object.keys(rawRows[0]).map(normalizeHeader);

  return rawRows.map((raw, idx) => {
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const canonical = HEADER_ALIASES[h] ?? h;
      const originalKey = Object.keys(raw)[i];
      row[canonical] = raw[originalKey];
    });

    const name = String(row['applicant_name'] ?? '').trim();
    if (!name) {
      return {
        rowNumber: idx + 2,
        applicant_name: '',
        application_number: null,
        subject: null,
        ward: null,
        status: 'received' as ApplicationStatus,
        department: null,
        received_date: null,
        notes: null,
        is_emergency: false,
        is_important: false,
      };
    }

    return {
      rowNumber: idx + 2,
      applicant_name: name,
      application_number: String(row['application_number'] ?? '').trim() || null,
      subject: validateSubject(row['subject']),
      ward: validateWard(row['ward']),
      status: parseStatus(row['status']),
      department: String(row['department'] ?? '').trim() || null,
      received_date: parseDate(row['received_date']),
      notes: String(row['notes'] ?? '').trim() || null,
      is_emergency: parseBoolean(row['is_emergency']),
      is_important: parseBoolean(row['is_important']),
    };
  });
}

export async function importRows(
  rows: ImportRow[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const errors: { row: number; message: string }[] = [];
  const skipped: { row: number; message: string }[] = [];
  let inserted = 0;

  const valid = rows.filter((r) => r.applicant_name.trim());
  const invalid = rows.filter((r) => !r.applicant_name.trim());
  invalid.forEach((r) =>
    skipped.push({ row: r.rowNumber, message: 'Missing applicant name' })
  );

  const BATCH = 100;
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH);
    const payload: ApplicationInsert[] = batch.map((r) => ({
      applicant_name: r.applicant_name,
      application_number: r.application_number,
      subject: r.subject,
      ward: r.ward,
      status: r.status,
      department: r.department,
      received_date: r.received_date,
      notes: r.notes,
      is_emergency: r.is_emergency,
      emergency_note: null,
      is_important: r.is_important,
      important_note: null,
    }));

    const { error: err } = await supabase.from('applications').insert(payload);
    if (err) {
      batch.forEach((r) =>
        errors.push({ row: r.rowNumber, message: err.message })
      );
    } else {
      inserted += batch.length;
    }
    onProgress?.(Math.min(i + BATCH, valid.length), valid.length);
  }

  return {
    total: rows.length,
    inserted,
    errors,
    skipped,
  };
}

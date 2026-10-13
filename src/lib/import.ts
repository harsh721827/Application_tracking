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
  // Native column names
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

  // User's Excel format column names
  'sr.no': 'sr_no',
  'sr no': 'sr_no',
  'sno': 'sr_no',
  'wardno': 'ward',
  'ward no': 'ward',
  'ward no.': 'ward',
  'propno': 'prop_no',
  'prop no': 'prop_no',
  'prop no.': 'prop_no',
  'partno': 'part_no',
  'part no': 'part_no',
  'part no.': 'part_no',
  'app_inwordno': 'application_number',
  'app inword no': 'application_number',
  'app inword no.': 'application_number',
  'inwordno': 'application_number',
  'inworddate': 'received_date',
  'inword date': 'received_date',
  'nameofholder': 'applicant_name',
  'name of holder': 'applicant_name',
  'holder name': 'applicant_name',
  'spotdone': 'spot_done',
  'spot done': 'spot_done',
  'signpendclerk': 'sign_pend_clerk',
  'sign pend clerk': 'sign_pend_clerk',
  'signpendadmin': 'sign_pend_admin',
  'sign pend admin': 'sign_pend_admin',

  // Marathi column names
  'अ.क्र': 'sr_no',
  'अ.क्र.': 'sr_no',
  'वार्ड क्र': 'ward',
  'वार्ड क्र.': 'ward',
  'वार्डक्र': 'ward',
  'मालमत्ता क्र': 'prop_no',
  'मालमत्ता क्र.': 'prop_no',
  'मालमत्ताक्र': 'prop_no',
  'भाग क्र': 'part_no',
  'भाग क्र.': 'part_no',
  'भागक्र': 'part_no',
  'अर्ज क्र': 'application_number',
  'अर्ज क्र.': 'application_number',
  'अर्जक्र': 'application_number',
  'अर्ज नोंदविल्याची तारीख': 'received_date',
  'अर्ज नोंद करून झालेले दिवस': 'days_since',
  'अर्जाचा प्रकार': 'subject',
  'अर्जाची स्थिती': 'status',
  'शेरा': 'notes',

  // New Marathi Excel format (आवक format)
  'आवक अर्ज क्र.': 'application_number',
  'आवक अर्ज क्र': 'application_number',
  'आवक अर्ज दिनांक': 'received_date',
  'मालमत्ता धारकाचे नाव': 'applicant_name',
  'मालमत्ता धारकाचे नाव.': 'applicant_name',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return v === 'yes' || v === 'true' || v === '1' || v === 'y' || v === 'done' || v === 'pending' || v === 'होय';
  }
  return false;
}

const MARATHI_STATUS_MAP: Record<string, ApplicationStatus> = {
  'प्राप्त': 'received',
  'प्राप्त झालेला': 'received',
  'स्पॉट': 'spot',
  'स्पॉट पूर्ण': 'spot',
  'लिपिक स्वाक्षरी थांबवा': 'lipik_sign_pending',
  'लिपिक स्वाक्षरी प्रलंबित': 'lipik_sign_pending',
  'कारधारी स्वाक्षरी प्रलंबित': 'karadhikari_sign_pending',
  'कारधारी स्वाक्षरी थांबवा': 'karadhikari_sign_pending',
  'दुरुस्ती प्रलंबित': 'correction_pending',
  'नोटशीट लिपिक स्वाक्षरी प्रलंबित': 'noteshit_lipik_sign_pending',
  'नोटशीट कारधारी स्वाक्षरी प्रलंबित': 'noteshit_karadhikari_sign_pending',
  'मंजुरीसाठी पाठवले': 'sent_to_approval',
  'कायम': 'rejected',
};

function parseStatusFromFlags(
  statusVal: unknown,
  spotDone: unknown,
  signPendClerk: unknown,
  signPendAdmin: unknown,
): ApplicationStatus {
  // If explicit status column exists and matches a stage, use it
  if (typeof statusVal === 'string') {
    const v = statusVal.trim().toLowerCase();
    // Check Marathi status names first
    const marathiMatch = MARATHI_STATUS_MAP[statusVal.trim()];
    if (marathiMatch) return marathiMatch;

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

  // Derive status from the boolean flag columns
  if (parseBoolean(signPendAdmin)) return 'karadhikari_sign_pending';
  if (parseBoolean(signPendClerk)) return 'lipik_sign_pending';
  if (parseBoolean(spotDone)) return 'spot';
  return 'received';
}

function validateWard(val: unknown): string | null {
  if (val == null) return null;
  const v = String(val).trim();
  if (!v) return null;
  const match = WARDS.find((w) => w.toLowerCase() === v.toLowerCase());
  if (match) return match;
  // Accept raw ward numbers (e.g. "5" → "BMC5")
  const num = parseInt(v, 10);
  if (!isNaN(num) && num >= 1 && num <= 15) return `BMC${num}`;
  return v.startsWith('BMC') ? v : null;
}

const MARATHI_SUBJECT_MAP: Record<string, string> = {
  'नवीन नोंद': 'New Registration',
  'नवीन नोंदणी': 'New Registration',
  'भाडेकरी': 'Bhadekari',
  'वधगत दुरुस्ती': 'Wadhghat Durusti',
  'छोटी दुरुस्ती': 'Minor Correction',
};

function validateSubject(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const v = val.trim();
  if (!v) return null;
  const marathiMatch = MARATHI_SUBJECT_MAP[v];
  if (marathiMatch) return marathiMatch;
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
    const v = val.trim();
    // DD-MM-YYYY format
    const ddmm = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmm) {
      const [, dd, mm, yyyy] = ddmm;
      const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    // DD/MM/YYYY format
    const ddsl = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddsl) {
      const [, dd, mm, yyyy] = ddsl;
      const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function buildNotes(
  baseNotes: unknown,
  propNo: unknown,
  partNo: unknown,
): string | null {
  const parts: string[] = [];
  const prop = String(propNo ?? '').trim();
  const part = String(partNo ?? '').trim();
  const notes = String(baseNotes ?? '').trim();
  if (prop) parts.push(`मालमत्ता क्र: ${prop}`);
  if (part) parts.push(`भाग क्र: ${part}`);
  if (notes) parts.push(notes);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export async function downloadTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const data = [
    {
      'अ.क्र.': 1,
      'आवक अर्ज क्र.': '10459',
      'आवक अर्ज दिनांक': '30-07-2026',
      'मालमत्ता धारकाचे नाव': 'Rupesh Laxman Dhanawade',
      'अर्जाचा प्रकार': 'नवीन नोंद',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Applications');
  XLSX.writeFile(wb, 'import-template.xlsx');
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

    // Use applicant_name if available, otherwise fall back to application_number as the name
    const name = String(row['applicant_name'] ?? '').trim();
    const appNum = String(row['application_number'] ?? '').trim() || null;

    if (!name && !appNum) {
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
      applicant_name: name || `अर्ज ${appNum}`,
      application_number: appNum,
      subject: validateSubject(row['subject']),
      ward: validateWard(row['ward']),
      status: parseStatusFromFlags(
        row['status'],
        row['spot_done'],
        row['sign_pend_clerk'],
        row['sign_pend_admin'],
      ),
      department: String(row['department'] ?? '').trim() || null,
      received_date: parseDate(row['received_date']),
      notes: buildNotes(row['notes'], row['prop_no'], row['part_no']),
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
    skipped.push({ row: r.rowNumber, message: 'Missing both name and application number' })
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

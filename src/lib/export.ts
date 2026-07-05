import type { Application } from './supabase';
import { STAGE_MAP } from './stages';

type Row = Record<string, string | number>;

function toRows(apps: Application[]): Row[] {
  return apps.map((a, i) => ({
    '#': i + 1,
    'Applicant Name': a.applicant_name,
    'Application No': a.application_number ?? '',
    'Subject': a.subject ?? '',
    'Ward': a.ward ?? '',
    'Status': STAGE_MAP[a.status].label,
    'Received Date': a.received_date ?? '',
    'Notes': a.notes ?? '',
    'Created At': a.created_at ? new Date(a.created_at).toLocaleString() : '',
    'Updated At': a.updated_at ? new Date(a.updated_at).toLocaleString() : '',
  }));
}

const COLS = [
  { wch: 4 },
  { wch: 22 },
  { wch: 18 },
  { wch: 22 },
  { wch: 10 },
  { wch: 28 },
  { wch: 14 },
  { wch: 30 },
  { wch: 20 },
  { wch: 20 },
];

export async function exportToExcel(
  apps: Application[],
  filename = 'applications.xlsx'
) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(toRows(apps));
  ws['!cols'] = COLS;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Applications');
  XLSX.writeFile(wb, filename);
}

export async function exportToCSV(
  apps: Application[],
  filename = 'applications.csv'
) {
  const XLSX = await import('xlsx');
  const rows = toRows(apps).map((r) => ({
    ...r,
    Notes: String(r['Notes'] ?? '').replace(/\n/g, ' '),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import type { Application } from './supabase';
import { STAGE_MAP } from './stages';

export function exportToCSV(apps: Application[]) {
  const headers = [
    'Application Number', 'Applicant Name', 'Subject', 'Ward',
    'Status', 'Department', 'Received Date', 'Notes',
  ];
  const rows = apps.map((a) => [
    a.application_number ?? '',
    a.applicant_name,
    a.subject ?? '',
    a.ward ?? '',
    STAGE_MAP[a.status]?.label ?? a.status,
    a.department ?? '',
    a.received_date ?? '',
    (a.notes ?? '').replace(/\n/g, ' '),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  download(csv, 'applications.csv', 'text/csv');
}

export async function exportToExcel(apps: Application[]) {
  const XLSX = await import('xlsx');
  const data = apps.map((a) => ({
    'Application Number': a.application_number ?? '',
    'Applicant Name': a.applicant_name,
    Subject: a.subject ?? '',
    Ward: a.ward ?? '',
    Status: STAGE_MAP[a.status]?.label ?? a.status,
    Department: a.department ?? '',
    'Received Date': a.received_date ?? '',
    Notes: a.notes ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Applications');
  XLSX.writeFile(wb, 'applications.xlsx');
}

function download(content: string, filename: string, mime: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
}

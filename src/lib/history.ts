import { supabase, type StatusHistoryEntry } from './supabase';

export async function fetchHistory(applicationId: string): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('status_history')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []) as StatusHistoryEntry[];
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function formatDuration(fromDate: string, toDate: string): string {
  const diff = new Date(toDate).getTime() - new Date(fromDate).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

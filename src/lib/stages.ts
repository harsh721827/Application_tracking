import type { ApplicationStatus } from './supabase';
import {
  Inbox,
  Search,
  FileSignature,
  ShieldCheck,
  AlertTriangle,
  StickyNote,
  NotebookPen,
  Send,
  XCircle,
} from 'lucide-react';

export interface StageConfig {
  id: ApplicationStatus;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Inbox;
  accent: string; // tailwind text color
  badge: string; // tailwind bg color for badge
  ring: string; // tailwind border color for column header
  dot: string; // tailwind bg for status dot
}

export const STAGES: StageConfig[] = [
  {
    id: 'received',
    label: 'Application Received',
    shortLabel: 'Received',
    description: 'Newly submitted application',
    icon: Inbox,
    accent: 'text-slate-700',
    badge: 'bg-slate-100 text-slate-700',
    ring: 'border-slate-300',
    dot: 'bg-slate-500',
  },
  {
    id: 'spot',
    label: 'Application Spot',
    shortLabel: 'Spot',
    description: 'Application verified on spot',
    icon: Search,
    accent: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-700',
    ring: 'border-sky-300',
    dot: 'bg-sky-500',
  },
  {
    id: 'lipik_sign_pending',
    label: 'Lipik Sign Pending',
    shortLabel: 'Lipik Sign',
    description: 'Awaiting Lipik signature',
    icon: FileSignature,
    accent: 'text-cyan-700',
    badge: 'bg-cyan-100 text-cyan-700',
    ring: 'border-cyan-300',
    dot: 'bg-cyan-500',
  },
  {
    id: 'karadhikari_sign_pending',
    label: 'Karadhikari Sign Pending',
    shortLabel: 'Karadhikari Sign',
    description: 'Awaiting Karadhikari signature',
    icon: ShieldCheck,
    accent: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    ring: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  {
    id: 'correction_pending',
    label: 'Correction Pending',
    shortLabel: 'Correction',
    description: 'Needs correction before resubmission',
    icon: AlertTriangle,
    accent: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    ring: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  {
    id: 'noteshit_lipik_sign_pending',
    label: 'Noteshit Lipik Sign Pending',
    shortLabel: 'Noteshit Lipik',
    description: 'Noteshit awaiting Lipik signature',
    icon: StickyNote,
    accent: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
    ring: 'border-violet-300',
    dot: 'bg-violet-500',
  },
  {
    id: 'noteshit_karadhikari_sign_pending',
    label: 'Noteshit Karadhikari Sign Pending',
    shortLabel: 'Noteshit Karadhikari',
    description: 'Noteshit awaiting Karadhikari signature',
    icon: NotebookPen,
    accent: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700',
    ring: 'border-indigo-300',
    dot: 'bg-indigo-500',
  },
  {
    id: 'sent_to_approval',
    label: 'Sent to Approval',
    shortLabel: 'Sent to Approval',
    description: 'Forwarded for final approval',
    icon: Send,
    accent: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    ring: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    shortLabel: 'Rejected',
    description: 'Application rejected',
    icon: XCircle,
    accent: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-700',
    ring: 'border-rose-300',
    dot: 'bg-rose-500',
  },
];

export const STAGE_MAP: Record<ApplicationStatus, StageConfig> = STAGES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<ApplicationStatus, StageConfig>
);

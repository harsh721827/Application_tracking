import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ApplicationStatus =
  | 'received'
  | 'spot'
  | 'lipik_sign_pending'
  | 'karadhikari_sign_pending'
  | 'correction_pending'
  | 'noteshit_lipik_sign_pending'
  | 'noteshit_karadhikari_sign_pending'
  | 'sent_to_approval'
  | 'rejected';

export interface Application {
  id: string;
  applicant_name: string;
  application_number: string | null;
  subject: string | null;
  department: string | null;
  ward: string | null;
  status: ApplicationStatus;
  notes: string | null;
  received_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationFile {
  id: string;
  application_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
  created_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  remark: string | null;
  created_at: string;
}

export type ApplicationInsert = Omit<Application, 'id' | 'created_at' | 'updated_at'>;

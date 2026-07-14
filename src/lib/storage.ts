import { supabase, type ApplicationFile } from './supabase';

const BUCKET = 'application-files';

export async function uploadFile(
  applicationId: string,
  file: File
): Promise<ApplicationFile | null> {
  const ext = file.name.split('.').pop() ?? '';
  const uniqueName = `${applicationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error: dbError } = await supabase
    .from('application_files')
    .insert({
      application_id: applicationId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type || null,
    })
    .select()
    .single();

  if (dbError) throw new Error(dbError.message);
  return data as ApplicationFile;
}

export async function deleteFile(file: ApplicationFile): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([file.file_path]);
  if (storageError) throw new Error(storageError.message);

  const { error: dbError } = await supabase
    .from('application_files')
    .delete()
    .eq('id', file.id);
  if (dbError) throw new Error(dbError.message);
}

export async function fetchFiles(applicationId: string): Promise<ApplicationFile[]> {
  const { data, error } = await supabase
    .from('application_files')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as ApplicationFile[];
}

export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(fileType: string | null): string {
  if (!fileType) return 'file';
  if (fileType.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf') return 'pdf';
  if (fileType.includes('word') || fileType.includes('document')) return 'doc';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'sheet';
  return 'file';
}

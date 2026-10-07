import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

export async function uploadTenantLogo(tenantId: string, userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona una imagen válida.');
  if (file.size > 2 * 1024 * 1024) throw new Error('El logo no puede superar 2 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const object = ref(storage, `tenants/${tenantId}/branding/logo-${userId}.${extension}`);
  await uploadBytes(object, file, { contentType: file.type, cacheControl: 'public,max-age=3600' });
  return getDownloadURL(object);
}

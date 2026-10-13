import { auth } from '../firebase';

export const aiService = {
  async generateItemDescription(item: { name: string; category: string; brand: string; state: string }): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Debes iniciar sesión.');
    const apiBaseUrl = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
    const response = await fetch(`${apiBaseUrl}/v1/ai/item-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('No se pudo generar la descripción.');
    return (await response.json()).description;
  },
};

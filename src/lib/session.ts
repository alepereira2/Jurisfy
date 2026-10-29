import { cookies } from 'next/headers';
import { getUsuarioComPermissoes, UserSession } from './auth';

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('jurisfy_session');

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const jsonStr = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);

    if (!payload?.id) return null;

    // Obtém dados atualizados do banco (incluindo permissões em tempo real)
    return await getUsuarioComPermissoes(payload.id);
  } catch (error) {
    return null;
  }
}

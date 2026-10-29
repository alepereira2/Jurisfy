import { cookies, headers } from 'next/headers';
import { getUsuarioComPermissoes, UserSession } from './auth';

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    let sessionToken: string | undefined;

    // 1. Tenta recuperar do Cookie HTTP
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('jurisfy_session');
    if (sessionCookie?.value) {
      sessionToken = sessionCookie.value;
    }

    // 2. Se não houver cookie, tenta recuperar do Header Authorization ou x-jurisfy-token
    if (!sessionToken) {
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization') || headerStore.get('x-jurisfy-token');
      if (authHeader) {
        sessionToken = authHeader.replace(/^Bearer\s+/i, '');
      }
    }

    if (!sessionToken) {
      return null;
    }

    const jsonStr = Buffer.from(sessionToken, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);

    if (!payload?.id) return null;

    // Obtém dados atualizados do banco (incluindo permissões em tempo real)
    return await getUsuarioComPermissoes(payload.id);
  } catch (error) {
    return null;
  }
}

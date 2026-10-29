import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/session';
import { registrarLogAuditoria } from '@/lib/auth';

export async function POST() {
  const user = await getSessionUser();
  if (user) {
    await registrarLogAuditoria({
      usuarioId: user.id,
      usuarioEmail: user.email,
      acao: 'LOGIN',
      modulo: 'AUTENTICACAO',
      detalhes: { status: 'LOGOUT' },
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete('jurisfy_session');

  return NextResponse.json({ success: true, message: 'Sessão encerrada.' });
}

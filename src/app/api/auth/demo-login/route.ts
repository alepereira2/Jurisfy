import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getUsuarioComPermissoes, registrarLogAuditoria } from '@/lib/auth';
import { ensureDatabaseSeeded } from '@/lib/auto-seed';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    // Garante que o banco no /tmp da Vercel contenha os dados de demonstração
    await ensureDatabaseSeeded();

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ error: 'Usuário de demonstração não encontrado.' }, { status: 404 });
    }

    const userComPerms = await getUsuarioComPermissoes(usuario.id);
    if (!userComPerms) {
      return NextResponse.json({ error: 'Falha ao carregar permissões do usuário.' }, { status: 500 });
    }

    // Cria token de sessão segura
    const sessionPayload = {
      id: userComPerms.id,
      email: userComPerms.email,
      nome: userComPerms.nome,
      role: userComPerms.role,
      limiteValorAprovacao: userComPerms.limiteValorAprovacao,
      centroCustoId: userComPerms.centroCustoId,
      criadoEm: Date.now(),
    };

    const sessionString = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const cookieStore = await cookies();
    const isHttps = req.nextUrl.protocol === 'https:';

    cookieStore.set('jurisfy_session', sessionString, {
      httpOnly: false,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    await registrarLogAuditoria({
      usuarioId: userComPerms.id,
      usuarioEmail: userComPerms.email,
      acao: 'LOGIN',
      modulo: 'AUTENTICACAO',
      detalhes: { status: 'DEMO_LOGIN_1CLIQUE', role: userComPerms.role },
    });

    return NextResponse.json({
      success: true,
      user: userComPerms,
      token: sessionString,
      message: `Bem-vindo(a), ${userComPerms.nome}!`,
    });
  } catch (error: any) {
    console.error('Erro no demo login:', error);
    return NextResponse.json({ error: `Erro no login: ${error.message || 'Verifique o banco de dados.'}` }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { comparePassword, getUsuarioComPermissoes, registrarLogAuditoria } from '@/lib/auth';
import { ensureDatabaseSeeded } from '@/lib/auto-seed';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // Garante que o banco no /tmp da Vercel contenha os dados
    await ensureDatabaseSeeded();

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { error: 'Credenciais inválidas ou usuário inativo.' },
        { status: 401 }
      );
    }

    const senhaValida = await comparePassword(password, usuario.senhaHash);
    if (!senhaValida) {
      await registrarLogAuditoria({
        usuarioEmail: email,
        acao: 'LOGIN',
        modulo: 'AUTENTICACAO',
        detalhes: { status: 'FALHA', motivo: 'Senha incorreta' },
      });
      return NextResponse.json(
        { error: 'Credenciais inválidas ou usuário inativo.' },
        { status: 401 }
      );
    }

    const userComPerms = await getUsuarioComPermissoes(usuario.id);
    if (!userComPerms) {
      return NextResponse.json(
        { error: 'Falha ao carregar permissões do usuário.' },
        { status: 500 }
      );
    }

    // Cria token de sessão segura diretamente
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
    const isHttps = req.nextUrl.protocol === 'https:';
    const cookieStore = await cookies();

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
      detalhes: { status: 'SUCESSO_DIRETO', role: userComPerms.role },
    });

    return NextResponse.json({
      success: true,
      requires2FA: false,
      user: userComPerms,
      token: sessionString,
      message: `Bem-vindo(a), ${userComPerms.nome}!`,
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: `Erro interno no login: ${error.message || 'Verifique o banco.'}` },
      { status: 500 }
    );
  }
}

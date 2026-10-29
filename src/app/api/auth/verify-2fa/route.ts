import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validarOTP, getUsuarioComPermissoes, registrarLogAuditoria } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { usuarioId, codigoOtp } = await req.json();

    if (!usuarioId || !codigoOtp) {
      return NextResponse.json(
        { error: 'ID de usuário e código OTP de 6 dígitos são obrigatórios.' },
        { status: 400 }
      );
    }

    const valido = await validarOTP(usuarioId, codigoOtp);
    if (!valido) {
      await registrarLogAuditoria({
        usuarioId,
        acao: '2FA',
        modulo: 'AUTENTICACAO',
        detalhes: { status: 'FALHA_OTP', codigoTentado: codigoOtp },
      });
      return NextResponse.json(
        { error: 'Código 2FA inválido ou expirado. Verifique e tente novamente.' },
        { status: 401 }
      );
    }

    const usuario = await getUsuarioComPermissoes(usuarioId);
    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou inativo.' },
        { status: 404 }
      );
    }

    // Cria token de sessão segura
    const sessionPayload = {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      limiteValorAprovacao: usuario.limiteValorAprovacao,
      centroCustoId: usuario.centroCustoId,
      criadoEm: Date.now(),
    };

    const sessionString = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    // Define cookie de sessão HTTP-only
    const cookieStore = await cookies();
    cookieStore.set('jurisfy_session', sessionString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    await registrarLogAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'LOGIN',
      modulo: 'AUTENTICACAO',
      detalhes: { status: 'SUCESSO_2FA', role: usuario.role },
    });

    return NextResponse.json({
      success: true,
      user: usuario,
      message: 'Autenticação 2FA confirmada com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro na validação do 2FA:', error);
    return NextResponse.json(
      { error: 'Erro interno ao validar segundo fator.' },
      { status: 500 }
    );
  }
}

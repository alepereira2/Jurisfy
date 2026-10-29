import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, gerarOTP, registrarLogAuditoria } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

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

    // 2FA Obrigatório: Gera OTP numérico de 6 dígitos válido por 10 minutos
    const { codigo, expiracao } = await gerarOTP(usuario.id, 10);

    // Registra log da tentativa inicial de login e emissão de 2FA
    await registrarLogAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: '2FA',
      modulo: 'AUTENTICACAO',
      detalhes: { status: 'OTP_GERADO', expiracao: expiracao.toISOString() },
    });

    console.log(`[2FA JURISFY] Código OTP gerado para ${usuario.email}: >>> ${codigo} <<< (Expira em: ${expiracao.toLocaleTimeString()})`);

    return NextResponse.json({
      success: true,
      requires2FA: true,
      usuarioId: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      expiracao: expiracao.toISOString(),
      // Em modo de demonstração/desenvolvimento enviamos o código para conferência imediata
      otpDebug: codigo,
      message: `Código de verificação de 6 dígitos enviado para ${usuario.email}.`,
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar autenticação.' },
      { status: 500 }
    );
  }
}

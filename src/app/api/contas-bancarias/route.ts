import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { registrarLogAuditoria } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const contas = await prisma.contaBancaria.findMany({
      where: { ativo: true },
      orderBy: { nomeBanco: 'asc' },
    });

    return NextResponse.json({ contas });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao consultar contas bancárias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'MASTER') {
      return NextResponse.json({ error: 'Apenas usuários Master podem gerenciar contas bancárias.' }, { status: 403 });
    }

    const body = await req.json();
    const { acao, id, nomeBanco, agencia, conta, tipo, saldoInicial, fechamentoDataBloqueio } = body;

    // Ação: Fechamento mensal retroativo
    if (acao === 'FECHAMENTO_MENSAL') {
      if (!id || !fechamentoDataBloqueio) {
        return NextResponse.json({ error: 'ID da conta e data de bloqueio são obrigatórios.' }, { status: 400 });
      }

      const atualizado = await prisma.contaBancaria.update({
        where: { id },
        data: { fechamentoDataBloqueio: new Date(fechamentoDataBloqueio) },
      });

      await registrarLogAuditoria({
        usuarioId: user.id,
        usuarioEmail: user.email,
        acao: 'EDICAO',
        modulo: 'CONTAS',
        registroId: id,
        detalhes: { acao: 'FECHAMENTO_MENSAL', dataBloqueio: fechamentoDataBloqueio },
      });

      return NextResponse.json({
        success: true,
        conta: atualizado,
        message: `Fechamento contábil mensal aplicado até ${new Date(fechamentoDataBloqueio).toLocaleDateString('pt-BR')}.`,
      });
    }

    // Criação de nova conta
    if (!nomeBanco) {
      return NextResponse.json({ error: 'Nome do banco é obrigatório.' }, { status: 400 });
    }

    const novaConta = await prisma.contaBancaria.create({
      data: {
        nomeBanco,
        agencia,
        conta,
        tipo: tipo || 'CORRENTE',
        saldoInicial: parseFloat(saldoInicial) || 0,
        saldoAtual: parseFloat(saldoInicial) || 0,
      },
    });

    await registrarLogAuditoria({
      usuarioId: user.id,
      usuarioEmail: user.email,
      acao: 'CRIACAO',
      modulo: 'CONTAS',
      registroId: novaConta.id,
      detalhes: { nomeBanco, saldoInicial },
    });

    return NextResponse.json({ success: true, conta: novaConta, message: 'Conta cadastrada com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao processar conta bancária' }, { status: 500 });
  }
}

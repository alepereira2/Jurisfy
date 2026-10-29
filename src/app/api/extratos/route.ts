import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { parseOFX, parseCSVStatement } from '@/lib/ofx-parser';
import { registrarLogAuditoria } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const contaBancariaId = searchParams.get('contaBancariaId');
    const statusConciliado = searchParams.get('statusConciliado');

    const where: any = {};
    if (contaBancariaId && contaBancariaId !== 'TODAS') {
      where.contaBancariaId = contaBancariaId;
    }
    if (statusConciliado !== null && statusConciliado !== undefined && statusConciliado !== '') {
      where.statusConciliado = statusConciliado === 'true';
    }

    const extratos = await prisma.extratoBancario.findMany({
      where,
      include: {
        contaBancaria: true,
        conciliacao: {
          include: {
            lancamento: true,
          },
        },
      },
      orderBy: { dataTransacao: 'desc' },
    });

    return NextResponse.json({ extratos });
  } catch (error: any) {
    console.error('Erro ao consultar extratos:', error);
    return NextResponse.json({ error: 'Erro ao consultar extratos bancários' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const contaBancariaId = formData.get('contaBancariaId') as string | null;

    if (!file || !contaBancariaId) {
      return NextResponse.json(
        { error: 'Arquivo de extrato (.ofx ou .csv) e conta bancária são obrigatórios.' },
        { status: 400 }
      );
    }

    const conta = await prisma.contaBancaria.findUnique({
      where: { id: contaBancariaId },
    });
    if (!conta) {
      return NextResponse.json({ error: 'Conta bancária informada não existe.' }, { status: 404 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let transactions: any[] = [];
    let novoSaldo: number | undefined;

    if (fileName.endsWith('.ofx')) {
      const content = buffer.toString('latin1');
      const parsed = parseOFX(content);
      transactions = parsed.transactions;
      novoSaldo = parsed.balance;
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const content = buffer.toString('utf-8');
      transactions = parseCSVStatement(content);
    } else {
      return NextResponse.json(
        { error: 'Formato não suportado. Por favor, envie um arquivo .OFX ou .CSV.' },
        { status: 400 }
      );
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma transação válida identificada no arquivo de extrato.' },
        { status: 400 }
      );
    }

    let importadas = 0;
    let duplicadas = 0;

    for (const trn of transactions) {
      try {
        // Validação rigorosa de duplicidade via fitId único por conta
        const existente = await prisma.extratoBancario.findUnique({
          where: {
            contaBancariaId_fitId: {
              contaBancariaId,
              fitId: trn.fitId,
            },
          },
        });

        if (existente) {
          duplicadas++;
          continue;
        }

        await prisma.extratoBancario.create({
          data: {
            contaBancariaId,
            fitId: trn.fitId,
            dataTransacao: trn.date,
            descricao: trn.memo,
            valor: trn.amount,
            tipo: trn.type,
            numeroDocumento: trn.checkNumber || null,
            statusConciliado: false,
          },
        });

        importadas++;
      } catch (err) {
        console.warn('Erro ao inserir transação do extrato:', err);
      }
    }

    // Se houver saldo oficial informado pelo extrato OFX, atualiza o saldo bancário
    if (novoSaldo !== undefined && !isNaN(novoSaldo)) {
      await prisma.contaBancaria.update({
        where: { id: contaBancariaId },
        data: { saldoAtual: novoSaldo },
      });
    }

    await registrarLogAuditoria({
      usuarioId: user.id,
      usuarioEmail: user.email,
      acao: 'CRIACAO',
      modulo: 'CONCILIACAO',
      registroId: contaBancariaId,
      detalhes: {
        arquivo: file.name,
        totalTransacoes: transactions.length,
        importadas,
        duplicadasDescartadas: duplicadas,
      },
    });

    return NextResponse.json({
      success: true,
      importadas,
      duplicadas,
      total: transactions.length,
      saldoAtualizado: novoSaldo,
      message: `Extrato processado com sucesso! ${importadas} novas transações importadas (${duplicadas} duplicadas ignoradas).`,
    });
  } catch (error: any) {
    console.error('Erro ao processar extrato bancário:', error);
    return NextResponse.json({ error: 'Erro ao processar arquivo de extrato bancário.' }, { status: 500 });
  }
}

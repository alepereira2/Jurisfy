import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { verificarPermissao, registrarLogAuditoria } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const checagem = verificarPermissao(user, 'CONCILIACAO', 'ler');
    if (!checagem.permitido) {
      return NextResponse.json({ error: checagem.motivo || 'Sem permissão de acesso à conciliação' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const contaBancariaId = searchParams.get('contaBancariaId');

    const extratoWhere: any = { statusConciliado: false };
    if (contaBancariaId && contaBancariaId !== 'TODAS') {
      extratoWhere.contaBancariaId = contaBancariaId;
    }

    const extratosPendentes = await prisma.extratoBancario.findMany({
      where: extratoWhere,
      include: { contaBancaria: true },
      orderBy: { dataTransacao: 'desc' },
    });

    const lancamentoWhere: any = {
      status: { in: ['PENDENTE', 'PREVISTO', 'ATRASADO'] },
    };
    if (user.role !== 'MASTER' && user.centroCustoId) {
      lancamentoWhere.centroCustoId = user.centroCustoId;
    }

    const lancamentosPendentes = await prisma.lancamentoFinanceiro.findMany({
      where: lancamentoWhere,
      include: {
        categoria: true,
        centroCusto: true,
        clienteProcesso: true,
      },
      orderBy: { dataVencimento: 'asc' },
    });

    // Formata itens para a interface e busca sugestões automáticas
    const extratosFormatados = extratosPendentes.map((e) => ({
      id: e.id,
      fitId: e.fitId,
      data: e.dataTransacao.toISOString().split('T')[0],
      descricao: e.descricao,
      valor: e.valor,
      tipo: e.tipo as 'CREDIT' | 'DEBIT',
      conciliado: e.statusConciliado,
      contaNome: e.contaBancaria?.nomeBanco,
    }));

    const lancamentosFormatados = lancamentosPendentes.map((l) => ({
      id: l.id,
      titulo: l.titulo,
      clienteOuFornecedor: l.fornecedorOuCliente || l.clienteProcesso?.nomeCliente || 'Geral',
      centroCusto: l.centroCusto.nome,
      dataVencimento: l.dataVencimento.toISOString().split('T')[0],
      valor: l.valor,
      tipo: l.tipo as 'RECEBER' | 'PAGAR',
      conciliado: false,
    }));

    // Detecta pares sugeridos (mesmo valor e natureza compatível)
    const sugestoes: { extratoId: string; lancamentoId: string; confianca: 'ALTA' | 'MEDIA' }[] = [];
    for (const ext of extratosFormatados) {
      const valExtAbs = Math.abs(ext.valor);
      const match = lancamentosFormatados.find((lanc) => {
        const valLancAbs = Math.abs(lanc.valor);
        const mesmoValor = Math.abs(valExtAbs - valLancAbs) < 0.01;
        const mesmaDirecao =
          (ext.tipo === 'CREDIT' && lanc.tipo === 'RECEBER') ||
          (ext.tipo === 'DEBIT' && lanc.tipo === 'PAGAR');
        return mesmoValor && mesmaDirecao;
      });

      if (match) {
        sugestoes.push({
          extratoId: ext.id,
          lancamentoId: match.id,
          confianca: ext.data === match.dataVencimento ? 'ALTA' : 'MEDIA',
        });
      }
    }

    return NextResponse.json({
      extratos: extratosFormatados,
      lancamentos: lancamentosFormatados,
      sugestoes,
    });
  } catch (error: any) {
    console.error('Erro na consulta de conciliação:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados de conciliação' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const checagem = verificarPermissao(user, 'CONCILIACAO', 'escrever');
    if (!checagem.permitido) {
      return NextResponse.json({ error: checagem.motivo || 'Sem permissão para conciliar transações' }, { status: 403 });
    }

    const body = await req.json();
    const { acao, extratoId, lancamentoId, categoriaId, centroCustoId, clienteProcessoId, observacao } = body;

    // 1. Criação e Conciliação Rápida de Lançamento Avulso (Tarifas, Rendimentos, Despesas do Extrato)
    if (acao === 'AVULSO') {
      if (!extratoId || !categoriaId || !centroCustoId) {
        return NextResponse.json(
          { error: 'Extrato, categoria e centro de custo são obrigatórios para lançamento avulso.' },
          { status: 400 }
        );
      }

      const extrato = await prisma.extratoBancario.findUnique({
        where: { id: extratoId },
      });

      if (!extrato || extrato.statusConciliado) {
        return NextResponse.json({ error: 'Transação do extrato não encontrada ou já conciliada.' }, { status: 400 });
      }

      const tipoLancamento = extrato.tipo === 'CREDIT' ? 'RECEBER' : 'PAGAR';
      const valorAbs = Math.abs(extrato.valor);

      // Cria o lançamento financeiro já liquidado
      const novoLancamento = await prisma.lancamentoFinanceiro.create({
        data: {
          tipo: tipoLancamento,
          titulo: extrato.descricao,
          descricao: `Gerado automaticamente via conciliação bancária (FITID: ${extrato.fitId})`,
          valor: valorAbs,
          valorLiquido: valorAbs,
          dataCompetencia: extrato.dataTransacao,
          dataVencimento: extrato.dataTransacao,
          dataPagamento: extrato.dataTransacao,
          status: 'PAGO',
          contaBancariaId: extrato.contaBancariaId,
          categoriaId,
          centroCustoId,
          clienteProcessoId: clienteProcessoId || null,
          criadoPor: user.nome,
        },
      });

      // Cria o vínculo de conciliação
      const conciliacao = await prisma.conciliacao.create({
        data: {
          extratoId: extrato.id,
          lancamentoId: novoLancamento.id,
          conciliadoPor: user.nome,
          observacao: observacao || 'Lançamento e conciliação expressa gerada a partir do extrato.',
        },
      });

      // Marca o extrato como conciliado
      await prisma.extratoBancario.update({
        where: { id: extrato.id },
        data: { statusConciliado: true },
      });

      await registrarLogAuditoria({
        usuarioId: user.id,
        usuarioEmail: user.email,
        acao: 'CONCILIACAO',
        modulo: 'CONCILIACAO',
        registroId: conciliacao.id,
        detalhes: {
          tipo: 'LANCAMENTO_AVULSO',
          extratoId,
          lancamentoId: novoLancamento.id,
          valor: valorAbs,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Lançamento avulso criado e conciliado com sucesso!',
        conciliacao,
      });
    }

    // 2. Conciliação por Vínculo (Extrato <-> Lançamento Existente)
    if (!extratoId || !lancamentoId) {
      return NextResponse.json({ error: 'IDs do extrato e do lançamento são obrigatórios.' }, { status: 400 });
    }

    const extrato = await prisma.extratoBancario.findUnique({ where: { id: extratoId } });
    const lancamento = await prisma.lancamentoFinanceiro.findUnique({ where: { id: lancamentoId } });

    if (!extrato || extrato.statusConciliado) {
      return NextResponse.json({ error: 'Extrato não encontrado ou já conciliado.' }, { status: 400 });
    }
    if (!lancamento) {
      return NextResponse.json({ error: 'Lançamento financeiro não encontrado.' }, { status: 400 });
    }

    // Valida consistência de valores
    const valExtAbs = Math.abs(extrato.valor);
    const valLancAbs = Math.abs(lancamento.valor);
    if (Math.abs(valExtAbs - valLancAbs) > 0.01) {
      return NextResponse.json(
        { error: `Divergência de valores: Extrato (R$ ${valExtAbs.toFixed(2)}) != ERP (R$ ${valLancAbs.toFixed(2)}).` },
        { status: 400 }
      );
    }

    // Atualiza lançamento como liquidado se estiver pendente
    await prisma.lancamentoFinanceiro.update({
      where: { id: lancamentoId },
      data: {
        status: 'PAGO',
        dataPagamento: extrato.dataTransacao,
        contaBancariaId: extrato.contaBancariaId,
        valorLiquido: valLancAbs,
      },
    });

    // Marca extrato como conciliado
    await prisma.extratoBancario.update({
      where: { id: extratoId },
      data: { statusConciliado: true },
    });

    // Registra a conciliação
    const conciliacao = await prisma.conciliacao.create({
      data: {
        extratoId,
        lancamentoId,
        conciliadoPor: user.nome,
        observacao: observacao || 'Vínculo confirmado via Conciliação Bancária',
      },
    });

    await registrarLogAuditoria({
      usuarioId: user.id,
      usuarioEmail: user.email,
      acao: 'CONCILIACAO',
      modulo: 'CONCILIACAO',
      registroId: conciliacao.id,
      detalhes: { extratoId, lancamentoId, valor: valExtAbs },
    });

    return NextResponse.json({
      success: true,
      message: 'Conciliação efetivada com sucesso!',
      conciliacao,
    });
  } catch (error: any) {
    console.error('Erro ao efetivar conciliação:', error);
    return NextResponse.json({ error: 'Erro ao efetivar conciliação.' }, { status: 500 });
  }
}

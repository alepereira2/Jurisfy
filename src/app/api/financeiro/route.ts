import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { verificarPermissao, registrarLogAuditoria } from '@/lib/auth';
import { validarBloqueioRetroativo } from '@/lib/accounting-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo'); // PAGAR | RECEBER
    const status = searchParams.get('status');
    const centroCustoId = searchParams.get('centroCustoId');
    const categoriaId = searchParams.get('categoriaId');
    const clienteProcessoId = searchParams.get('clienteProcessoId');
    const busca = searchParams.get('busca');
    const ehReembolsavel = searchParams.get('ehReembolsavel');

    const modulo = tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';
    const checagem = verificarPermissao(user, modulo, 'ler');
    if (!checagem.permitido) {
      return NextResponse.json({ error: checagem.motivo || 'Acesso negado ao módulo financeiro' }, { status: 403 });
    }

    const where: any = {};

    if (tipo) {
      where.tipo = tipo;
    }

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    // Restrição por Centro de Custo do usuário (se não for MASTER)
    if (user.role !== 'MASTER' && user.centroCustoId) {
      where.centroCustoId = user.centroCustoId;
    } else if (centroCustoId && centroCustoId !== 'TODOS') {
      where.centroCustoId = centroCustoId;
    }

    if (categoriaId && categoriaId !== 'TODAS') {
      where.categoriaId = categoriaId;
    }

    if (clienteProcessoId && clienteProcessoId !== 'TODOS') {
      where.clienteProcessoId = clienteProcessoId;
    }

    if (ehReembolsavel === 'true') {
      where.ehReembolsavel = true;
    }

    if (busca) {
      where.OR = [
        { titulo: { contains: busca } },
        { fornecedorOuCliente: { contains: busca } },
        { numeroDocumento: { contains: busca } },
      ];
    }

    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where,
      include: {
        categoria: true,
        centroCusto: true,
        clienteProcesso: true,
        contaBancaria: true,
        rateios: {
          include: {
            centroCusto: true,
            categoria: true,
          },
        },
      },
      orderBy: { dataVencimento: 'desc' },
    });

    return NextResponse.json({ lancamentos });
  } catch (error: any) {
    console.error('Erro ao listar lançamentos:', error);
    return NextResponse.json({ error: 'Erro ao consultar lançamentos financeiros' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      tipo,
      titulo,
      descricao,
      valor,
      dataCompetencia,
      dataVencimento,
      dataPagamento,
      contaBancariaId,
      clienteProcessoId,
      categoriaId,
      centroCustoId,
      fornecedorOuCliente,
      numeroDocumento,
      ehReembolsavel = false,
      rateios = [],
    } = body;

    if (!tipo || !titulo || !valor || !dataCompetencia || !dataVencimento || !categoriaId || !centroCustoId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos (tipo, título, valor, datas, categoria, centro de custo).' },
        { status: 400 }
      );
    }

    const modulo = tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';

    // Validação de permissões e alçada monetária
    const valorNum = parseFloat(valor);
    const checagem = verificarPermissao(user, modulo, 'escrever', valorNum, centroCustoId);

    // Se o valor excede a alçada do usuário, coloca em aprovação
    let statusInicial = 'PENDENTE';
    if (dataPagamento) {
      statusInicial = 'PAGO';
    } else if (
      user.role !== 'MASTER' &&
      user.limiteValorAprovacao !== null &&
      user.limiteValorAprovacao !== undefined &&
      valorNum > user.limiteValorAprovacao
    ) {
      statusInicial = 'EM_APROVACAO';
    }

    // Se informou conta bancária e data de pagamento, valida bloqueio de fechamento mensal retroativo
    if (contaBancariaId && dataPagamento) {
      const bloqueio = await validarBloqueioRetroativo(contaBancariaId, new Date(dataPagamento));
      if (bloqueio.bloqueado) {
        return NextResponse.json({ error: bloqueio.mensagem }, { status: 400 });
      }
    }

    const novoLancamento = await prisma.lancamentoFinanceiro.create({
      data: {
        tipo,
        titulo,
        descricao,
        valor: valorNum,
        valorLiquido: valorNum,
        dataCompetencia: new Date(dataCompetencia),
        dataVencimento: new Date(dataVencimento),
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
        status: statusInicial,
        contaBancariaId: contaBancariaId || null,
        clienteProcessoId: clienteProcessoId || null,
        categoriaId,
        centroCustoId,
        fornecedorOuCliente,
        numeroDocumento,
        ehReembolsavel: Boolean(ehReembolsavel),
        criadoPor: user.nome,
        rateios: rateios.length > 0 ? {
          create: rateios.map((r: any) => ({
            centroCustoId: r.centroCustoId,
            categoriaId: r.categoriaId || categoriaId,
            percentual: parseFloat(r.percentual),
            valor: (valorNum * parseFloat(r.percentual)) / 100,
          })),
        } : undefined,
      },
      include: {
        categoria: true,
        centroCusto: true,
        clienteProcesso: true,
      },
    });

    await registrarLogAuditoria({
      usuarioId: user.id,
      usuarioEmail: user.email,
      acao: 'CRIACAO',
      modulo,
      registroId: novoLancamento.id,
      detalhes: {
        titulo: novoLancamento.titulo,
        valor: novoLancamento.valor,
        status: novoLancamento.status,
      },
    });

    return NextResponse.json({
      success: true,
      lancamento: novoLancamento,
      requerAprovacao: statusInicial === 'EM_APROVACAO',
      message: statusInicial === 'EM_APROVACAO'
        ? 'Lançamento registrado e enviado para Aprovação de Gestor (excede teto de alçada).'
        : 'Lançamento financeiro cadastrado com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro ao criar lançamento:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar lançamento financeiro.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      acao, // BAIXA | APROVAR | CANCELAR | ATUALIZAR
      dataPagamento,
      contaBancariaId,
      valorJuros = 0,
      valorMulta = 0,
      valorDesconto = 0,
      retencaoIss = 0,
      retencaoIrrf = 0,
      retencaoPisCofinsCsll = 0,
      reembolsado,
      ids = [], // Para baixa ou aprovação em lote
    } = body;

    // Tratamento de ação em lote
    if (ids.length > 0 && acao === 'BAIXA_LOTE') {
      const dtPgto = dataPagamento ? new Date(dataPagamento) : new Date();
      await prisma.lancamentoFinanceiro.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'PAGO',
          dataPagamento: dtPgto,
          contaBancariaId: contaBancariaId || undefined,
        },
      });

      await registrarLogAuditoria({
        usuarioId: user.id,
        usuarioEmail: user.email,
        acao: 'EDICAO',
        modulo: 'FINANCEIRO',
        detalhes: { acao: 'BAIXA_LOTE', totalItens: ids.length },
      });

      return NextResponse.json({ success: true, message: `${ids.length} lançamentos liquidados em lote com sucesso.` });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do lançamento é obrigatório.' }, { status: 400 });
    }

    const lancamento = await prisma.lancamentoFinanceiro.findUnique({
      where: { id },
    });

    if (!lancamento) {
      return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
    }

    const modulo = lancamento.tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';

    // Ação: Aprovação por Gestor / Master
    if (acao === 'APROVAR') {
      const permAprovar = verificarPermissao(user, modulo, 'aprovar', lancamento.valor, lancamento.centroCustoId);
      if (!permAprovar.permitido && user.role !== 'MASTER') {
        return NextResponse.json({ error: permAprovar.motivo || 'Você não possui permissão para aprovar este valor.' }, { status: 403 });
      }

      const atualizado = await prisma.lancamentoFinanceiro.update({
        where: { id },
        data: {
          status: 'PENDENTE',
          aprovadoPor: user.nome,
          aprovadoEm: new Date(),
        },
      });

      await registrarLogAuditoria({
        usuarioId: user.id,
        usuarioEmail: user.email,
        acao: 'APROVACAO',
        modulo,
        registroId: id,
        detalhes: { valor: lancamento.valor, titulo: lancamento.titulo },
      });

      return NextResponse.json({ success: true, lancamento: atualizado, message: 'Lançamento aprovado com sucesso!' });
    }

    // Ação: Baixa / Liquidação Individual
    if (acao === 'BAIXA') {
      const dtPgto = dataPagamento ? new Date(dataPagamento) : new Date();

      if (contaBancariaId) {
        const bloqueio = await validarBloqueioRetroativo(contaBancariaId, dtPgto);
        if (bloqueio.bloqueado) {
          return NextResponse.json({ error: bloqueio.mensagem }, { status: 400 });
        }
      }

      // Cálculo do valor líquido
      const vOriginal = lancamento.valor;
      const vJuros = parseFloat(valorJuros) || 0;
      const vMulta = parseFloat(valorMulta) || 0;
      const vDesconto = parseFloat(valorDesconto) || 0;
      const vIss = parseFloat(retencaoIss) || 0;
      const vIrrf = parseFloat(retencaoIrrf) || 0;
      const vPis = parseFloat(retencaoPisCofinsCsll) || 0;

      // Para pagar: valor líquido = original + juros + multa - desconto
      // Para receber: valor líquido = original + juros + multa - desconto - retenções tributárias na fonte
      const totalRetencoes = vIss + vIrrf + vPis;
      let valorLiquido = vOriginal + vJuros + vMulta - vDesconto;
      if (lancamento.tipo === 'RECEBER') {
        valorLiquido -= totalRetencoes;
      }

      const baixado = await prisma.lancamentoFinanceiro.update({
        where: { id },
        data: {
          status: 'PAGO',
          dataPagamento: dtPgto,
          contaBancariaId: contaBancariaId || lancamento.contaBancariaId,
          valorJuros: vJuros,
          valorMulta: vMulta,
          valorDesconto: vDesconto,
          retencaoIss: vIss,
          retencaoIrrf: vIrrf,
          retencaoPisCofinsCsll: vPis,
          valorLiquido,
        },
      });

      // Atualiza saldo da conta bancária se vinculada
      if (baixado.contaBancariaId) {
        const delta = baixado.tipo === 'RECEBER' ? valorLiquido : -valorLiquido;
        await prisma.contaBancaria.update({
          where: { id: baixado.contaBancariaId },
          data: { saldoAtual: { increment: delta } },
        });
      }

      await registrarLogAuditoria({
        usuarioId: user.id,
        usuarioEmail: user.email,
        acao: 'EDICAO',
        modulo,
        registroId: id,
        detalhes: { acao: 'BAIXA_LIQUIDACAO', valorLiquido, dtPgto: dtPgto.toISOString() },
      });

      return NextResponse.json({ success: true, lancamento: baixado, message: 'Baixa financeira realizada com sucesso!' });
    }

    // Ação: Cancelar
    if (acao === 'CANCELAR') {
      const cancelado = await prisma.lancamentoFinanceiro.update({
        where: { id },
        data: { status: 'CANCELADO' },
      });

      await registrarLogAuditoria({
        usuarioId: user.id,
        usuarioEmail: user.email,
        acao: 'EDICAO',
        modulo,
        registroId: id,
        detalhes: { acao: 'CANCELAMENTO' },
      });

      return NextResponse.json({ success: true, lancamento: cancelado, message: 'Lançamento cancelado.' });
    }

    // Ação: Marcar como Reembolsado
    if (reembolsado !== undefined) {
      const atualizado = await prisma.lancamentoFinanceiro.update({
        where: { id },
        data: { reembolsado: Boolean(reembolsado) },
      });
      return NextResponse.json({ success: true, lancamento: atualizado });
    }

    return NextResponse.json({ error: 'Ação não informada ou não suportada.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao atualizar lançamento:', error);
    return NextResponse.json({ error: 'Erro ao processar atualização financeira.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do lançamento é obrigatório.' }, { status: 400 });
    }

    const lancamento = await prisma.lancamentoFinanceiro.findUnique({ where: { id } });
    if (!lancamento) {
      return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
    }

    const modulo = lancamento.tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';
    const checagem = verificarPermissao(user, modulo, 'deletar');
    if (!checagem.permitido) {
      return NextResponse.json({ error: checagem.motivo || 'Permissão de exclusão negada.' }, { status: 403 });
    }

    await prisma.lancamentoFinanceiro.delete({ where: { id } });

    await registrarLogAuditoria({
      usuarioId: user.id,
      usuarioEmail: user.email,
      acao: 'EXCLUSAO',
      modulo,
      registroId: id,
      detalhes: { titulo: lancamento.titulo, valor: lancamento.valor },
    });

    return NextResponse.json({ success: true, message: 'Lançamento excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir lançamento:', error);
    return NextResponse.json({ error: 'Erro ao excluir lançamento.' }, { status: 500 });
  }
}

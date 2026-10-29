import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get('periodo') || 'MES_ATUAL';
    const centroCustoId = searchParams.get('centroCustoId');

    const agora = new Date();
    let dtInicio: Date;
    let dtFim: Date = new Date();

    if (periodo === 'HOJE') {
      dtInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    } else if (periodo === '7_DIAS') {
      dtInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodo === 'TRIMESTRE') {
      dtInicio = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);
    } else if (periodo === 'ANO_ATUAL') {
      dtInicio = new Date(agora.getFullYear(), 0, 1);
    } else {
      // Mês Atual padrão
      dtInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    }

    // Período anterior equivalente para cálculo de variação
    const duracaoMs = dtFim.getTime() - dtInicio.getTime();
    const dtInicioAnterior = new Date(dtInicio.getTime() - duracaoMs);
    const dtFimAnterior = new Date(dtInicio.getTime() - 1);

    // Filtros de centro de custo
    const whereBase: any = {};
    if (user.role !== 'MASTER' && user.centroCustoId) {
      whereBase.centroCustoId = user.centroCustoId;
    } else if (centroCustoId && centroCustoId !== 'TODOS') {
      whereBase.centroCustoId = centroCustoId;
    }

    // 1. Receita e Despesa Período Atual
    const lancamentosAtual = await prisma.lancamentoFinanceiro.findMany({
      where: {
        ...whereBase,
        status: 'PAGO',
        dataPagamento: { gte: dtInicio, lte: dtFim },
      },
      include: {
        categoria: true,
        centroCusto: true,
        clienteProcesso: true,
      },
    });

    const receitaAtual = lancamentosAtual
      .filter((l) => l.tipo === 'RECEBER')
      .reduce((acc, l) => acc + (l.valorLiquido || l.valor), 0);

    const despesaAtual = lancamentosAtual
      .filter((l) => l.tipo === 'PAGAR')
      .reduce((acc, l) => acc + (l.valorLiquido || l.valor), 0);

    const lucroLiquido = receitaAtual - despesaAtual;
    const margemLiquida = receitaAtual > 0 ? (lucroLiquido / receitaAtual) * 100 : 0;

    // 2. Receita Período Anterior
    const lancamentosAnterior = await prisma.lancamentoFinanceiro.findMany({
      where: {
        ...whereBase,
        status: 'PAGO',
        tipo: 'RECEBER',
        dataPagamento: { gte: dtInicioAnterior, lte: dtFimAnterior },
      },
    });

    const receitaAnterior = lancamentosAnterior.reduce((acc, l) => acc + (l.valorLiquido || l.valor), 0);
    const variacaoReceita = receitaAnterior > 0
      ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100
      : 0;

    // 3. Saldo Total Consolidado em Contas
    const contas = await prisma.contaBancaria.findMany({ where: { ativo: true } });
    const saldoConsolidado = contas.reduce((acc, c) => acc + c.saldoAtual, 0);

    // 4. Taxa de Inadimplência Global
    const totalReceberPendente = await prisma.lancamentoFinanceiro.aggregate({
      where: { ...whereBase, tipo: 'RECEBER', status: { in: ['PENDENTE', 'ATRASADO'] } },
      _sum: { valor: true },
    });
    const totalReceberAtrasado = await prisma.lancamentoFinanceiro.aggregate({
      where: { ...whereBase, tipo: 'RECEBER', status: 'ATRASADO' },
      _sum: { valor: true },
    });

    const vPendente = totalReceberPendente._sum.valor || 0;
    const vAtrasado = totalReceberAtrasado._sum.valor || 0;
    const taxaInadimplencia = vPendente > 0 ? (vAtrasado / (vPendente + receitaAtual)) * 100 : 0;

    // 5. Gráfico de Barras: Faturamento por Centro de Custo / Área Jurídica
    const centros = await prisma.centroCusto.findMany({ where: { ativo: true } });
    const faturamentoPorArea = centros.map((c) => {
      const total = lancamentosAtual
        .filter((l) => l.tipo === 'RECEBER' && l.centroCustoId === c.id)
        .reduce((acc, l) => acc + (l.valorLiquido || l.valor), 0);
      return {
        area: c.nome,
        codigo: c.codigo,
        valor: total,
      };
    });

    // 6. Gráfico de Rosca: Composição de Despesas por Categoria
    const despesasMap = new Map<string, number>();
    for (const l of lancamentosAtual.filter((item) => item.tipo === 'PAGAR')) {
      const nomeCat = l.categoria?.nome || 'Outras Despesas';
      const atual = despesasMap.get(nomeCat) || 0;
      despesasMap.set(nomeCat, atual + (l.valorLiquido || l.valor));
    }

    const composicaoDespesas = Array.from(despesasMap.entries()).map(([categoria, valor]) => ({
      categoria,
      valor,
    }));

    // 7. Gráfico de Linha/Área: Evolução do Fluxo de Caixa no Período
    const diasTimelineMap = new Map<string, { data: string; entradas: number; saidas: number }>();
    for (const l of lancamentosAtual) {
      const dataStr = (l.dataPagamento || l.dataVencimento).toISOString().split('T')[0];
      const entry = diasTimelineMap.get(dataStr) || { data: dataStr, entradas: 0, saidas: 0 };
      if (l.tipo === 'RECEBER') entry.entradas += l.valorLiquido || l.valor;
      else entry.saidas += l.valorLiquido || l.valor;
      diasTimelineMap.set(dataStr, entry);
    }

    const evolucaoFluxo = Array.from(diasTimelineMap.values()).sort((a, b) => a.data.localeCompare(b.data));

    // 8. Tabela Top Clientes e Concentração de Risco (Curva ABC)
    const clientesReceitaMap = new Map<string, { nome: string; processo?: string; total: number }>();
    for (const l of lancamentosAtual.filter((item) => item.tipo === 'RECEBER')) {
      const cNome = l.clienteProcesso?.nomeCliente || l.fornecedorOuCliente || 'Outros Clientes';
      const cData = clientesReceitaMap.get(cNome) || {
        nome: cNome,
        processo: l.clienteProcesso?.numeroProcesso || undefined,
        total: 0,
      };
      cData.total += l.valorLiquido || l.valor;
      clientesReceitaMap.set(cNome, cData);
    }

    const topClientes = Array.from(clientesReceitaMap.values())
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        ...c,
        participacao: receitaAtual > 0 ? (c.total / receitaAtual) * 100 : 0,
      }));

    return NextResponse.json({
      kpis: {
        receitaAtual,
        receitaAnterior,
        variacaoReceita,
        lucroLiquido,
        margemLiquida,
        saldoConsolidado,
        taxaInadimplencia,
        totalAtrasado: vAtrasado,
      },
      graficos: {
        faturamentoPorArea,
        composicaoDespesas,
        evolucaoFluxo,
        topClientes,
      },
    });
  } catch (error: any) {
    console.error('Erro ao processar BI:', error);
    return NextResponse.json({ error: 'Erro ao compilar métricas de Business Intelligence' }, { status: 500 });
  }
}

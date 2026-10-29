import { prisma } from './prisma';

export type RegimeContabil = 'COMPETENCIA' | 'CAIXA';

export interface FiltrosRelatorio {
  regime: RegimeContabil;
  dataInicio?: string | Date;
  dataFim?: string | Date;
  centroCustoId?: string;
  contaBancariaId?: string;
}

export interface ItemDRE {
  codigo: string;
  descricao: string;
  valor: number;
  tipo: 'SOMA' | 'SUBTRACAO' | 'SUBTOTAL' | 'TOTAL';
  itens?: {
    categoriaId: string;
    nome: string;
    codigo: string;
    valor: number;
  }[];
}

export interface DRECalculado {
  regime: RegimeContabil;
  periodo: {
    inicio: string;
    fim: string;
  };
  receitaBruta: number;
  deducoesImpostos: number;
  receitaLiquida: number;
  custosDiretos: number;
  lucroBruto: number;
  margemBruta: number;
  despesasOperacionais: number;
  ebitda: number;
  margemEbitda: number;
  resultadoFinanceiro: number;
  lucroLiquido: number;
  margemLiquida: number;
  linhas: ItemDRE[];
}

/**
 * Motor Contábil Jurídico: Cálculo em tempo real do DRE
 * Suporta apuração por Competência (fato gerador) ou Caixa (liquidação efetiva)
 */
export async function calcularDRE(filtros: FiltrosRelatorio): Promise<DRECalculado> {
  const { regime, dataInicio, dataFim, centroCustoId, contaBancariaId } = filtros;

  const dtInicio = dataInicio ? new Date(dataInicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dtFim = dataFim ? new Date(dataFim) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  // Cláusula WHERE condicional pelo Regime
  const where: any = {
    status: regime === 'CAIXA' ? 'PAGO' : { in: ['PAGO', 'PENDENTE', 'EM_APROVACAO', 'ATRASADO'] },
  };

  if (regime === 'CAIXA') {
    where.dataPagamento = {
      gte: dtInicio,
      lte: dtFim,
    };
  } else {
    where.dataCompetencia = {
      gte: dtInicio,
      lte: dtFim,
    };
  }

  if (centroCustoId && centroCustoId !== 'TODOS') {
    where.centroCustoId = centroCustoId;
  }

  if (contaBancariaId && contaBancariaId !== 'TODAS') {
    where.contaBancariaId = contaBancariaId;
  }

  const lancamentos = await prisma.lancamentoFinanceiro.findMany({
    where,
    include: {
      categoria: true,
      centroCusto: true,
      clienteProcesso: true,
    },
  });

  // Agrupamento por Categoria e Grupo DRE
  const grupos = {
    RECEITA_BRUTA: { total: 0, categorias: new Map<string, { nome: string; codigo: string; valor: number }>() },
    DEDUCOES_IMPOSTOS: { total: 0, categorias: new Map<string, { nome: string; codigo: string; valor: number }>() },
    CUSTO_DIRETO: { total: 0, categorias: new Map<string, { nome: string; codigo: string; valor: number }>() },
    DESPESA_OPERACIONAL: { total: 0, categorias: new Map<string, { nome: string; codigo: string; valor: number }>() },
    RESULTADO_FINANCEIRO: { total: 0, categorias: new Map<string, { nome: string; codigo: string; valor: number }>() },
  };

  for (const l of lancamentos) {
    const grupo = (l.categoria?.grupoDre || (l.tipo === 'RECEBER' ? 'RECEITA_BRUTA' : 'DESPESA_OPERACIONAL')) as keyof typeof grupos;
    if (!grupos[grupo]) continue;

    // Em regime de caixa ou competência consideramos o valor (ou valorLiquido para receitas se houver retenções)
    const val = l.tipo === 'PAGAR' ? Math.abs(l.valor) : Math.abs(l.valor);
    const catId = l.categoriaId;
    const catNome = l.categoria.nome;
    const catCodigo = l.categoria.codigo;

    const grupoRef = grupos[grupo];
    // Se for resultado financeiro: receitas financeiras somam, despesas financeiras subtraem
    if (grupo === 'RESULTADO_FINANCEIRO') {
      const delta = l.tipo === 'RECEBER' ? val : -val;
      grupoRef.total += delta;
    } else {
      grupoRef.total += val;
    }

    const currentCat = grupoRef.categorias.get(catId) || { nome: catNome, codigo: catCodigo, valor: 0 };
    if (grupo === 'RESULTADO_FINANCEIRO') {
      currentCat.valor += l.tipo === 'RECEBER' ? val : -val;
    } else {
      currentCat.valor += val;
    }
    grupoRef.categorias.set(catId, currentCat);
  }

  const receitaBruta = grupos.RECEITA_BRUTA.total;
  const deducoesImpostos = grupos.DEDUCOES_IMPOSTOS.total;
  const receitaLiquida = Math.max(0, receitaBruta - deducoesImpostos);
  const custosDiretos = grupos.CUSTO_DIRETO.total;
  const lucroBruto = receitaLiquida - custosDiretos;
  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
  const despesasOperacionais = grupos.DESPESA_OPERACIONAL.total;
  const ebitda = lucroBruto - despesasOperacionais;
  const margemEbitda = receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0;
  const resultadoFinanceiro = grupos.RESULTADO_FINANCEIRO.total;
  const lucroLiquido = ebitda + resultadoFinanceiro;
  const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

  const toItemList = (map: Map<string, { nome: string; codigo: string; valor: number }>) =>
    Array.from(map.entries()).map(([catId, item]) => ({
      categoriaId: catId,
      nome: item.nome,
      codigo: item.codigo,
      valor: item.valor,
    }));

  const linhas: ItemDRE[] = [
    {
      codigo: '1.0',
      descricao: '1. Receita Bruta de Honorários',
      valor: receitaBruta,
      tipo: 'SOMA',
      itens: toItemList(grupos.RECEITA_BRUTA.categorias),
    },
    {
      codigo: '2.0',
      descricao: '2. (-) Deduções e Impostos sobre Serviços',
      valor: deducoesImpostos,
      tipo: 'SUBTRACAO',
      itens: toItemList(grupos.DEDUCOES_IMPOSTOS.categorias),
    },
    {
      codigo: '3.0',
      descricao: '3. (=) Receita Líquida Operacional',
      valor: receitaLiquida,
      tipo: 'SUBTOTAL',
    },
    {
      codigo: '4.0',
      descricao: '4. (-) Custos Diretos dos Serviços (Custas, Perícias, Correspondentes)',
      valor: custosDiretos,
      tipo: 'SUBTRACAO',
      itens: toItemList(grupos.CUSTO_DIRETO.categorias),
    },
    {
      codigo: '5.0',
      descricao: '5. (=) Lucro Bruto',
      valor: lucroBruto,
      tipo: 'SUBTOTAL',
    },
    {
      codigo: '6.0',
      descricao: '6. (-) Despesas Operacionais (Administrativa, Folha, TI, Mkt)',
      valor: despesasOperacionais,
      tipo: 'SUBTRACAO',
      itens: toItemList(grupos.DESPESA_OPERACIONAL.categorias),
    },
    {
      codigo: '7.0',
      descricao: '7. (=) EBITDA / Resultado Operacional',
      valor: ebitda,
      tipo: 'SUBTOTAL',
    },
    {
      codigo: '8.0',
      descricao: '8. (+/-) Resultado Financeiro Líquido (Aplicações, Juros, Tarifas)',
      valor: resultadoFinanceiro,
      tipo: 'SOMA',
      itens: toItemList(grupos.RESULTADO_FINANCEIRO.categorias),
    },
    {
      codigo: '9.0',
      descricao: '9. (=) Lucro Líquido do Período',
      valor: lucroLiquido,
      tipo: 'TOTAL',
    },
  ];

  return {
    regime,
    periodo: {
      inicio: dtInicio.toISOString().split('T')[0],
      fim: dtFim.toISOString().split('T')[0],
    },
    receitaBruta,
    deducoesImpostos,
    receitaLiquida,
    custosDiretos,
    lucroBruto,
    margemBruta,
    despesasOperacionais,
    ebitda,
    margemEbitda,
    resultadoFinanceiro,
    lucroLiquido,
    margemLiquida,
    linhas,
  };
}

/**
 * Relatório de Fluxo de Caixa: Realizado vs. Projetado
 */
export async function calcularFluxoDeCaixa(dtInicio: Date, dtFim: Date) {
  // Saldo inicial consolidado das contas
  const contas = await prisma.contaBancaria.findMany({ where: { ativo: true } });
  const saldoInicialConsolidado = contas.reduce((acc, c) => acc + c.saldoInicial, 0);

  const lancamentos = await prisma.lancamentoFinanceiro.findMany({
    where: {
      OR: [
        { status: 'PAGO', dataPagamento: { gte: dtInicio, lte: dtFim } },
        { status: { in: ['PENDENTE', 'PREVISTO', 'ATRASADO'] }, dataVencimento: { gte: dtInicio, lte: dtFim } },
      ],
    },
    orderBy: { dataVencimento: 'asc' },
  });

  // Agrupamento por dia/mês
  const diasMap = new Map<string, {
    data: string;
    entradasRealizadas: number;
    saidasRealizadas: number;
    entradasProjetadas: number;
    saidasProjetadas: number;
  }>();

  for (const l of lancamentos) {
    const dataRef = l.status === 'PAGO' && l.dataPagamento ? l.dataPagamento : l.dataVencimento;
    const chave = dataRef.toISOString().split('T')[0];

    const d = diasMap.get(chave) || {
      data: chave,
      entradasRealizadas: 0,
      saidasRealizadas: 0,
      entradasProjetadas: 0,
      saidasProjetadas: 0,
    };

    const val = Math.abs(l.valorLiquido || l.valor);
    if (l.status === 'PAGO') {
      if (l.tipo === 'RECEBER') d.entradasRealizadas += val;
      else d.saidasRealizadas += val;
    } else {
      if (l.tipo === 'RECEBER') d.entradasProjetadas += val;
      else d.saidasProjetadas += val;
    }

    diasMap.set(chave, d);
  }

  // Ordena por data e calcula saldo acumulado
  const ordenados = Array.from(diasMap.values()).sort((a, b) => a.data.localeCompare(b.data));
  let saldoAcumulado = saldoInicialConsolidado;

  const resultado = ordenados.map((item) => {
    const liquidoRealizado = item.entradasRealizadas - item.saidasRealizadas;
    const liquidoProjetado = item.entradasProjetadas - item.saidasProjetadas;
    saldoAcumulado += liquidoRealizado;

    return {
      ...item,
      saldoAcumulado,
      saldoComProjecao: saldoAcumulado + liquidoProjetado,
    };
  });

  return {
    saldoInicial: saldoInicialConsolidado,
    saldoAtual: saldoAcumulado,
    timeline: resultado,
  };
}

/**
 * Aging List: Inadimplência de Honorários por faixa de atraso
 */
export async function calcularAgingListInadimplencia() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const titulosAtrasados = await prisma.lancamentoFinanceiro.findMany({
    where: {
      tipo: 'RECEBER',
      status: { in: ['PENDENTE', 'ATRASADO'] },
      dataVencimento: { lt: hoje },
    },
    include: {
      clienteProcesso: true,
      centroCusto: true,
    },
    orderBy: { dataVencimento: 'asc' },
  });

  const faixas = {
    ate30: { rotulo: '1 a 30 dias', total: 0, quantidade: 0, titulos: [] as any[] },
    ate60: { rotulo: '31 a 60 dias', total: 0, quantidade: 0, titulos: [] as any[] },
    ate90: { rotulo: '61 a 90 dias', total: 0, quantidade: 0, titulos: [] as any[] },
    mais90: { rotulo: 'Mais de 90 dias', total: 0, quantidade: 0, titulos: [] as any[] },
  };

  const clientesMap = new Map<string, {
    clienteNome: string;
    processo?: string;
    totalAtrasado: number;
    titulos: any[];
  }>();

  let totalGeralInadimplente = 0;

  for (const t of titulosAtrasados) {
    const diffDias = Math.floor((hoje.getTime() - new Date(t.dataVencimento).getTime()) / (1000 * 60 * 60 * 24));
    const val = t.valor;
    totalGeralInadimplente += val;

    let faixaRef: typeof faixas.ate30;
    if (diffDias <= 30) faixaRef = faixas.ate30;
    else if (diffDias <= 60) faixaRef = faixas.ate60;
    else if (diffDias <= 90) faixaRef = faixas.ate90;
    else faixaRef = faixas.mais90;

    faixaRef.total += val;
    faixaRef.quantidade += 1;
    faixaRef.titulos.push({ ...t, diasAtraso: diffDias });

    const cNome = t.clienteProcesso?.nomeCliente || t.fornecedorOuCliente || 'Cliente Não Identificado';
    const cData = clientesMap.get(cNome) || {
      clienteNome: cNome,
      processo: t.clienteProcesso?.numeroProcesso || undefined,
      totalAtrasado: 0,
      titulos: [],
    };
    cData.totalAtrasado += val;
    cData.titulos.push({ ...t, diasAtraso: diffDias });
    clientesMap.set(cNome, cData);
  }

  return {
    totalInadimplente: totalGeralInadimplente,
    quantidadeTitulos: titulosAtrasados.length,
    faixas: [faixas.ate30, faixas.ate60, faixas.ate90, faixas.mais90],
    topClientesInadimplentes: Array.from(clientesMap.values()).sort((a, b) => b.totalAtrasado - a.totalAtrasado),
  };
}

/**
 * Relatório de Despesas Processuais e Reembolsos de Clientes
 */
export async function calcularDespesasReembolsaveis() {
  const lancamentos = await prisma.lancamentoFinanceiro.findMany({
    where: {
      ehReembolsavel: true,
    },
    include: {
      clienteProcesso: true,
      centroCusto: true,
      categoria: true,
    },
    orderBy: { dataVencimento: 'desc' },
  });

  let totalAdiantado = 0;
  let totalReembolsado = 0;

  const itens = lancamentos.map((l) => {
    totalAdiantado += l.valor;
    if (l.reembolsado) {
      totalReembolsado += l.valor;
    }
    return {
      id: l.id,
      titulo: l.titulo,
      valor: l.valor,
      data: l.dataCompetencia,
      cliente: l.clienteProcesso?.nomeCliente || l.fornecedorOuCliente || 'Cliente Geral',
      processo: l.clienteProcesso?.numeroProcesso || 'N/A',
      reembolsado: l.reembolsado,
      categoria: l.categoria.nome,
    };
  });

  return {
    totalAdiantado,
    totalReembolsado,
    saldoAReembolsar: totalAdiantado - totalReembolsado,
    despesas: itens,
  };
}

/**
 * Validação de Fechamento Bancário Retroativo:
 * Bloqueia inserções ou alterações financeiras com data anterior à data de fechamento da conta.
 */
export async function validarBloqueioRetroativo(contaBancariaId: string, dataOperacao: Date): Promise<{ bloqueado: boolean; mensagem?: string }> {
  const conta = await prisma.contaBancaria.findUnique({
    where: { id: contaBancariaId },
  });

  if (!conta || !conta.fechamentoDataBloqueio) {
    return { bloqueado: false };
  }

  if (new Date(dataOperacao) <= new Date(conta.fechamentoDataBloqueio)) {
    return {
      bloqueado: true,
      mensagem: `A conta bancária "${conta.nomeBanco}" possui fechamento contábil mensal até ${new Date(conta.fechamentoDataBloqueio).toLocaleDateString('pt-BR')}. Movimentações retroativas estão bloqueadas.`,
    };
  }

  return { bloqueado: false };
}

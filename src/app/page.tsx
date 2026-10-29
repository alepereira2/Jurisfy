'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Landmark,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Filter,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ModalLancamento } from '@/components/ModalLancamento';

const CORES_DONUT = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardBIPage() {
  const [periodo, setPeriodo] = useState('MES_ATUAL');
  const [centroCustoId, setCentroCustoId] = useState('TODOS');
  const [dataBI, setDataBI] = useState<any>(null);
  const [auxiliar, setAuxiliar] = useState<any>({ centrosCusto: [], categorias: [], contasBancarias: [], clientesProcessos: [] });
  const [loading, setLoading] = useState(true);
  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resBI, resAux] = await Promise.all([
        fetch(`/api/bi?periodo=${periodo}&centroCustoId=${centroCustoId}`).then((r) => r.json()),
        fetch('/api/auxiliar').then((r) => r.json()),
      ]);
      setDataBI(resBI);
      setAuxiliar(resAux);
    } catch (err) {
      console.error('Erro ao carregar BI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [periodo, centroCustoId]);

  const kpis = dataBI?.kpis || {
    receitaAtual: 0,
    receitaAnterior: 0,
    variacaoReceita: 0,
    lucroLiquido: 0,
    margemLiquida: 0,
    saldoConsolidado: 0,
    taxaInadimplencia: 0,
    totalAtrasado: 0,
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Cabeçalho & Filtros Interativos */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-500" />
              Painel Executivo de Business Intelligence (BI)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Visão estratégica consolidada de receitas, margens, inadimplência e fluxo de caixa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Período */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="MES_ATUAL">Mês Corrente</option>
                <option value="7_DIAS">Últimos 7 dias</option>
                <option value="TRIMESTRE">Último Trimestre</option>
                <option value="ANO_ATUAL">Ano Atual</option>
              </select>
            </div>

            {/* Filtro Centro de Custo */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={centroCustoId}
                onChange={(e) => setCentroCustoId(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos os Centros de Custo</option>
                {auxiliar.centrosCusto?.map((cc: any) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Novo Lançamento */}
            <button
              onClick={() => setModalLancamentoAberto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Lançamento
            </button>
          </div>
        </div>

        {/* Cards de Métricas e KPIs Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Faturamento Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Receita Total de Honorários</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold font-mono text-slate-900">
                {formatCurrency(kpis.receitaAtual)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              <span
                className={`font-bold flex items-center ${
                  kpis.variacaoReceita >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {kpis.variacaoReceita >= 0 ? '+' : ''}
                {kpis.variacaoReceita.toFixed(1)}%
              </span>
              <span className="text-slate-400">vs. período anterior</span>
            </div>
          </div>

          {/* Card 2: Lucro Líquido e Margem */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Resultado Líquido do Período</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-600">
                {formatCurrency(kpis.lucroLiquido)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Margem Líquida:</span>
              <span className="font-bold text-slate-800 font-mono">{kpis.margemLiquida.toFixed(1)}%</span>
            </div>
          </div>

          {/* Card 3: Taxa de Inadimplência */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Inadimplência de Honorários</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold font-mono text-rose-600">
                {kpis.taxaInadimplencia.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Total em atraso:</span>
              <span className="font-bold font-mono text-rose-700">{formatCurrency(kpis.totalAtrasado)}</span>
            </div>
          </div>

          {/* Card 4: Saldo Consolidado em Caixa */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Saldo Consolidado em Contas</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Landmark className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-extrabold font-mono text-slate-900">
                {formatCurrency(kpis.saldoConsolidado)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-slate-400">Total em contas correntes e aplicações</span>
            </div>
          </div>
        </div>

        {/* Linha de Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico 1: Evolução Temporal do Fluxo de Caixa (2 colunas) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Evolução do Fluxo Financeiro (Entradas vs. Saídas)</h3>
                <p className="text-xs text-slate-400">Movimentações diárias de recebimentos e pagamentos</p>
              </div>
              <Link href="/fluxo-caixa" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                Ver Projeção <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-72 w-full">
              {dataBI?.graficos?.evolucaoFluxo?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dataBI.graficos.evolucaoFluxo} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="corEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="corSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="entradas" name="Recebimentos" stroke="#10b981" fillOpacity={1} fill="url(#corEntradas)" />
                    <Area type="monotone" dataKey="saidas" name="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#corSaidas)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Nenhuma movimentação registrada no período selecionado.
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 2: Composição de Despesas (Donut) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Composição das Despesas</h3>
              <p className="text-xs text-slate-400">Distribuição por categoria do Plano de Contas</p>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              {dataBI?.graficos?.composicaoDespesas?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataBI.graficos.composicaoDespesas}
                      dataKey="valor"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {dataBI.graficos.composicaoDespesas.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CORES_DONUT[index % CORES_DONUT.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), '']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-400">Nenhuma despesa no período.</div>
              )}
            </div>
          </div>
        </div>

        {/* Linha 2: Faturamento por Área Jurídica e Top Clientes (Curva ABC) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Faturamento por Centro de Custo / Área do Direito */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Faturamento por Área Jurídica</h3>
              <p className="text-xs text-slate-400">Receita auferida por Centro de Custo no período</p>
            </div>

            <div className="h-64 w-full">
              {dataBI?.graficos?.faturamentoPorArea?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataBI.graficos.faturamentoPorArea} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="area" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Receita']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="valor" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Nenhum faturamento por área computado.
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Top Clientes (Curva ABC & Concentração de Risco) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Top Clientes & Curva ABC</h3>
                <p className="text-xs text-slate-400">Concentração de risco de faturamento por cliente</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Curva ABC
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-2">Cliente / Empresa</th>
                    <th className="pb-2 text-right">Faturamento</th>
                    <th className="pb-2 text-right">Participação (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataBI?.graficos?.topClientes?.length > 0 ? (
                    dataBI.graficos.topClientes.map((c: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50/60">
                        <td className="py-2.5 font-medium text-slate-800">
                          <p className="truncate max-w-[200px]">{c.nome}</p>
                          {c.processo && <span className="text-[10px] text-slate-400 font-mono block">{c.processo}</span>}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-700">
                          {formatCurrency(c.total)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-amber-600">
                          {c.participacao.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        Nenhum dado de cliente para o filtro selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Lançamento */}
      {modalLancamentoAberto && (
        <ModalLancamento
          tipoPadrao="RECEBER"
          centrosCusto={auxiliar.centrosCusto || []}
          categorias={auxiliar.categorias || []}
          contasBancarias={auxiliar.contasBancarias || []}
          clientesProcessos={auxiliar.clientesProcessos || []}
          onClose={() => setModalLancamentoAberto(false)}
          onSuccess={() => {
            setModalLancamentoAberto(false);
            carregarDados();
          }}
        />
      )}
    </div>
  );
}

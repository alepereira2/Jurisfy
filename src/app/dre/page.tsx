'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Percent,
  DollarSign
} from 'lucide-react';

export default function DREPage() {
  const [regime, setRegime] = useState<'COMPETENCIA' | 'CAIXA'>('COMPETENCIA');
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [centroCustoId, setCentroCustoId] = useState('TODOS');
  const [dre, setDre] = useState<any>(null);
  const [auxiliar, setAuxiliar] = useState<any>({ centrosCusto: [] });
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({
    '1.0': true,
    '2.0': true,
    '4.0': true,
    '6.0': true,
    '8.0': true,
  });

  const carregarDRE = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        regime,
        dataInicio,
        dataFim,
        centroCustoId,
      });

      const [resDre, resAux] = await Promise.all([
        fetch(`/api/relatorios/dre?${params}`).then((r) => r.json()),
        fetch('/api/auxiliar').then((r) => r.json()),
      ]);

      setDre(resDre.dre);
      setAuxiliar(resAux);
    } catch (err) {
      console.error('Erro ao carregar DRE:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDRE();
  }, [regime, dataInicio, dataFim, centroCustoId]);

  const toggleExpandir = (codigo: string) => {
    setExpandidos((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const handleExportCSV = () => {
    if (!dre) return;

    let csv = `DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO (DRE)\n`;
    csv += `Regime;${dre.regime === 'COMPETENCIA' ? 'COMPETÊNCIA (FATO GERADOR)' : 'CAIXA (LIQUIDAÇÃO EFETIVA)'}\n`;
    csv += `Período;${dre.periodo.inicio} até ${dre.periodo.fim}\n\n`;
    csv += `Código;Descrição da Conta;Valor (R$)\n`;

    for (const linha of dre.linhas) {
      csv += `"${linha.codigo}";"${linha.descricao}";"${linha.valor.toFixed(2).replace('.', ',')}"\n`;
      if (linha.itens && linha.itens.length > 0) {
        for (const it of linha.itens) {
          csv += `"${it.codigo}";"  ${it.nome}";"${it.valor.toFixed(2).replace('.', ',')}"\n`;
        }
      }
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DRE_Jurisfy_${regime}_${dataInicio}_${dataFim}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Filtros */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Demonstrativo do Resultado do Exercício (DRE)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Apuração contábil hierárquica para escritórios de advocacia com dupla apuração em tempo real.
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              >
                <Download className="w-4 h-4" />
                Exportar CSV/Excel
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                Imprimir / PDF
              </button>
            </div>
          </div>

          {/* Seletor Obrigatório: Regime de Competência vs. Regime de Caixa */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Regime Contábil:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegime('COMPETENCIA')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    regime === 'COMPETENCIA'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Regime de Competência (Fato Gerador)
                </button>
                <button
                  type="button"
                  onClick={() => setRegime('CAIXA')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    regime === 'CAIXA'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Regime de Caixa (Liquidação Efetiva)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">De:</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Até:</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono"
                />
              </div>

              <select
                value={centroCustoId}
                onChange={(e) => setCentroCustoId(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-700"
              >
                <option value="TODOS">Todos os Centros de Custo</option>
                {auxiliar.centrosCusto?.map((cc: any) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumo dos Indicadores DRE */}
        {dre && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Receita Líquida</span>
              <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">{formatCurrency(dre.receitaLiquida)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Lucro Bruto</span>
              <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">{formatCurrency(dre.lucroBruto)}</p>
              <span className="text-[10px] text-slate-500">Margem: {dre.margemBruta.toFixed(1)}%</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">EBITDA (Operacional)</span>
              <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">{formatCurrency(dre.ebitda)}</p>
              <span className="text-[10px] text-slate-500">Margem: {dre.margemEbitda.toFixed(1)}%</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Lucro Líquido Final</span>
              <p className={`text-lg font-extrabold font-mono mt-0.5 ${dre.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(dre.lucroLiquido)}
              </p>
              <span className="text-[10px] text-slate-500">Margem Líquida: {dre.margemLiquida.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Estrutura do DRE Padronizada */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 print:border-none print:shadow-none print:p-0">
          <div className="hidden print:block mb-6 border-b pb-4">
            <h2 className="text-lg font-bold">JURISFY ERP - DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO</h2>
            <p className="text-xs text-slate-500">
              Regime: {regime === 'COMPETENCIA' ? 'COMPETÊNCIA' : 'CAIXA'} • Período: {dataInicio} a {dataFim}
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {dre?.linhas?.map((linha: any) => {
              const isSubtotal = linha.tipo === 'SUBTOTAL';
              const isTotal = linha.tipo === 'TOTAL';
              const temItens = linha.itens && linha.itens.length > 0;
              const isExpandido = expandidos[linha.codigo];

              return (
                <div key={linha.codigo} className="py-2.5">
                  <div
                    onClick={() => temItens && toggleExpandir(linha.codigo)}
                    className={`flex items-center justify-between cursor-pointer select-none rounded-lg px-2 py-1 transition-colors ${
                      isTotal
                        ? 'bg-slate-900 text-white font-bold p-3 text-sm rounded-xl'
                        : isSubtotal
                        ? 'bg-slate-50 font-bold text-slate-900'
                        : 'hover:bg-slate-50 font-semibold text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {temItens ? (
                        isExpandido ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )
                      ) : (
                        <div className="w-4" />
                      )}
                      <span>{linha.descricao}</span>
                    </div>

                    <div className="font-mono text-right">
                      <span className={linha.tipo === 'SUBTRACAO' ? 'text-rose-600' : ''}>
                        {linha.tipo === 'SUBTRACAO' ? '(-)' : ''} {formatCurrency(Math.abs(linha.valor))}
                      </span>
                    </div>
                  </div>

                  {/* Subcategorias expandíveis */}
                  {temItens && isExpandido && (
                    <div className="pl-8 pr-2 py-1 space-y-1 mt-1 border-l-2 border-slate-100 ml-4">
                      {linha.itens.map((it: any) => (
                        <div key={it.categoriaId} className="flex justify-between text-[11px] text-slate-500 hover:text-slate-800 py-0.5">
                          <span>
                            {it.codigo} - {it.nome}
                          </span>
                          <span className="font-mono">
                            {formatCurrency(Math.abs(it.valor))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

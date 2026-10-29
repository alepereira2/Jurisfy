'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Clock, AlertTriangle, Briefcase, ChevronRight, User } from 'lucide-react';

export default function InadimplenciaPage() {
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/relatorios/inadimplencia')
      .then((r) => r.json())
      .then((d) => setAging(d.aging))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-rose-500" />
              Relatório de Inadimplência (Aging List de Honorários)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Classificação de títulos vencidos por faixa temporal e concentração por cliente e processo.
            </p>
          </div>

          <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl">
            <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">Total Inadimplente:</span>
            <span className="text-xl font-mono font-extrabold text-rose-700">
              {formatCurrency(aging?.totalInadimplente)}
            </span>
          </div>
        </div>

        {/* Faixas Temporais (Aging Buckets) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {aging?.faixas?.map((faixa: any, idx: number) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">{faixa.rotulo}</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">{formatCurrency(faixa.total)}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {faixa.quantidade} título(s) nesta faixa
              </span>
            </div>
          ))}
        </div>

        {/* Ranking por Cliente Inadimplente */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex items-center justify-between">
            <span>Ranking de Clientes com Títulos em Atraso</span>
            <span className="text-slate-400 font-normal">Ordenado pelo maior valor em débito</span>
          </div>

          <div className="divide-y divide-slate-100">
            {aging?.topClientesInadimplentes?.length > 0 ? (
              aging.topClientesInadimplentes.map((cli: any, i: number) => (
                <div key={i} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {cli.clienteNome}
                      </span>
                      {cli.processo && (
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          Pasta/Processo: {cli.processo}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-rose-600 block">
                        {formatCurrency(cli.totalAtrasado)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {cli.titulos.length} título(s) vencido(s)
                      </span>
                    </div>
                  </div>

                  {/* Detalhe dos títulos do cliente */}
                  <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] space-y-1">
                    {cli.titulos.map((t: any) => (
                      <div key={t.id} className="flex justify-between items-center text-slate-600 font-mono">
                        <span className="font-sans text-slate-800">{t.titulo} (Venc: {new Date(t.dataVencimento).toLocaleDateString('pt-BR')})</span>
                        <div className="flex items-center gap-2">
                          <span className="text-rose-600 font-bold">{t.diasAtraso} dias de atraso</span>
                          <span>•</span>
                          <span>{formatCurrency(t.valor)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum honorário inadimplente no momento. Parabéns à gestão financeira!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

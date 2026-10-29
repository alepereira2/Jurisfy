'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { DollarSign, TrendingUp, TrendingDown, Calendar, ArrowRight } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function FluxoDeCaixaPage() {
  const [fluxo, setFluxo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/relatorios/fluxo-caixa')
      .then((r) => r.json())
      .then((d) => setFluxo(d.fluxo))
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-amber-500" />
              Relatório de Fluxo de Caixa (Realizado vs. Projetado)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento de liquidez diária, previsões de honorários futuros e despesas programadas.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Saldo Inicial:</span>
              <span className="font-bold text-slate-800">{formatCurrency(fluxo?.saldoInicial)}</span>
            </div>
            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Saldo Atual Acumulado:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(fluxo?.saldoAtual)}</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Linha do Saldo Acumulado com Projeção */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Trajetória do Saldo Acumulado</h3>
          <p className="text-xs text-slate-400 mb-4">Comportamento do saldo financeiro com previsão futura</p>

          <div className="h-72 w-full">
            {fluxo?.timeline?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fluxo.timeline}>
                  <defs>
                    <linearGradient id="corSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), '']} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="saldoAcumulado" name="Saldo Realizado" stroke="#3b82f6" fill="url(#corSaldo)" />
                  <Area type="monotone" dataKey="saldoComProjecao" name="Saldo com Projeções" stroke="#f59e0b" strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Carregando projeções...
              </div>
            )}
          </div>
        </div>

        {/* Tabela Diária */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
            Detalhamento Diário do Fluxo
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3">Data</th>
                  <th className="p-3 text-right text-emerald-700">Entradas Realizadas</th>
                  <th className="p-3 text-right text-rose-700">Saídas Realizadas</th>
                  <th className="p-3 text-right text-emerald-600">Entradas Projetadas</th>
                  <th className="p-3 text-right text-rose-600">Saídas Projetadas</th>
                  <th className="p-3 text-right font-bold text-slate-900">Saldo Final Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {fluxo?.timeline?.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{item.data}</td>
                    <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(item.entradasRealizadas)}</td>
                    <td className="p-3 text-right text-rose-600 font-medium">{formatCurrency(item.saidasRealizadas)}</td>
                    <td className="p-3 text-right text-emerald-500">{formatCurrency(item.entradasProjetadas)}</td>
                    <td className="p-3 text-right text-rose-500">{formatCurrency(item.saidasProjetadas)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.saldoAcumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

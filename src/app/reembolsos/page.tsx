'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Receipt, CheckCircle2, Clock, Briefcase, RefreshCw } from 'lucide-react';

export default function ReembolsosPage() {
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/relatorios/reembolsaveis').then((r) => r.json());
      setDados(res.reembolsaveis);
    } catch (err) {
      console.error('Erro ao carregar despesas reembolsáveis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleToggleReembolso = async (id: string, atual: boolean) => {
    try {
      await fetch('/api/financeiro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reembolsado: !atual }),
      });
      carregarDados();
    } catch (err) {
      console.error(err);
    }
  };

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
              <Receipt className="w-6 h-6 text-amber-500" />
              Custas Processuais & Reembolsos de Clientes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Controle rigoroso de despesas adiantadas pelo escritório (DARE, perícias, correspondentes) vs. reembolsos recebidos.
            </p>
          </div>

          <button
            onClick={carregarDados}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Total Adiantado pelo Escritório</span>
            <p className="text-xl font-mono font-extrabold text-slate-900 mt-1">{formatCurrency(dados?.totalAdiantado)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Total já Reembolsado pelo Cliente</span>
            <p className="text-xl font-mono font-extrabold text-emerald-600 mt-1">{formatCurrency(dados?.totalReembolsado)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Saldo Pendente a Reembolsar</span>
            <p className="text-xl font-mono font-extrabold text-amber-600 mt-1">{formatCurrency(dados?.saldoAReembolsar)}</p>
          </div>
        </div>

        {/* Tabela de Custas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
            Lançamentos de Custas e Despesas Vinculadas a Clientes
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3">Despesa / Custa</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Processo Judicial</th>
                  <th className="p-3">Data</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-center">Status do Reembolso</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dados?.despesas?.length > 0 ? (
                  dados.despesas.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">{item.titulo}</td>
                      <td className="p-3 text-slate-700">{item.cliente}</td>
                      <td className="p-3 font-mono text-slate-500">{item.processo}</td>
                      <td className="p-3 font-mono text-slate-500">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(item.valor)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            item.reembolsado
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.reembolsado ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {item.reembolsado ? 'Ressarcido' : 'Pendente de Reembolso'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleReembolso(item.id, item.reembolsado)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                            item.reembolsado
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {item.reembolsado ? 'Marcar como Pendente' : 'Marcar como Ressarcido'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                      Nenhuma despesa reembolsável cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

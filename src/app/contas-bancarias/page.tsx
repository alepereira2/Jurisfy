'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Landmark, Lock, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ContasBancariasPage() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contaBloqueio, setContaBloqueio] = useState<any | null>(null);
  const [dataBloqueio, setDataBloqueio] = useState('');
  const [modalNovaConta, setModalNovaConta] = useState(false);
  const [novaConta, setNovaConta] = useState({ nomeBanco: '', agencia: '', conta: '', tipo: 'CORRENTE', saldoInicial: '' });
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregarContas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contas-bancarias').then((r) => r.json());
      setContas(res.contas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContas();
  }, []);

  const handleSalvarFechamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaBloqueio) return;

    try {
      const res = await fetch('/api/contas-bancarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'FECHAMENTO_MENSAL',
          id: contaBloqueio.id,
          fechamentoDataBloqueio: dataBloqueio,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSucesso(data.message);
      setTimeout(() => setSucesso(null), 3000);
      setContaBloqueio(null);
      carregarContas();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleCriarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contas-bancarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaConta),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSucesso(data.message);
      setTimeout(() => setSucesso(null), 3000);
      setModalNovaConta(false);
      setNovaConta({ nomeBanco: '', agencia: '', conta: '', tipo: 'CORRENTE', saldoInicial: '' });
      carregarContas();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="w-6 h-6 text-amber-500" />
              Contas Bancárias & Fechamento Retroativo
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de contas correntes, caixas físicos e bloqueio de movimentações retroativas para fechamento contábil.
            </p>
          </div>

          <button
            onClick={() => setModalNovaConta(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Conta Bancária
          </button>
        </div>

        {sucesso && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Grid de Contas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {c.tipo}
                  </span>
                  {c.fechamentoDataBloqueio && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Bloqueado até {new Date(c.fechamentoDataBloqueio).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2">{c.nomeBanco}</h3>
                {c.agencia && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Ag: {c.agencia} | CC: {c.conta}
                  </p>
                )}

                <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Saldo Atual em Caixa:</span>
                  <span className="text-xl font-mono font-extrabold text-emerald-600">
                    {formatCurrency(c.saldoAtual)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Inicial: {formatCurrency(c.saldoInicial)}
                </span>
                <button
                  onClick={() => {
                    setContaBloqueio(c);
                    setDataBloqueio(c.fechamentoDataBloqueio ? new Date(c.fechamentoDataBloqueio).toISOString().split('T')[0] : '');
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Lock className="w-3.5 h-3.5" /> Fechamento Mensal
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Fechamento Mensal Retroativo */}
        {contaBloqueio && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Fechamento Contábil Mensal
                  </h2>
                  <p className="text-xs text-slate-400">{contaBloqueio.nomeBanco}</p>
                </div>
              </div>

              <form onSubmit={handleSalvarFechamento} className="p-6 space-y-4 text-xs">
                <p className="text-slate-600">
                  Defina a data limite para fechamento. O sistema irá **bloquear estritamente qualquer lançamento ou alteração com data anterior** a esta data, garantindo a integridade dos relatórios e conciliações passadas.
                </p>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Data Limite de Fechamento (Bloqueio Retroativo)</label>
                  <input
                    type="date"
                    required
                    value={dataBloqueio}
                    onChange={(e) => setDataBloqueio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setContaBloqueio(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    Aplicar Bloqueio Mensal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Criar Nova Conta */}
        {modalNovaConta && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <h2 className="text-base font-bold">Cadastrar Conta Bancária ou Caixa</h2>
              </div>

              <form onSubmit={handleCriarConta} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nome do Banco / Conta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Santander PJ ou Caixa Escritório"
                    value={novaConta.nomeBanco}
                    onChange={(e) => setNovaConta({ ...novaConta, nomeBanco: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Agência</label>
                    <input
                      type="text"
                      placeholder="0001"
                      value={novaConta.agencia}
                      onChange={(e) => setNovaConta({ ...novaConta, agencia: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Conta Corrente</label>
                    <input
                      type="text"
                      placeholder="12345-6"
                      value={novaConta.conta}
                      onChange={(e) => setNovaConta({ ...novaConta, conta: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Tipo de Conta</label>
                    <select
                      value={novaConta.tipo}
                      onChange={(e) => setNovaConta({ ...novaConta, tipo: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="CORRENTE">Conta Corrente PJ</option>
                      <option value="APLICACAO">Aplicação / Investimento</option>
                      <option value="CAIXA">Caixa Físico / Pequeno Caixa</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Saldo Inicial (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={novaConta.saldoInicial}
                      onChange={(e) => setNovaConta({ ...novaConta, saldoInicial: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalNovaConta(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm"
                  >
                    Cadastrar Conta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

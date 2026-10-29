'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ConciliacaoBancaria } from '@/components/ConciliacaoBancaria';
import { Landmark, RefreshCw } from 'lucide-react';

export default function ConciliacaoPage() {
  const [extratos, setExtratos] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clientesProcessos, setClientesProcessos] = useState<any[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<string>('TODAS');
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resConc, resAux, resContas] = await Promise.all([
        fetch(`/api/conciliacao?contaBancariaId=${contaSelecionada}`).then((r) => r.json()),
        fetch('/api/auxiliar').then((r) => r.json()),
        fetch('/api/contas-bancarias').then((r) => r.json()),
      ]);

      setExtratos(resConc.extratos || []);
      setLancamentos(resConc.lancamentos || []);
      setCentrosCusto(resAux.centrosCusto || []);
      setCategorias(resAux.categorias || []);
      setClientesProcessos(resAux.clientesProcessos || []);
      setContasBancarias(resContas.contas || []);
    } catch (err) {
      console.error('Erro ao carregar conciliação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [contaSelecionada]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Filtro de Conta Bancária */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Filtrar por Conta Bancária:</span>
            <select
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
            >
              <option value="TODAS">Todas as Contas e Caixas</option>
              {contasBancarias.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.nomeBanco} (Saldo: R$ {cb.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={carregarDados}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Componente Lado a Lado de Conciliação */}
        <ConciliacaoBancaria
          extratoInicial={extratos}
          lancamentosIniciais={lancamentos}
          contasBancarias={contasBancarias}
          centrosCusto={centrosCusto}
          categorias={categorias}
          clientesProcessos={clientesProcessos}
          onReload={carregarDados}
        />
      </main>
    </div>
  );
}

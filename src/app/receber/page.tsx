'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import {
  TrendingUp,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Printer,
  Trash2,
  Briefcase,
  ArrowDownCircle,
  CheckSquare,
  Square,
  FileCheck2
} from 'lucide-react';
import { ModalLancamento } from '@/components/ModalLancamento';
import { ModalBaixa } from '@/components/ModalBaixa';

export default function ContasAReceberPage() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [auxiliar, setAuxiliar] = useState<any>({ centrosCusto: [], categorias: [], contasBancarias: [], clientesProcessos: [] });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [status, setStatus] = useState('TODOS');
  const [centroCustoId, setCentroCustoId] = useState('TODOS');
  const [busca, setBusca] = useState('');

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [itemParaBaixa, setItemParaBaixa] = useState<any | null>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tipo: 'RECEBER',
        status,
        centroCustoId,
        busca,
      });

      const [resLanc, resAux] = await Promise.all([
        fetch(`/api/financeiro?${params}`).then((r) => r.json()),
        fetch('/api/auxiliar').then((r) => r.json()),
      ]);

      setLancamentos(resLanc.lancamentos || []);
      setAuxiliar(resAux);
    } catch (err) {
      console.error('Erro ao carregar recebíveis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [status, centroCustoId, busca]);

  const toggleSelecionar = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selecionarTodos = () => {
    if (selecionados.length === lancamentos.length) {
      setSelecionados([]);
    } else {
      setSelecionados(lancamentos.map((l) => l.id));
    }
  };

  const handleBaixaEmLote = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Confirmar liquidação em lote de ${selecionados.length} honorários recebíveis?`)) return;

    try {
      const res = await fetch('/api/financeiro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'BAIXA_LOTE',
          ids: selecionados,
          dataPagamento: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message);
      setSelecionados([]);
      carregarDados();
    } catch (err: any) {
      alert(`Erro na baixa em lote: ${err.message}`);
    }
  };

  const handleEmitirRecibo = (l: any) => {
    const conteudo = `
      ==============================================================
                    RECIBO FINANCEIRO DE HONORÁRIOS
      ==============================================================
      Escritório Jurídico Jurisfy ERP
      CNPJ: 00.000.000/0001-00
      
      Recebemos de: ${l.clienteProcesso?.nomeCliente || l.fornecedorOuCliente}
      CPF/CNPJ: ${l.clienteProcesso?.cpfCnpj || 'Consulte cadastro'}
      A quantia de: R$ ${(l.valorLiquido || l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      Referente a: ${l.titulo}
      Pasta/Processo: ${l.clienteProcesso?.numeroProcesso || 'Assessoria Geral'}
      Competência: ${new Date(l.dataCompetencia).toLocaleDateString('pt-BR')}
      Data de Liquidação: ${l.dataPagamento ? new Date(l.dataPagamento).toLocaleDateString('pt-BR') : 'Pendente'}
      
      Retenções na Fonte:
      - ISS: R$ ${(l.retencaoIss || 0).toFixed(2)}
      - IRRF: R$ ${(l.retencaoIrrf || 0).toFixed(2)}
      - PIS/COFINS/CSLL: R$ ${(l.retencaoPisCofinsCsll || 0).toFixed(2)}
      
      ==============================================================
      Emitido via Jurisfy ERP Financeiro em ${new Date().toLocaleDateString('pt-BR')}
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family: monospace; font-size: 14px; padding: 30px;">${conteudo}</pre>`);
      win.document.title = `Recibo_${l.id}`;
      win.print();
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja excluir este honorário?')) return;
    try {
      const res = await fetch(`/api/financeiro?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      carregarDados();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalAberto = lancamentos
    .filter((l) => ['PENDENTE', 'PREVISTO', 'ATRASADO'].includes(l.status))
    .reduce((acc, l) => acc + l.valor, 0);

  const totalRecebido = lancamentos
    .filter((l) => l.status === 'PAGO')
    .reduce((acc, l) => acc + (l.valorLiquido || l.valor), 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              Contas a Receber (Honorários Jurídicos)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Honorários fixos, êxito, sucumbência, pastas de clientes e retenções tributárias na fonte.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selecionados.length > 0 && (
              <button
                onClick={handleBaixaEmLote}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                <ArrowDownCircle className="w-4 h-4" />
                Baixar em Lote ({selecionados.length})
              </button>
            )}

            <button
              onClick={() => setModalNovoAberto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Honorário / Recebível
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Honorários Pendentes / Em Aberto</span>
            <p className="text-xl font-mono font-extrabold text-amber-600 mt-1">{formatCurrency(totalAberto)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Honorários Liquidados (Recebidos)</span>
            <p className="text-xl font-mono font-extrabold text-emerald-600 mt-1">{formatCurrency(totalRecebido)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Quantidade de Títulos</span>
            <p className="text-xl font-mono font-extrabold text-slate-800 mt-1">{lancamentos.length} recebíveis</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente, título, processo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-700"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago / Recebido</option>
              <option value="ATRASADO">Atrasado (Inadimplente)</option>
              <option value="CANCELADO">Cancelado</option>
            </select>

            <select
              value={centroCustoId}
              onChange={(e) => setCentroCustoId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-700"
            >
              <option value="TODOS">Todas as Áreas / Centros de Custo</option>
              {auxiliar.centrosCusto?.map((cc: any) => (
                <option key={cc.id} value={cc.id}>
                  {cc.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3 w-10">
                    <button onClick={selecionarTodos} className="text-slate-400 hover:text-slate-600">
                      {selecionados.length === lancamentos.length && lancamentos.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Honorário / Contrato</th>
                  <th className="p-3">Cliente & Processo</th>
                  <th className="p-3">Área (Centro de Custo)</th>
                  <th className="p-3">Competência</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3 text-right">Valor Bruto</th>
                  <th className="p-3 text-right">Valor Líquido</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                      Nenhum honorário encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  lancamentos.map((l) => {
                    const isSelected = selecionados.includes(l.id);
                    const isPago = l.status === 'PAGO';
                    const isAtrasado = l.status === 'ATRASADO';

                    return (
                      <tr key={l.id} className={`hover:bg-slate-50/70 ${isSelected ? 'bg-amber-50/40' : ''}`}>
                        <td className="p-3">
                          <button onClick={() => toggleSelecionar(l.id)} className="text-slate-400 hover:text-slate-600">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{l.titulo}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {l.numeroDocumento || 'Sem NF'} • {l.categoria?.nome}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">
                            {l.clienteProcesso?.nomeCliente || l.fornecedorOuCliente}
                          </p>
                          {l.clienteProcesso?.numeroProcesso && (
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-slate-400" /> {l.clienteProcesso.numeroProcesso}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {l.centroCusto?.nome}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {new Date(l.dataCompetencia).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {new Date(l.dataVencimento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(l.valor)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(l.valorLiquido || l.valor)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                              isPago
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isAtrasado
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEmitirRecibo(l)}
                              title="Emitir Recibo / Faturamento"
                              className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {!isPago && (
                              <button
                                onClick={() => setItemParaBaixa(l)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                              >
                                Baixar
                              </button>
                            )}
                            <button
                              onClick={() => handleExcluir(l.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modais */}
      {modalNovoAberto && (
        <ModalLancamento
          tipoPadrao="RECEBER"
          centrosCusto={auxiliar.centrosCusto || []}
          categorias={auxiliar.categorias || []}
          contasBancarias={auxiliar.contasBancarias || []}
          clientesProcessos={auxiliar.clientesProcessos || []}
          onClose={() => setModalNovoAberto(false)}
          onSuccess={() => {
            setModalNovoAberto(false);
            carregarDados();
          }}
        />
      )}

      {itemParaBaixa && (
        <ModalBaixa
          lancamento={itemParaBaixa}
          contasBancarias={auxiliar.contasBancarias || []}
          onClose={() => setItemParaBaixa(null)}
          onSuccess={() => {
            setItemParaBaixa(null);
            carregarDados();
          }}
        />
      )}
    </div>
  );
}

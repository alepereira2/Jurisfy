'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ArrowRightLeft,
  AlertCircle,
  PlusCircle,
  Search,
  Check,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  UploadCloud,
  Sparkles,
  Building
} from 'lucide-react';
import { ModalExtratoUpload } from './ModalExtratoUpload';
import { ModalAvulso } from './ModalAvulso';

export interface ExtratoItem {
  id: string;
  fitId: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'CREDIT' | 'DEBIT';
  conciliado: boolean;
  contaNome?: string;
}

export interface LancamentoItem {
  id: string;
  titulo: string;
  clienteOuFornecedor: string;
  centroCusto: string;
  dataVencimento: string;
  valor: number;
  tipo: 'RECEBER' | 'PAGAR';
  conciliado: boolean;
}

interface ConciliacaoBancariaProps {
  extratoInicial: ExtratoItem[];
  lancamentosIniciais: LancamentoItem[];
  contasBancarias: any[];
  centrosCusto: any[];
  categorias: any[];
  clientesProcessos: any[];
  onReload: () => void;
}

export const ConciliacaoBancaria: React.FC<ConciliacaoBancariaProps> = ({
  extratoInicial,
  lancamentosIniciais,
  contasBancarias,
  centrosCusto,
  categorias,
  clientesProcessos,
  onReload,
}) => {
  const [extrato, setExtrato] = useState<ExtratoItem[]>(extratoInicial);
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>(lancamentosIniciais);

  const [selectedExtratoId, setSelectedExtratoId] = useState<string | null>(null);
  const [selectedLancamentoId, setSelectedLancamentoId] = useState<string | null>(null);

  const [buscaExtrato, setBuscaExtrato] = useState('');
  const [buscaLancamento, setBuscaLancamento] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Modais
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [itemParaAvulso, setItemParaAvulso] = useState<ExtratoItem | null>(null);

  // Atualiza estado local quando as props mudarem
  React.useEffect(() => {
    setExtrato(extratoInicial);
    setLancamentos(lancamentosIniciais);
  }, [extratoInicial, lancamentosIniciais]);

  // Filtra itens pendentes de conciliação
  const extratosPendentes = useMemo(() => {
    return extrato.filter(
      (e) => !e.conciliado && e.descricao.toLowerCase().includes(buscaExtrato.toLowerCase())
    );
  }, [extrato, buscaExtrato]);

  const lancamentosPendentes = useMemo(() => {
    return lancamentos.filter(
      (l) =>
        !l.conciliado &&
        (l.titulo.toLowerCase().includes(buscaLancamento.toLowerCase()) ||
          l.clienteOuFornecedor.toLowerCase().includes(buscaLancamento.toLowerCase()))
    );
  }, [lancamentos, buscaLancamento]);

  const itemExtratoSelecionado = extrato.find((e) => e.id === selectedExtratoId);
  const itemLancamentoSelecionado = lancamentos.find((l) => l.id === selectedLancamentoId);

  // Verifica compatibilidade de valores e natureza (crédito vs receber, débito vs pagar)
  const isMatchValido = useMemo(() => {
    if (!itemExtratoSelecionado || !itemLancamentoSelecionado) return false;

    const valorExtratoAbs = Math.abs(itemExtratoSelecionado.valor);
    const valorLancamentoAbs = Math.abs(itemLancamentoSelecionado.valor);
    const mesmoValor = Math.abs(valorExtratoAbs - valorLancamentoAbs) < 0.01;

    const mesmaDirecao =
      (itemExtratoSelecionado.tipo === 'CREDIT' && itemLancamentoSelecionado.tipo === 'RECEBER') ||
      (itemExtratoSelecionado.tipo === 'DEBIT' && itemLancamentoSelecionado.tipo === 'PAGAR');

    return mesmoValor && mesmaDirecao;
  }, [itemExtratoSelecionado, itemLancamentoSelecionado]);

  // Detector de correspondências sugeridas automáticas
  const sugerirPar = (ext: ExtratoItem) => {
    const valAbs = Math.abs(ext.valor);
    return lancamentosPendentes.find((l) => {
      const matchValor = Math.abs(Math.abs(l.valor) - valAbs) < 0.01;
      const matchTipo = (ext.tipo === 'CREDIT' && l.tipo === 'RECEBER') || (ext.tipo === 'DEBIT' && l.tipo === 'PAGAR');
      return matchValor && matchTipo;
    });
  };

  const handleEfetivarConciliacao = async () => {
    if (!selectedExtratoId || !selectedLancamentoId || !isMatchValido) return;

    setLoading(true);
    try {
      const res = await fetch('/api/conciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extratoId: selectedExtratoId,
          lancamentoId: selectedLancamentoId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na conciliação');

      setMensagemSucesso('Conciliação efetivada e lançamento financeiro liquidado com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 4000);

      onReload();
      setSelectedExtratoId(null);
      setSelectedLancamentoId(null);
    } catch (err: any) {
      alert(`Falha na conciliação: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex flex-col gap-4 w-full min-h-[calc(100vh-140px)] bg-slate-50 p-6 rounded-2xl border border-slate-200">
      {/* Barra de Ação Superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Conciliação Bancária Jurídica</h2>
            <p className="text-xs text-slate-500">
              Selecione uma transação do extrato e o lançamento financeiro correspondente para vincular com 1 clique.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalUploadAberto(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            Importar Extrato (.OFX / .CSV)
          </button>

          {itemExtratoSelecionado && itemLancamentoSelecionado && (
            <div className="flex items-center gap-2 text-xs">
              {isMatchValido ? (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5" /> Valores e naturezas compatíveis
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" /> Divergência de valores ou natureza
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleEfetivarConciliacao}
            disabled={!isMatchValido || loading}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${
              isMatchValido && !loading
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar Vínculo
          </button>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Grid de 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Painel Esquerdo: Extrato Bancário */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Extrato Bancário (Importado)
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {extratosPendentes.length} movimentações pendentes
              </span>
            </div>
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar no extrato..."
                value={buscaExtrato}
                onChange={(e) => setBuscaExtrato(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 max-h-[580px]">
            {extratosPendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
                <span>Nenhuma transação bancária pendente de conciliação.</span>
                <button
                  onClick={() => setModalUploadAberto(true)}
                  className="mt-2 text-indigo-600 hover:underline font-semibold"
                >
                  Importar novo arquivo OFX ou CSV
                </button>
              </div>
            ) : (
              extratosPendentes.map((item) => {
                const isSelected = selectedExtratoId === item.id;
                const isDebit = item.tipo === 'DEBIT';
                const parSugerido = sugerirPar(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedExtratoId(isSelected ? null : item.id);
                      if (!isSelected && parSugerido) {
                        setSelectedLancamentoId(parSugerido.id);
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                        : 'hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl flex-shrink-0 ${
                          isDebit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {isDebit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.descricao}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                          <span>{item.data}</span>
                          <span>•</span>
                          <span>FITID: {item.fitId.slice(-10)}</span>
                          {item.contaNome && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 font-sans">{item.contaNome}</span>
                            </>
                          )}
                        </div>
                        {parSugerido && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Correspondência encontrada no ERP</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      <p
                        className={`text-xs font-bold font-mono ${
                          isDebit ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isDebit ? '-' : '+'} {formatCurrency(Math.abs(item.valor))}
                      </p>
                      <button
                        title="Criar lançamento express para tarifas bancárias, rendimentos ou taxas"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemParaAvulso(item);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 justify-end mt-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Lançar Avulso
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Lançamentos do ERP */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Lançamentos Financeiros (ERP)
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {lancamentosPendentes.length} em aberto
              </span>
            </div>
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente, título..."
                value={buscaLancamento}
                onChange={(e) => setBuscaLancamento(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 max-h-[580px]">
            {lancamentosPendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                Nenhum lançamento financeiro pendente encontrado no ERP.
              </div>
            ) : (
              lancamentosPendentes.map((item) => {
                const isSelected = selectedLancamentoId === item.id;
                const isPagar = item.tipo === 'PAGAR';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedLancamentoId(isSelected ? null : item.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                        : 'hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.titulo}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.clienteOuFornecedor}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>Venc: {item.dataVencimento}</span>
                        <span>•</span>
                        <span className="bg-slate-100 font-sans text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                          {item.centroCusto}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      <p
                        className={`text-xs font-bold font-mono ${
                          isPagar ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(Math.abs(item.valor))}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                          isPagar ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {item.tipo}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {modalUploadAberto && (
        <ModalExtratoUpload
          contasBancarias={contasBancarias}
          onClose={() => setModalUploadAberto(false)}
          onSuccess={() => {
            setModalUploadAberto(false);
            onReload();
          }}
        />
      )}

      {itemParaAvulso && (
        <ModalAvulso
          extratoItem={itemParaAvulso}
          centrosCusto={centrosCusto}
          categorias={categorias}
          clientesProcessos={clientesProcessos}
          onClose={() => setItemParaAvulso(null)}
          onSuccess={() => {
            setItemParaAvulso(null);
            onReload();
          }}
        />
      )}
    </div>
  );
};

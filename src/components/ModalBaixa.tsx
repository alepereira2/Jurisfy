'use client';

import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, DollarSign, Calculator } from 'lucide-react';

interface Props {
  lancamento: any;
  contasBancarias: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalBaixa: React.FC<Props> = ({
  lancamento,
  contasBancarias,
  onClose,
  onSuccess,
}) => {
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [contaBancariaId, setContaBancariaId] = useState(contasBancarias[0]?.id || '');
  const [valorJuros, setValorJuros] = useState('0');
  const [valorMulta, setValorMulta] = useState('0');
  const [valorDesconto, setValorDesconto] = useState('0');
  const [retencaoIss, setRetencaoIss] = useState('0');
  const [retencaoIrrf, setRetencaoIrrf] = useState('0');
  const [retencaoPisCofinsCsll, setRetencaoPisCofinsCsll] = useState('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valorOriginal = lancamento.valor || 0;
  const isReceber = lancamento.tipo === 'RECEBER';

  // Cálculo reativo do valor líquido
  const valorLiquido = useMemo(() => {
    const juros = parseFloat(valorJuros) || 0;
    const multa = parseFloat(valorMulta) || 0;
    const desc = parseFloat(valorDesconto) || 0;
    const iss = parseFloat(retencaoIss) || 0;
    const irrf = parseFloat(retencaoIrrf) || 0;
    const pis = parseFloat(retencaoPisCofinsCsll) || 0;

    let total = valorOriginal + juros + multa - desc;
    if (isReceber) {
      total -= (iss + irrf + pis);
    }
    return Math.max(0, total);
  }, [valorOriginal, valorJuros, valorMulta, valorDesconto, retencaoIss, retencaoIrrf, retencaoPisCofinsCsll, isReceber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/financeiro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lancamento.id,
          acao: 'BAIXA',
          dataPagamento,
          contaBancariaId,
          valorJuros: parseFloat(valorJuros) || 0,
          valorMulta: parseFloat(valorMulta) || 0,
          valorDesconto: parseFloat(valorDesconto) || 0,
          retencaoIss: parseFloat(retencaoIss) || 0,
          retencaoIrrf: parseFloat(retencaoIrrf) || 0,
          retencaoPisCofinsCsll: parseFloat(retencaoPisCofinsCsll) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao efetivar baixa financeira.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Liquidação / Baixa Financeira
            </h2>
            <p className="text-xs text-slate-400">
              {lancamento.titulo} • Valor Original: R$ {valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Data de Liquidação */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Data de Liquidação (Caixa) *</label>
              <input
                type="date"
                required
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Conta Bancária */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Conta Bancária *</label>
              <select
                required
                value={contaBancariaId}
                onChange={(e) => setContaBancariaId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {contasBancarias.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.nomeBanco}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ajustes: Juros, Multa, Desconto */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Acréscimos e Descontos
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block">Juros (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorJuros}
                  onChange={(e) => setValorJuros(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Multa (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorMulta}
                  onChange={(e) => setValorMulta(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorDesconto}
                  onChange={(e) => setValorDesconto(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white font-mono text-rose-600"
                />
              </div>
            </div>
          </div>

          {/* Retenções Tributárias na Fonte (exclusivo para Contas a Receber) */}
          {isReceber && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Retenções de Impostos na Fonte
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-amber-800 block">Retenção ISS (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retencaoIss}
                    onChange={(e) => setRetencaoIss(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-amber-300 rounded-md bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-800 block">Retenção IRRF (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retencaoIrrf}
                    onChange={(e) => setRetencaoIrrf(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-amber-300 rounded-md bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-800 block">PIS/COFINS/CSLL (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retencaoPisCofinsCsll}
                    onChange={(e) => setRetencaoPisCofinsCsll(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-amber-300 rounded-md bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Card Resumo do Valor Líquido Efetivo */}
          <div className="p-4 bg-slate-900 rounded-xl text-white flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Valor Líquido Efetivo (Caixa)</span>
              <span className="text-xl font-extrabold font-mono text-amber-400">
                R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span>{isReceber ? 'Entrada em conta bancária' : 'Débito da conta bancária'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Processando...' : 'Confirmar Liquidação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

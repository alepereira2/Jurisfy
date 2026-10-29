'use client';

import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  extratoItem: any;
  centrosCusto: any[];
  categorias: any[];
  clientesProcessos: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalAvulso: React.FC<Props> = ({
  extratoItem,
  centrosCusto,
  categorias,
  clientesProcessos,
  onClose,
  onSuccess,
}) => {
  const isCredit = extratoItem.tipo === 'CREDIT';
  const categoriasFiltradas = categorias.filter((c) =>
    isCredit ? c.tipo === 'RECEITA' : c.tipo !== 'RECEITA'
  );

  const [categoriaId, setCategoriaId] = useState(categoriasFiltradas[0]?.id || categorias[0]?.id || '');
  const [centroCustoId, setCentroCustoId] = useState(centrosCusto[0]?.id || '');
  const [clienteProcessoId, setClienteProcessoId] = useState('');
  const [observacao, setObservacao] = useState('Lançamento avulso gerado a partir do extrato bancário');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/conciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'AVULSO',
          extratoId: extratoItem.id,
          categoriaId,
          centroCustoId,
          clienteProcessoId: clienteProcessoId || undefined,
          observacao,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar lançamento avulso.');
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-amber-400" />
              Lançamento Express do Extrato
            </h2>
            <p className="text-xs text-slate-400">
              Crie a despesa/receita e vincule à conciliação em 1 clique.
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

          {/* Dados do Extrato */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Transação:</span>
              <span className="font-semibold text-slate-800">{extratoItem.descricao}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data:</span>
              <span className="font-mono text-slate-700">{extratoItem.data}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Valor da Movimentação:</span>
              <span className={`font-mono font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isCredit ? '+' : '-'} R$ {Math.abs(extratoItem.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Categoria / Plano de Contas */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Plano de Contas / Categoria DRE *</label>
            <select
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {categoriasFiltradas.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.codigo} - {cat.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Centro de Custo */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Centro de Custo (Área Jurídica) *</label>
            <select
              required
              value={centroCustoId}
              onChange={(e) => setCentroCustoId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {centrosCusto.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.nome} ({cc.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Pasta / Processo (Opcional) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Vínculo com Cliente / Processo (Opcional)</label>
            <select
              value={clienteProcessoId}
              onChange={(e) => setClienteProcessoId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">Nenhum processo vinculado (Geral)</option>
              {clientesProcessos.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.nomeCliente} {cp.numeroProcesso ? `(${cp.numeroProcesso})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Observação */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Observação da Conciliação</label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
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
              {loading ? 'Salvando...' : 'Lançar e Conciliar Agora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

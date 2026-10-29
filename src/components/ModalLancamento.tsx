'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  tipoPadrao: 'PAGAR' | 'RECEBER';
  centrosCusto: any[];
  categorias: any[];
  contasBancarias: any[];
  clientesProcessos: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalLancamento: React.FC<Props> = ({
  tipoPadrao,
  centrosCusto,
  categorias,
  contasBancarias,
  clientesProcessos,
  onClose,
  onSuccess,
}) => {
  const [tipo, setTipo] = useState<'PAGAR' | 'RECEBER'>(tipoPadrao);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fornecedorOuCliente, setFornecedorOuCliente] = useState('');
  const [valor, setValor] = useState('');
  const [dataCompetencia, setDataCompetencia] = useState(new Date().toISOString().split('T')[0]);
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [dataPagamento, setDataPagamento] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '');
  const [centroCustoId, setCentroCustoId] = useState(centrosCusto[0]?.id || '');
  const [contaBancariaId, setContaBancariaId] = useState(contasBancarias[0]?.id || '');
  const [clienteProcessoId, setClienteProcessoId] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [ehReembolsavel, setEhReembolsavel] = useState(false);

  // Rateio por múltiplos centros de custo
  const [mostrarRateio, setMostrarRateio] = useState(false);
  const [rateios, setRateios] = useState<{ centroCustoId: string; percentual: number }[]>([
    { centroCustoId: centrosCusto[0]?.id || '', percentual: 100 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const categoriasFiltradas = categorias.filter((c) =>
    tipo === 'RECEBER' ? c.tipo === 'RECEITA' : c.tipo !== 'RECEITA'
  );

  const handleAddRateio = () => {
    setRateios([...rateios, { centroCustoId: centrosCusto[0]?.id || '', percentual: 0 }]);
  };

  const handleRemoveRateio = (index: number) => {
    setRateios(rateios.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        tipo,
        titulo,
        descricao,
        fornecedorOuCliente,
        valor: parseFloat(valor),
        dataCompetencia,
        dataVencimento,
        dataPagamento: dataPagamento || null,
        categoriaId: categoriaId || categoriasFiltradas[0]?.id,
        centroCustoId,
        contaBancariaId: dataPagamento ? contaBancariaId : null,
        clienteProcessoId: clienteProcessoId || null,
        numeroDocumento,
        ehReembolsavel,
      };

      if (mostrarRateio && rateios.length > 1) {
        const totalPerc = rateios.reduce((acc, r) => acc + (parseFloat(r.percentual as any) || 0), 0);
        if (Math.abs(totalPerc - 100) > 0.01) {
          setError(`A soma dos percentuais de rateio deve ser 100%. Total atual: ${totalPerc}%`);
          setLoading(false);
          return;
        }
        payload.rateios = rateios;
      }

      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar lançamento.');
      }

      setSucessoMsg(data.message || 'Lançamento salvo com sucesso!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold">
              {tipo === 'RECEBER' ? 'Novo Honorário / Recebível' : 'Nova Despesa / Contas a Pagar'}
            </h2>
            <p className="text-xs text-slate-400">
              Preencha os dados contábeis com apuração dupla (Competência e Caixa).
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

          {sucessoMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{sucessoMsg}</span>
            </div>
          )}

          {/* Tipo Selector */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTipo('RECEBER')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                tipo === 'RECEBER' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contas a Receber (Honorários)
            </button>
            <button
              type="button"
              onClick={() => setTipo('PAGAR')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                tipo === 'PAGAR' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contas a Pagar (Despesa / Custo)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Título / Descrição Principal *</label>
              <input
                type="text"
                required
                placeholder="Ex: Honorários Retainer Contratual ou Aluguel"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Valor */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Valor Bruto (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Cliente ou Fornecedor */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {tipo === 'RECEBER' ? 'Cliente / Devedor' : 'Fornecedor / Favorecido'}
              </label>
              <input
                type="text"
                placeholder={tipo === 'RECEBER' ? 'Nome do Cliente / Empresa' : 'Nome do Fornecedor / Cartório'}
                value={fornecedorOuCliente}
                onChange={(e) => setFornecedorOuCliente(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Vínculo com Pasta / Processo Judicial */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Pasta / Processo Judicial (Opcional)</label>
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
                    {cat.codigo} - {cat.nome} ({cat.grupoDre})
                  </option>
                ))}
              </select>
            </div>

            {/* Centro de Custo Principal */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Centro de Custo (Área) *</label>
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

            {/* Data de Competência (Fato Gerador) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Data de Competência (Fato Gerador) *</label>
              <input
                type="date"
                required
                value={dataCompetencia}
                onChange={(e) => setDataCompetencia(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Data de Vencimento */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Data de Vencimento *</label>
              <input
                type="date"
                required
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Documento / NF */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nº do Documento / Nota Fiscal</label>
              <input
                type="text"
                placeholder="NF-0012, Recibo, Guia DARE..."
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Despesa Reembolsável Checkbox */}
            {tipo === 'PAGAR' && (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="reembolsavel"
                  checked={ehReembolsavel}
                  onChange={(e) => setEhReembolsavel(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="reembolsavel" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Despesa reembolsável pelo cliente (custas, diligências)
                </label>
              </div>
            )}
          </div>

          {/* Liquidação Imediata (Opcional) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Liquidação Imediata (Regime de Caixa)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Data de Pagamento / Liquidação (se já pago)</label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              {dataPagamento && (
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Conta Bancária de Liquidação</label>
                  <select
                    value={contaBancariaId}
                    onChange={(e) => setContaBancariaId(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {contasBancarias.map((cb) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.nomeBanco} (Saldo: R$ {cb.saldoAtual.toLocaleString('pt-BR')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
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
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition-all"
            >
              {loading ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

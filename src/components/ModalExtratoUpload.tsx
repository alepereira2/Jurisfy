'use client';

import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';

interface Props {
  contasBancarias: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalExtratoUpload: React.FC<Props> = ({
  contasBancarias,
  onClose,
  onSuccess,
}) => {
  const [contaBancariaId, setContaBancariaId] = useState(contasBancarias[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !contaBancariaId) {
      setError('Selecione um arquivo de extrato (.ofx ou .csv) e a conta bancária de destino.');
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contaBancariaId', contaBancariaId);

      const res = await fetch('/api/extratos', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar extrato bancário.');
      }

      setResultado(data);
      setTimeout(() => {
        onSuccess();
      }, 1500);
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
              <UploadCloud className="w-5 h-5 text-amber-400" />
              Importar Extrato Bancário
            </h2>
            <p className="text-xs text-slate-400">
              Formatos suportados: OFX (SGML/XML) e CSV com proteção antifalsificação por FITID.
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

          {resultado && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Extrato Importado com Sucesso!</span>
              </div>
              <p>• {resultado.importadas} transações importadas com sucesso.</p>
              <p>• {resultado.duplicadas} transações duplicadas prevenidas pelo FITID único.</p>
              {resultado.saldoAtualizado && (
                <p>• Saldo oficial atualizado para: R$ {resultado.saldoAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              )}
            </div>
          )}

          {/* Selecionar Conta */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Conta Bancária de Destino *</label>
            <select
              required
              value={contaBancariaId}
              onChange={(e) => setContaBancariaId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {contasBancarias.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.nomeBanco} {cb.agencia ? `(Ag: ${cb.agencia} / CC: ${cb.conta})` : ''} - Saldo: R$ {cb.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {/* Arquivo Upload Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Arquivo do Extrato (.OFX ou .CSV) *</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-amber-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="extratoFileInput"
              />
              <label htmlFor="extratoFileInput" className="cursor-pointer flex flex-col items-center">
                <FileText className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">
                  {file ? file.name : 'Clique para selecionar ou arraste o arquivo aqui'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Suporta arquivos .OFX e .CSV de qualquer banco'}
                </span>
              </label>
            </div>
          </div>

          {/* Botões de Amostra para Teste Rápido */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <span>Arquivos de amostra para teste:</span>
            <div className="flex gap-2">
              <a
                href="/sample-extrato.ofx"
                download
                className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Download className="w-3 h-3" /> Amostra OFX
              </a>
              <span>•</span>
              <a
                href="/sample-extrato.csv"
                download
                className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Download className="w-3 h-3" /> Amostra CSV
              </a>
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
              Fechar
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
                file && !loading
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              {loading ? 'Processando Arquivo...' : 'Importar Extrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

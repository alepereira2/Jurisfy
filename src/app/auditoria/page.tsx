'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ShieldCheck, RefreshCw, Clock, User, Info } from 'lucide-react';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auditoria').then((r) => r.json());
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
              Logs de Auditoria & Conformidade
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Rastreabilidade completa de ações críticas (quem criou, alterou, aprovou, conciliou ou excluiu lançamentos com IP e timestamp).
            </p>
          </div>

          <button
            onClick={carregarLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Logs
          </button>
        </div>

        {/* Tabela de Auditoria */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3">Data & Hora</th>
                  <th className="p-3">Usuário</th>
                  <th className="p-3 text-center">Ação</th>
                  <th className="p-3">Módulo</th>
                  <th className="p-3">Detalhes do Evento</th>
                  <th className="p-3 text-right">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Nenhum log de auditoria registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {log.usuarioEmail || 'Sistema / Convidado'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.acao === 'CRIACAO'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : log.acao === 'APROVACAO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.acao === 'EXCLUSAO'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : log.acao === 'CONCILIACAO'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.acao}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 font-medium">
                        {log.modulo}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-[11px] truncate max-w-xs">
                        {log.detalhes || '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Users, Shield, Check, X, Edit, Save, AlertCircle } from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resUsers, resAux] = await Promise.all([
        fetch('/api/usuarios').then((r) => r.json()),
        fetch('/api/auxiliar').then((r) => r.json()),
      ]);
      setUsuarios(resUsers.usuarios || []);
      setCentrosCusto(resAux.centrosCusto || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    setSalvando(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usuarioEditando.id,
          role: usuarioEditando.role,
          limiteValorAprovacao: usuarioEditando.limiteValorAprovacao,
          centroCustoId: usuarioEditando.centroCustoId,
          ativo: usuarioEditando.ativo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSucesso('Parâmetros e alçada do usuário atualizados com sucesso!');
      setTimeout(() => setSucesso(null), 3000);
      setUsuarioEditando(null);
      carregarDados();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSalvando(false);
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
              <Users className="w-6 h-6 text-amber-500" />
              Gestão de Usuários, Alçadas & RBAC
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuração de permissões granulares, teto monetário para lançamentos/aprovações e restrição por Centro de Custo.
            </p>
          </div>
        </div>

        {sucesso && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <th className="p-3">Usuário & E-mail</th>
                  <th className="p-3">Perfil de Acesso</th>
                  <th className="p-3">Restrição de Centro de Custo</th>
                  <th className="p-3 text-right">Alçada de Aprovação</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{u.nome}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'MASTER'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'MASTER' ? 'Master (Full Access)' : 'Custom (Restrito)'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-slate-700">
                        {u.centroCustoNome ? u.centroCustoNome : 'Todas as Áreas (Sem restrição)'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {u.role === 'MASTER' ? (
                        <span className="text-emerald-600">ILIMITADA</span>
                      ) : u.limiteValorAprovacao ? (
                        <span className="text-slate-800">{formatCurrency(u.limiteValorAprovacao)}</span>
                      ) : (
                        <span className="text-slate-400">Sem teto</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setUsuarioEditando(u)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Edição de Usuário / Alçada */}
        {usuarioEditando && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold">Editar Perfil & Alçada de Aprovação</h2>
                  <p className="text-xs text-slate-400">{usuarioEditando.nome}</p>
                </div>
                <button onClick={() => setUsuarioEditando(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSalvar} className="p-6 space-y-4 text-xs">
                {/* Perfil */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Perfil de Acesso</label>
                  <select
                    value={usuarioEditando.role}
                    onChange={(e) => setUsuarioEditando({ ...usuarioEditando, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="MASTER">Master (Acesso irrestrito a todos módulos e valores)</option>
                    <option value="CUSTOM">Custom (Restrito a regras de alçada e centro de custo)</option>
                  </select>
                </div>

                {/* Restrição de Centro de Custo */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Restrição de Centro de Custo (Opcional)</label>
                  <select
                    value={usuarioEditando.centroCustoId || ''}
                    onChange={(e) => setUsuarioEditando({ ...usuarioEditando, centroCustoId: e.target.value || null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Sem restrição (Acesso a todos os centros)</option>
                    {centrosCusto.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.nome} ({cc.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alçada Monetária */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Alçada Máxima de Aprovação / Lançamento (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 25000.00"
                    value={usuarioEditando.limiteValorAprovacao || ''}
                    onChange={(e) => setUsuarioEditando({ ...usuarioEditando, limiteValorAprovacao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400">
                    Lançamentos criados acima deste valor serão retidos no status "Em Aprovação".
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUsuarioEditando(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-5 py-2 font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Parâmetros'}
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

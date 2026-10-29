'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Lock, Mail, ShieldCheck, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<'LOGIN' | '2FA'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [otpDebug, setOtpDebug] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Seletores rápidos de credenciais de teste para demonstração imediata
  const preencherCredenciais = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMensagem(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
      }

      setUsuarioId(data.usuarioId);
      setOtpDebug(data.otpDebug);
      setMensagem(data.message);
      setStep('2FA');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId, codigoOtp: otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Código 2FA inválido');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Banner Superior com Identidade Jurídica */}
        <div className="bg-slate-900 px-8 pt-8 pb-6 text-center text-white relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 mb-3">
            <Scale className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">JURISFY ERP</h1>
          <p className="text-xs text-amber-400 font-medium mt-0.5 tracking-wider uppercase">
            Gestão Financeira & Contábil para Advocacia
          </p>
        </div>

        {/* Formulário */}
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mensagem && (
            <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{mensagem}</span>
            </div>
          )}

          {step === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="advogado@escritorio.adv.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Senha Segura</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Continuar para Verificação 2FA
              </button>

              {/* Contas de Demonstração pré-configuradas */}
              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700 mb-2">Acesso Rápido para Demonstração:</p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => preencherCredenciais('master@jurisfy.com.br', 'Senha@123456')}
                    className="text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <span className="font-bold text-slate-800">1. Administrador Master:</span> master@jurisfy.com.br
                  </button>
                  <button
                    type="button"
                    onClick={() => preencherCredenciais('carlos@jurisfy.com.br', 'Senha@123456')}
                    className="text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <span className="font-bold text-slate-800">2. Sócio Gestor (Alçada R$ 25k):</span> carlos@jurisfy.com.br
                  </button>
                  <button
                    type="button"
                    onClick={() => preencherCredenciais('financeiro@jurisfy.com.br', 'Senha@123456')}
                    className="text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <span className="font-bold text-slate-800">3. Financeiro Pleno (Alçada R$ 3k):</span> financeiro@jurisfy.com.br
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Autenticação de Dois Fatores (2FA)</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Digite o código numérico de 6 dígitos enviado para seu e-mail cadastrado.
                </p>
              </div>

              {/* Caixa com código OTP em modo Demonstração */}
              {otpDebug && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    Código OTP Gerado (Simulação de E-mail):
                  </span>
                  <span className="text-xl font-mono font-extrabold text-amber-900 tracking-widest">
                    {otpDebug}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtp(otpDebug)}
                    className="block mx-auto mt-1 text-[11px] font-semibold text-amber-800 underline hover:text-amber-950"
                  >
                    Preencher automaticamente
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 text-center block">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center font-mono text-2xl font-bold tracking-widest py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md ${
                  otp.length === 6 && !loading
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {loading ? 'Validando 2FA...' : 'Confirmar e Acessar ERP'}
              </button>

              <button
                type="button"
                onClick={() => setStep('LOGIN')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
              >
                Voltar para o login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

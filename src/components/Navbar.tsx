'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Scale,
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Clock,
  Receipt,
  Landmark,
  Building2,
  DollarSign
} from 'lucide-react';

interface UserInfo {
  id: string;
  nome: string;
  email: string;
  role: 'MASTER' | 'CUSTOM';
  limiteValorAprovacao?: number | null;
  centroCustoNome?: string | null;
}

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jurisfy_session') : null;
    const headers: Record<string, string> = {};
    if (token) headers['x-jurisfy-token'] = token;

    fetch('/api/auth/me', { headers })
      .then((res) => {
        if (!res.ok) {
          if (pathname !== '/login') router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {
        if (pathname !== '/login') router.push('/login');
      });
  }, [pathname, router]);

  const handleLogout = async () => {
    localStorage.removeItem('jurisfy_session');
    document.cookie = 'jurisfy_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const navLinks = [
    { label: 'Painel BI', href: '/', icon: LayoutDashboard },
    { label: 'A Pagar', href: '/pagar', icon: TrendingDown },
    { label: 'A Receber', href: '/receber', icon: TrendingUp },
    { label: 'Conciliação', href: '/conciliacao', icon: ArrowRightLeft },
    { label: 'DRE Contábil', href: '/dre', icon: FileSpreadsheet },
  ];

  const relatorioLinks = [
    { label: 'Fluxo de Caixa', href: '/fluxo-caixa', icon: DollarSign },
    { label: 'Inadimplência (Aging)', href: '/inadimplencia', icon: Clock },
    { label: 'Despesas e Reembolsos', href: '/reembolsos', icon: Receipt },
  ];

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Scale className="w-6 h-6 text-slate-950" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    JURISFY
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ERP
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  FINANCEIRO JURÍDICO
                </span>
              </div>
            </Link>

            {/* Navigation Menus */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}

              {/* Submenu Relatórios */}
              <div className="relative">
                <button
                  onClick={() => setRelatoriosOpen(!relatoriosOpen)}
                  onBlur={() => setTimeout(() => setRelatoriosOpen(false), 200)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ['/fluxo-caixa', '/inadimplencia', '/reembolsos'].includes(pathname)
                      ? 'bg-slate-800 text-amber-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Relatórios</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {relatoriosOpen && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    {relatorioLinks.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <SubIcon className="w-4 h-4 text-amber-400" />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gestão Master */}
              {user?.role === 'MASTER' && (
                <>
                  <Link
                    href="/usuarios"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/usuarios'
                        ? 'bg-slate-800 text-amber-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Usuários & Alçadas
                  </Link>
                  <Link
                    href="/contas-bancarias"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === '/contas-bancarias'
                        ? 'bg-slate-800 text-amber-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    Contas & Bloqueios
                  </Link>
                </>
              )}

              <Link
                href="/auditoria"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/auditoria'
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Auditoria
              </Link>
            </nav>
          </div>

          {/* User Profile & Session info */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 250)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-slate-600 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                    {user.nome.charAt(0)}
                  </div>
                  <div className="hidden lg:flex flex-col">
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                      {user.nome}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-mono px-1 rounded bg-slate-900 border border-slate-700 text-amber-300">
                        {user.role}
                      </span>
                      {user.centroCustoNome && (
                        <span className="text-slate-400 truncate max-w-[90px]">
                          {user.centroCustoNome}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-3 z-50 text-xs">
                    <div className="px-4 pb-3 border-b border-slate-800">
                      <p className="font-semibold text-slate-200">{user.nome}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.email}</p>
                      <div className="mt-2 flex flex-col gap-1 text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Perfil:</span>
                          <span className="font-bold text-amber-400">{user.role}</span>
                        </div>
                        {user.centroCustoNome && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Centro de Custo:</span>
                            <span className="text-slate-200">{user.centroCustoNome}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Alçada de Aprovação:</span>
                          <span className="font-medium text-emerald-400">
                            {user.role === 'MASTER'
                              ? 'ILIMITADA (Master)'
                              : user.limiteValorAprovacao
                              ? `R$ ${user.limiteValorAprovacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : 'Sem teto definido'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors font-medium text-xs"
                      >
                        <LogOut className="w-4 h-4" />
                        Encerrar Sessão
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-md transition-all"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

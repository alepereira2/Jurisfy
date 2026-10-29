import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export interface UserSession {
  id: string;
  nome: string;
  email: string;
  role: 'MASTER' | 'CUSTOM';
  limiteValorAprovacao?: number | null;
  centroCustoId?: string | null;
  centroCustoNome?: string | null;
  permissoes?: Record<string, {
    podeLer: boolean;
    podeEscrever: boolean;
    podeDeletar: boolean;
    podeAprovar: boolean;
    podeExportar: boolean;
  }>;
}

/**
 * Criptografa senha com bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Valida senha contra hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gera OTP de 6 dígitos numéricos com validade parametrizável (padrão 10 minutos)
 */
export async function gerarOTP(usuarioId: string, validadeMinutos: number = 10): Promise<{ codigo: string; expiracao: Date }> {
  // Invalida OTPs anteriores não utilizados
  await prisma.autenticacao2FA.updateMany({
    where: { usuarioId, utilizado: false },
    data: { utilizado: true },
  });

  // Gera código aleatório de 6 dígitos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expiracao = new Date(Date.now() + validadeMinutos * 60 * 1000);

  await prisma.autenticacao2FA.create({
    data: {
      usuarioId,
      codigoOtp: codigo,
      expiracao,
      utilizado: false,
    },
  });

  return { codigo, expiracao };
}

/**
 * Valida o código OTP informado pelo usuário
 */
export async function validarOTP(usuarioId: string, codigo: string): Promise<boolean> {
  const agora = new Date();

  const registro = await prisma.autenticacao2FA.findFirst({
    where: {
      usuarioId,
      codigoOtp: codigo.trim(),
      utilizado: false,
      expiracao: { gte: agora },
    },
    orderBy: { criadoEm: 'desc' },
  });

  if (!registro) {
    return false;
  }

  // Marca como utilizado
  await prisma.autenticacao2FA.update({
    where: { id: registro.id },
    data: { utilizado: true },
  });

  return true;
}

/**
 * Registra log de auditoria
 */
export async function registrarLogAuditoria({
  usuarioId,
  usuarioEmail,
  acao,
  modulo,
  registroId,
  detalhes,
  ip = '127.0.0.1',
}: {
  usuarioId?: string;
  usuarioEmail?: string;
  acao: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'APROVACAO' | 'CONCILIACAO' | 'LOGIN' | '2FA';
  modulo: string;
  registroId?: string;
  detalhes?: Record<string, any> | string;
  ip?: string;
}) {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId,
        usuarioEmail,
        acao,
        modulo,
        registroId,
        detalhes: typeof detalhes === 'object' ? JSON.stringify(detalhes) : detalhes,
        ip,
      },
    });
  } catch (error) {
    console.error('Falha ao registrar log de auditoria:', error);
  }
}

/**
 * Carrega a sessão completa do usuário com regras RBAC
 */
export async function getUsuarioComPermissoes(usuarioId: string): Promise<UserSession | null> {
  const user = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      centroCusto: true,
      permissoes: true,
    },
  });

  if (!user || !user.ativo) return null;

  const permissoesMap: Record<string, any> = {};
  for (const p of user.permissoes) {
    permissoesMap[p.modulo] = {
      podeLer: p.podeLer,
      podeEscrever: p.podeEscrever,
      podeDeletar: p.podeDeletar,
      podeAprovar: p.podeAprovar,
      podeExportar: p.podeExportar,
    };
  }

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role as 'MASTER' | 'CUSTOM',
    limiteValorAprovacao: user.limiteValorAprovacao,
    centroCustoId: user.centroCustoId,
    centroCustoNome: user.centroCusto?.nome || null,
    permissoes: permissoesMap,
  };
}

/**
 * Verifica se o usuário tem autorização para uma operação
 */
export function verificarPermissao(
  user: UserSession,
  modulo: string,
  acao: 'ler' | 'escrever' | 'deletar' | 'aprovar' | 'exportar',
  valorOperacao?: number,
  centroCustoOperacaoId?: string
): { permitido: boolean; motivo?: string } {
  // Usuário Master possui acesso irrestrito
  if (user.role === 'MASTER') {
    return { permitido: true };
  }

  // Restrição por Centro de Custo
  if (user.centroCustoId && centroCustoOperacaoId && user.centroCustoId !== centroCustoOperacaoId) {
    return {
      permitido: false,
      motivo: `Acesso negado: Usuário restrito ao centro de custo ${user.centroCustoNome || user.centroCustoId}.`,
    };
  }

  // Restrição por Alçada de Valor
  if (
    valorOperacao !== undefined &&
    user.limiteValorAprovacao !== null &&
    user.limiteValorAprovacao !== undefined &&
    valorOperacao > user.limiteValorAprovacao
  ) {
    return {
      permitido: false,
      motivo: `Operação excede sua alçada máxima autorizada de R$ ${user.limiteValorAprovacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Requer aprovação de usuário Master ou Gestor.`,
    };
  }

  // Permissões modulares
  const perm = user.permissoes?.[modulo];
  if (!perm) {
    // Permite leitura básica se não parametrizado, mas bloqueia ações críticas
    if (acao === 'ler') return { permitido: true };
    return { permitido: false, motivo: `Sem permissão configurada para o módulo ${modulo}.` };
  }

  switch (acao) {
    case 'ler':
      return { permitido: perm.podeLer };
    case 'escrever':
      return { permitido: perm.podeEscrever, motivo: perm.podeEscrever ? undefined : 'Sem permissão de criação/edição.' };
    case 'deletar':
      return { permitido: perm.podeDeletar, motivo: perm.podeDeletar ? undefined : 'Sem permissão de exclusão.' };
    case 'aprovar':
      return { permitido: perm.podeAprovar, motivo: perm.podeAprovar ? undefined : 'Sem permissão de aprovação.' };
    case 'exportar':
      return { permitido: perm.podeExportar, motivo: perm.podeExportar ? undefined : 'Sem permissão de exportação.' };
    default:
      return { permitido: false };
  }
}

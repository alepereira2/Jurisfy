import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { registrarLogAuditoria, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const usuarios = await prisma.usuario.findMany({
      include: {
        centroCusto: true,
        permissoes: true,
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({
      usuarios: usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        ativo: u.ativo,
        limiteValorAprovacao: u.limiteValorAprovacao,
        centroCustoId: u.centroCustoId,
        centroCustoNome: u.centroCusto?.nome,
        permissoes: u.permissoes,
        criadoEm: u.criadoEm,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== 'MASTER') {
      return NextResponse.json({ error: 'Apenas usuários Master podem alterar permissões e alçadas.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, role, limiteValorAprovacao, centroCustoId, ativo, permissoes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: {
        role: role !== undefined ? role : undefined,
        limiteValorAprovacao: limiteValorAprovacao !== undefined ? (limiteValorAprovacao ? parseFloat(limiteValorAprovacao) : null) : undefined,
        centroCustoId: centroCustoId !== undefined ? (centroCustoId || null) : undefined,
        ativo: ativo !== undefined ? Boolean(ativo) : undefined,
      },
    });

    // Atualização de permissões modulares
    if (permissoes && Array.isArray(permissoes)) {
      for (const p of permissoes) {
        await prisma.permissaoUsuario.upsert({
          where: {
            usuarioId_modulo: {
              usuarioId: id,
              modulo: p.modulo,
            },
          },
          update: {
            podeLer: Boolean(p.podeLer),
            podeEscrever: Boolean(p.podeEscrever),
            podeDeletar: Boolean(p.podeDeletar),
            podeAprovar: Boolean(p.podeAprovar),
            podeExportar: Boolean(p.podeExportar),
          },
          create: {
            usuarioId: id,
            modulo: p.modulo,
            podeLer: Boolean(p.podeLer),
            podeEscrever: Boolean(p.podeEscrever),
            podeDeletar: Boolean(p.podeDeletar),
            podeAprovar: Boolean(p.podeAprovar),
            podeExportar: Boolean(p.podeExportar),
          },
        });
      }
    }

    await registrarLogAuditoria({
      usuarioId: currentUser.id,
      usuarioEmail: currentUser.email,
      acao: 'EDICAO',
      modulo: 'USUARIOS',
      registroId: id,
      detalhes: {
        role,
        limiteValorAprovacao,
        centroCustoId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Permissões e parâmetros do usuário atualizados com sucesso!',
      usuario: usuarioAtualizado,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do usuário' }, { status: 500 });
  }
}

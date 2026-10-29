import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const [centrosCusto, categorias, contasBancarias, clientesProcessos] = await Promise.all([
      prisma.centroCusto.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
      prisma.categoriaPlanoContas.findMany({ where: { ativo: true }, orderBy: { codigo: 'asc' } }),
      prisma.contaBancaria.findMany({ where: { ativo: true }, orderBy: { nomeBanco: 'asc' } }),
      prisma.clienteProcesso.findMany({ where: { ativo: true }, orderBy: { nomeCliente: 'asc' } }),
    ]);

    return NextResponse.json({
      centrosCusto,
      categorias,
      contasBancarias,
      clientesProcessos,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao carregar dados auxiliares' }, { status: 500 });
  }
}

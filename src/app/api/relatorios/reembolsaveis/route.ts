import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { calcularDespesasReembolsaveis } from '@/lib/accounting-engine';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const reembolsaveis = await calcularDespesasReembolsaveis();

    return NextResponse.json({ reembolsaveis });
  } catch (error: any) {
    console.error('Erro ao consultar despesas reembolsáveis:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório de reembolsos' }, { status: 500 });
  }
}

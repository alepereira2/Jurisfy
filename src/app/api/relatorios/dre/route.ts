import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { calcularDRE, RegimeContabil } from '@/lib/accounting-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const regime = (searchParams.get('regime') || 'COMPETENCIA').toUpperCase() as RegimeContabil;
    const dataInicio = searchParams.get('dataInicio') || undefined;
    const dataFim = searchParams.get('dataFim') || undefined;
    const centroCustoId = searchParams.get('centroCustoId') || undefined;
    const contaBancariaId = searchParams.get('contaBancariaId') || undefined;

    const dre = await calcularDRE({
      regime,
      dataInicio,
      dataFim,
      centroCustoId: user.role !== 'MASTER' && user.centroCustoId ? user.centroCustoId : centroCustoId,
      contaBancariaId,
    });

    return NextResponse.json({ dre });
  } catch (error: any) {
    console.error('Erro ao calcular DRE:', error);
    return NextResponse.json({ error: 'Erro ao gerar Demonstrativo de Resultado' }, { status: 500 });
  }
}

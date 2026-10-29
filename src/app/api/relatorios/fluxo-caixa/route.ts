import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { calcularFluxoDeCaixa } from '@/lib/accounting-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dataInicioStr = searchParams.get('dataInicio');
    const dataFimStr = searchParams.get('dataFim');

    const dtInicio = dataInicioStr ? new Date(dataInicioStr) : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const dtFim = dataFimStr ? new Date(dataFimStr) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

    const fluxo = await calcularFluxoDeCaixa(dtInicio, dtFim);

    return NextResponse.json({ fluxo });
  } catch (error: any) {
    console.error('Erro ao calcular fluxo de caixa:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório de Fluxo de Caixa' }, { status: 500 });
  }
}

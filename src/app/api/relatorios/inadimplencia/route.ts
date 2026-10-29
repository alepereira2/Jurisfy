import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { calcularAgingListInadimplencia } from '@/lib/accounting-engine';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const aging = await calcularAgingListInadimplencia();

    return NextResponse.json({ aging });
  } catch (error: any) {
    console.error('Erro ao consultar aging list de inadimplência:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório de inadimplência' }, { status: 500 });
  }
}

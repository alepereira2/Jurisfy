import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

let isSeeding = false;

export async function ensureDatabaseSeeded() {
  if (isSeeding) return;

  try {
    const userCount = await prisma.usuario.count();
    if (userCount > 0) return;

    isSeeding = true;
    console.log('[AUTO-SEED] Inicializando banco de dados no Vercel/Serverless...');

    const senhaHash = await bcrypt.hash('Senha@123456', 10);

    // Centros de Custo
    const ccTrabalhista = await prisma.centroCusto.create({
      data: { codigo: 'CC-TRAB', nome: 'Trabalhista', descricao: 'Direito do Trabalho Individual e Coletivo' },
    });
    const ccCivel = await prisma.centroCusto.create({
      data: { codigo: 'CC-CIV', nome: 'Cível & Contratos', descricao: 'Contencioso Cível, Família e Contratos' },
    });
    const ccTributario = await prisma.centroCusto.create({
      data: { codigo: 'CC-TRIB', nome: 'Tributário & Societário', descricao: 'Planejamento Tributário e M&A' },
    });
    const ccOperacional = await prisma.centroCusto.create({
      data: { codigo: 'CC-ADM', nome: 'Administrativo & Operacional', descricao: 'Operações Gerais e Gestão do Escritório' },
    });

    // Categorias DRE
    const catHonContratuais = await prisma.categoriaPlanoContas.create({
      data: { codigo: '1.1', nome: 'Honorários Contratuais Fixos (Pro Labore)', tipo: 'RECEITA', grupoDre: 'RECEITA_BRUTA' },
    });
    const catHonExito = await prisma.categoriaPlanoContas.create({
      data: { codigo: '1.2', nome: 'Honorários de Êxito / Sucumbência', tipo: 'RECEITA', grupoDre: 'RECEITA_BRUTA' },
    });
    const catAluguel = await prisma.categoriaPlanoContas.create({
      data: { codigo: '4.2', nome: 'Aluguel e Condomínio do Escritório', tipo: 'DESPESA', grupoDre: 'DESPESA_OPERACIONAL' },
    });
    const catSoftwareTI = await prisma.categoriaPlanoContas.create({
      data: { codigo: '4.3', nome: 'Softwares Jurídicos, Nuvem e TI', tipo: 'DESPESA', grupoDre: 'DESPESA_OPERACIONAL' },
    });

    // Contas
    const contaItau = await prisma.contaBancaria.create({
      data: {
        nomeBanco: 'Banco Itaú Personnalité PJ',
        agencia: '0450',
        conta: '45892-1',
        tipo: 'CORRENTE',
        saldoInicial: 125000,
        saldoAtual: 148500,
      },
    });

    // Usuários
    await prisma.usuario.create({
      data: {
        nome: 'Administrador Master',
        email: 'master@jurisfy.com.br',
        senhaHash,
        role: 'MASTER',
        ativo: true,
      },
    });

    await prisma.usuario.create({
      data: {
        nome: 'Dr. Carlos Mendes (Sócio Gestor)',
        email: 'carlos@jurisfy.com.br',
        senhaHash,
        role: 'CUSTOM',
        limiteValorAprovacao: 25000,
        centroCustoId: ccTributario.id,
        ativo: true,
      },
    });

    await prisma.usuario.create({
      data: {
        nome: 'Juliana Castro (Financeiro Pleno)',
        email: 'financeiro@jurisfy.com.br',
        senhaHash,
        role: 'CUSTOM',
        limiteValorAprovacao: 3000,
        centroCustoId: ccOperacional.id,
        ativo: true,
      },
    });

    console.log('[AUTO-SEED] Banco de dados auto-populado com sucesso!');
  } catch (err) {
    console.warn('[AUTO-SEED] Aviso na auto-inicialização:', err);
  } finally {
    isSeeding = false;
  }
}

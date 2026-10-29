import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed do ERP Jurisfy ---');

  // Limpeza prévia
  await prisma.conciliacao.deleteMany();
  await prisma.extratoBancario.deleteMany();
  await prisma.rateioLancamento.deleteMany();
  await prisma.lancamentoFinanceiro.deleteMany();
  await prisma.permissaoUsuario.deleteMany();
  await prisma.autenticacao2FA.deleteMany();
  await prisma.logAuditoria.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.clienteProcesso.deleteMany();
  await prisma.categoriaPlanoContas.deleteMany();
  await prisma.centroCusto.deleteMany();
  await prisma.contaBancaria.deleteMany();

  // 1. Centros de Custo
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

  // 2. Plano de Contas (com grupos DRE)
  const catHonContratuais = await prisma.categoriaPlanoContas.create({
    data: { codigo: '1.1', nome: 'Honorários Contratuais Fixos (Pro Labore)', tipo: 'RECEITA', grupoDre: 'RECEITA_BRUTA' },
  });
  const catHonExito = await prisma.categoriaPlanoContas.create({
    data: { codigo: '1.2', nome: 'Honorários de Êxito / Sucumbência', tipo: 'RECEITA', grupoDre: 'RECEITA_BRUTA' },
  });
  const catReembolsoCustas = await prisma.categoriaPlanoContas.create({
    data: { codigo: '1.3', nome: 'Reembolso de Despesas Processuais', tipo: 'RECEITA', grupoDre: 'RECEITA_BRUTA' },
  });
  const catImpostosServicos = await prisma.categoriaPlanoContas.create({
    data: { codigo: '2.1', nome: 'Impostos e Deduções (ISS / Simples Nacional)', tipo: 'DESPESA', grupoDre: 'DEDUCOES_IMPOSTOS' },
  });
  const catCustasJudiciais = await prisma.categoriaPlanoContas.create({
    data: { codigo: '3.1', nome: 'Custas Judiciais e Emolumentos', tipo: 'CUSTO', grupoDre: 'CUSTO_DIRETO' },
  });
  const catCorrespondentes = await prisma.categoriaPlanoContas.create({
    data: { codigo: '3.2', nome: 'Correspondentes Jurídicos & Diligências', tipo: 'CUSTO', grupoDre: 'CUSTO_DIRETO' },
  });
  const catPericias = await prisma.categoriaPlanoContas.create({
    data: { codigo: '3.3', nome: 'Perícias e Pareceres Técnicos', tipo: 'CUSTO', grupoDre: 'CUSTO_DIRETO' },
  });
  const catFolhaPagamento = await prisma.categoriaPlanoContas.create({
    data: { codigo: '4.1', nome: 'Folha de Pagamento & Pró-Labore', tipo: 'DESPESA', grupoDre: 'DESPESA_OPERACIONAL' },
  });
  const catAluguel = await prisma.categoriaPlanoContas.create({
    data: { codigo: '4.2', nome: 'Aluguel e Condomínio do Escritório', tipo: 'DESPESA', grupoDre: 'DESPESA_OPERACIONAL' },
  });
  const catSoftwareTI = await prisma.categoriaPlanoContas.create({
    data: { codigo: '4.3', nome: 'Softwares Jurídicos, Nuvem e TI', tipo: 'DESPESA', grupoDre: 'DESPESA_OPERACIONAL' },
  });
  const catMarketing = await prisma.categoriaPlanoContas.create({
    data: { codigo: '4.4', nome: 'Marketing Jurídico, Publicações e Eventos', tipo: 'DESPESA', grupoDre: 'DESPESA_OPERACIONAL' },
  });
  const catRendimentos = await prisma.categoriaPlanoContas.create({
    data: { codigo: '5.1', nome: 'Rendimentos de Aplicações Financeiras', tipo: 'RECEITA', grupoDre: 'RESULTADO_FINANCEIRO' },
  });
  const catTarifas = await prisma.categoriaPlanoContas.create({
    data: { codigo: '5.2', nome: 'Tarifas Bancárias e Juros', tipo: 'DESPESA', grupoDre: 'RESULTADO_FINANCEIRO' },
  });

  // 3. Contas Bancárias
  const contaItau = await prisma.contaBancaria.create({
    data: {
      nomeBanco: 'Banco Itaú Personnalité PJ',
      agencia: '0450',
      conta: '45892-1',
      tipo: 'CORRENTE',
      saldoInicial: 125000,
      saldoAtual: 148500,
      fechamentoDataBloqueio: new Date('2026-08-31'),
    },
  });
  const contaBB = await prisma.contaBancaria.create({
    data: {
      nomeBanco: 'Banco do Brasil Jurídico',
      agencia: '3210-9',
      conta: '12093-8',
      tipo: 'CORRENTE',
      saldoInicial: 84200,
      saldoAtual: 92400,
    },
  });
  const contaAplicacao = await prisma.contaBancaria.create({
    data: {
      nomeBanco: 'Fundo DI Liquidez Jurisfy',
      tipo: 'APLICACAO',
      saldoInicial: 250000,
      saldoAtual: 258600,
    },
  });
  const contaCaixa = await prisma.contaBancaria.create({
    data: {
      nomeBanco: 'Caixa Físico Escritório',
      tipo: 'CAIXA',
      saldoInicial: 4500,
      saldoAtual: 3800,
    },
  });

  // 4. Clientes & Processos Jurídicos
  const cliAlfa = await prisma.clienteProcesso.create({
    data: {
      nomeCliente: 'Construtora Alfa S.A.',
      cpfCnpj: '12.345.678/0001-90',
      email: 'juridico@construtoraalfa.com.br',
      telefone: '(11) 3450-8900',
      numeroProcesso: '0012450-89.2024.8.26.0100',
      areaAtuacao: 'Cível',
      advogadoResponsavel: 'Dr. Carlos Mendes',
    },
  });
  const cliLogistica = await prisma.clienteProcesso.create({
    data: {
      nomeCliente: 'Logística Express Ltda.',
      cpfCnpj: '98.765.432/0001-11',
      email: 'contato@logisticaexpress.com.br',
      telefone: '(11) 4567-1234',
      numeroProcesso: '0004521-12.2023.5.02.0045',
      areaAtuacao: 'Trabalhista',
      advogadoResponsavel: 'Dra. Mariana Souza',
    },
  });
  const cliMetalurgica = await prisma.clienteProcesso.create({
    data: {
      nomeCliente: 'Indústria Metalúrgica Beta',
      cpfCnpj: '45.890.123/0001-55',
      email: 'tributario@metalurgicabeta.com.br',
      telefone: '(11) 2341-9876',
      numeroProcesso: '5003290-77.2023.4.03.6100',
      areaAtuacao: 'Tributário',
      advogadoResponsavel: 'Dr. Roberto Mendes',
    },
  });
  const cliTech = await prisma.clienteProcesso.create({
    data: {
      nomeCliente: 'TechVenture Soluções Digitais',
      cpfCnpj: '33.222.111/0001-09',
      email: 'financeiro@techventure.io',
      telefone: '(11) 98765-4321',
      numeroProcesso: 'Assessoria Contratual M&A',
      areaAtuacao: 'Cível',
      advogadoResponsavel: 'Dr. Carlos Mendes',
    },
  });

  // 5. Usuários e RBAC
  const senhaHash = await bcrypt.hash('Senha@123456', 10);

  // Usuário Master
  const userMaster = await prisma.usuario.create({
    data: {
      nome: 'Administrador Master',
      email: 'master@jurisfy.com.br',
      senhaHash,
      role: 'MASTER',
      ativo: true,
    },
  });

  // Gestor Tributário com alçada de R$ 25.000
  const userCarlos = await prisma.usuario.create({
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

  // Operacional Financeiro com alçada de R$ 3.000
  const userFinanceiro = await prisma.usuario.create({
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

  // Permissões modulares para Juliana Financeiro
  const modulos = ['PAGAR', 'RECEBER', 'CONCILIACAO', 'RELATORIOS', 'DRE', 'BI'];
  for (const mod of modulos) {
    await prisma.permissaoUsuario.create({
      data: {
        usuarioId: userFinanceiro.id,
        modulo: mod,
        podeLer: true,
        podeEscrever: true,
        podeDeletar: false,
        podeAprovar: false,
        podeExportar: true,
      },
    });
  }

  // 6. Lançamentos Financeiros (Pagar e Receber)
  // Receitas de Honorários
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  // Recebimentos Liquidados
  const lRec1 = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'RECEBER',
      titulo: 'Honorários Mensais - Retainer Contratual',
      fornecedorOuCliente: 'Construtora Alfa S.A.',
      valor: 18500,
      valorLiquido: 18500,
      dataCompetencia: new Date(anoAtual, mesAtual, 5),
      dataVencimento: new Date(anoAtual, mesAtual, 10),
      dataPagamento: new Date(anoAtual, mesAtual, 10),
      status: 'PAGO',
      contaBancariaId: contaItau.id,
      clienteProcessoId: cliAlfa.id,
      categoriaId: catHonContratuais.id,
      centroCustoId: ccCivel.id,
      numeroDocumento: 'NF-2026/0412',
    },
  });

  const lRec2 = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'RECEBER',
      titulo: 'Honorários de Êxito - Mandado de Segurança Tributário',
      fornecedorOuCliente: 'Indústria Metalúrgica Beta',
      valor: 45000,
      valorLiquido: 45000,
      dataCompetencia: new Date(anoAtual, mesAtual, 2),
      dataVencimento: new Date(anoAtual, mesAtual, 15),
      dataPagamento: new Date(anoAtual, mesAtual, 14),
      status: 'PAGO',
      contaBancariaId: contaItau.id,
      clienteProcessoId: cliMetalurgica.id,
      categoriaId: catHonExito.id,
      centroCustoId: ccTributario.id,
      numeroDocumento: 'REC-2026/089',
    },
  });

  // Recebimentos Pendentes / Futuros
  const lRec3 = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'RECEBER',
      titulo: 'Honorários Mensais - Assessoria Jurídica Trabalhista',
      fornecedorOuCliente: 'Logística Express Ltda.',
      valor: 12000,
      valorLiquido: 12000,
      dataCompetencia: new Date(anoAtual, mesAtual, 1),
      dataVencimento: new Date(anoAtual, mesAtual, 25),
      status: 'PENDENTE',
      clienteProcessoId: cliLogistica.id,
      categoriaId: catHonContratuais.id,
      centroCustoId: ccTrabalhista.id,
      numeroDocumento: 'NF-2026/0425',
    },
  });

  // Título Inadimplente (> 40 dias de atraso)
  const lRecAtrasado1 = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'RECEBER',
      titulo: 'Honorários Contratuais Pendentes - Competência Anterior',
      fornecedorOuCliente: 'TechVenture Soluções Digitais',
      valor: 9500,
      valorLiquido: 9500,
      dataCompetencia: new Date(anoAtual, mesAtual - 2, 10),
      dataVencimento: new Date(anoAtual, mesAtual - 1, 10), // Venceu mês passado
      status: 'ATRASADO',
      clienteProcessoId: cliTech.id,
      categoriaId: catHonContratuais.id,
      centroCustoId: ccCivel.id,
      numeroDocumento: 'NF-2026/0310',
    },
  });

  const lRecAtrasado2 = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'RECEBER',
      titulo: 'Custas e Honorários Iniciais de Ação',
      fornecedorOuCliente: 'Logística Express Ltda.',
      valor: 6800,
      valorLiquido: 6800,
      dataCompetencia: new Date(anoAtual, mesAtual - 3, 5),
      dataVencimento: new Date(anoAtual, mesAtual - 2, 5), // Venceu há 60+ dias
      status: 'ATRASADO',
      clienteProcessoId: cliLogistica.id,
      categoriaId: catHonExito.id,
      centroCustoId: ccTrabalhista.id,
      numeroDocumento: 'NF-2026/0189',
    },
  });

  // Despesas Operacionais e Custos Diretos
  // Despesa Reembolsável (Custas pagas pelo escritório para ressarcimento pelo cliente)
  await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'PAGAR',
      titulo: 'Guia DARE - Custas de Preparo Recurso Especial',
      fornecedorOuCliente: 'Tribunal de Justiça de SP',
      valor: 3420,
      valorLiquido: 3420,
      dataCompetencia: new Date(anoAtual, mesAtual, 8),
      dataVencimento: new Date(anoAtual, mesAtual, 9),
      dataPagamento: new Date(anoAtual, mesAtual, 9),
      status: 'PAGO',
      contaBancariaId: contaItau.id,
      clienteProcessoId: cliAlfa.id,
      categoriaId: catCustasJudiciais.id,
      centroCustoId: ccCivel.id,
      ehReembolsavel: true,
      reembolsado: false, // Ainda não reembolsado pelo cliente Alfa!
      numeroDocumento: 'DARE-987123',
    },
  });

  // Despesa Reembolsável já reembolsada
  await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'PAGAR',
      titulo: 'Laudo Pericial Contábil Grafotécnico',
      fornecedorOuCliente: 'Perito Dr. Armando Silva',
      valor: 5000,
      valorLiquido: 5000,
      dataCompetencia: new Date(anoAtual, mesAtual - 1, 15),
      dataVencimento: new Date(anoAtual, mesAtual - 1, 20),
      dataPagamento: new Date(anoAtual, mesAtual - 1, 20),
      status: 'PAGO',
      contaBancariaId: contaBB.id,
      clienteProcessoId: cliMetalurgica.id,
      categoriaId: catPericias.id,
      centroCustoId: ccTributario.id,
      ehReembolsavel: true,
      reembolsado: true, // Já ressarcido pelo cliente!
    },
  });

  // Despesas Operacionais Gerais
  await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'PAGAR',
      titulo: 'Aluguel do Conjunto Comercial Faria Lima',
      fornecedorOuCliente: 'Imobiliária Faria Lima Prime',
      valor: 14500,
      valorLiquido: 14500,
      dataCompetencia: new Date(anoAtual, mesAtual, 1),
      dataVencimento: new Date(anoAtual, mesAtual, 10),
      dataPagamento: new Date(anoAtual, mesAtual, 10),
      status: 'PAGO',
      contaBancariaId: contaItau.id,
      categoriaId: catAluguel.id,
      centroCustoId: ccOperacional.id,
      numeroDocumento: 'FAT-2026/09',
    },
  });

  await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'PAGAR',
      titulo: 'Softwares Jurídicos (Jurisfy & Legal Research Cloud)',
      fornecedorOuCliente: 'LegalTech Cloud Services Inc.',
      valor: 2450,
      valorLiquido: 2450,
      dataCompetencia: new Date(anoAtual, mesAtual, 5),
      dataVencimento: new Date(anoAtual, mesAtual, 12),
      dataPagamento: new Date(anoAtual, mesAtual, 12),
      status: 'PAGO',
      contaBancariaId: contaItau.id,
      categoriaId: catSoftwareTI.id,
      centroCustoId: ccOperacional.id,
      numeroDocumento: 'SUB-8812',
    },
  });

  // Título a Pagar Pendente (para aparecer na conciliação ou em aberto)
  const lPagarPendente = await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'PAGAR',
      titulo: 'Honorários de Correspondente - Audiência de Instrução',
      fornecedorOuCliente: 'Dra. Vanessa Advocacia de Apoio',
      valor: 850,
      valorLiquido: 850,
      dataCompetencia: new Date(anoAtual, mesAtual, 12),
      dataVencimento: new Date(anoAtual, mesAtual, 28),
      status: 'PENDENTE',
      clienteProcessoId: cliLogistica.id,
      categoriaId: catCorrespondentes.id,
      centroCustoId: ccTrabalhista.id,
      numeroDocumento: 'REC-CORR-12',
    },
  });

  // Impostos sobre Serviços (ISS / Simples)
  await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: 'PAGAR',
      titulo: 'Guia DAS Simples Nacional - Competência Anterior',
      fornecedorOuCliente: 'Receita Federal do Brasil',
      valor: 4890,
      valorLiquido: 4890,
      dataCompetencia: new Date(anoAtual, mesAtual, 1),
      dataVencimento: new Date(anoAtual, mesAtual, 20),
      dataPagamento: new Date(anoAtual, mesAtual, 20),
      status: 'PAGO',
      contaBancariaId: contaItau.id,
      categoriaId: catImpostosServicos.id,
      centroCustoId: ccOperacional.id,
      numeroDocumento: 'DAS-2026/10',
    },
  });

  // 7. Extrato Bancário e Dados para Conciliação
  // Transações importadas do extrato bancário
  await prisma.extratoBancario.create({
    data: {
      contaBancariaId: contaItau.id,
      fitId: 'ITAU-20261010-001',
      dataTransacao: new Date(anoAtual, mesAtual, 10),
      descricao: 'TED RECEBIDA CONSTRUTORA ALFA',
      valor: 18500,
      tipo: 'CREDIT',
      statusConciliado: true,
    },
  });

  // Já conciliada com o lançamento lRec1
  const ext1 = await prisma.extratoBancario.findFirst({ where: { fitId: 'ITAU-20261010-001' } });
  if (ext1) {
    await prisma.conciliacao.create({
      data: {
        extratoId: ext1.id,
        lancamentoId: lRec1.id,
        conciliadoPor: 'Administrador Master',
        dataConciliacao: new Date(),
        observacao: 'Conciliado por paridade automática de valor e data',
      },
    });
  }

  // Transação pendente no extrato que coincide perfeitamente com lPagarPendente (R$ 850,00)
  await prisma.extratoBancario.create({
    data: {
      contaBancariaId: contaItau.id,
      fitId: 'ITAU-20261028-002',
      dataTransacao: new Date(anoAtual, mesAtual, 28),
      descricao: 'PIX ENVIADO DRA VANESSA CORRESP',
      valor: -850,
      tipo: 'DEBIT',
      statusConciliado: false,
    },
  });

  // Tarifa bancária no extrato (não possui lançamento prévio no ERP, ideal para "Lançar Avulso" na conciliação!)
  await prisma.extratoBancario.create({
    data: {
      contaBancariaId: contaItau.id,
      fitId: 'ITAU-20261029-003',
      dataTransacao: new Date(anoAtual, mesAtual, 29),
      descricao: 'TAR MANUTENCAO PACOTE EMPRESAS',
      valor: -129.90,
      tipo: 'DEBIT',
      statusConciliado: false,
    },
  });

  // Rendimento automático de aplicação no extrato
  await prisma.extratoBancario.create({
    data: {
      contaBancariaId: contaItau.id,
      fitId: 'ITAU-20261029-004',
      dataTransacao: new Date(anoAtual, mesAtual, 29),
      descricao: 'RENDIMENTO AUTOMATICO POUPANCA / CDB',
      valor: 642.50,
      tipo: 'CREDIT',
      statusConciliado: false,
    },
  });

  console.log('--- Seed Concluído com Sucesso! ---');
  console.log('Usuários de Teste:');
  console.log('1. Master (Acesso total): master@jurisfy.com.br / Senha@123456');
  console.log('2. Gestor Tributário (Alçada R$ 25k): carlos@jurisfy.com.br / Senha@123456');
  console.log('3. Financeiro (Alçada R$ 3k): financeiro@jurisfy.com.br / Senha@123456');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

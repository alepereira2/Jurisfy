# Jurisfy - ERP Financeiro para Escritórios de Advocacia

Sistema completo de Gestão Financeira, DRE com dupla apuração (Caixa vs. Competência), Conciliação Bancária lado a lado (OFX/CSV) e Painel Executivo de Business Intelligence projetado especialmente para Escritórios de Advocacia.

---

## 🏛️ Funcionalidades Principais

- **Autenticação & Segurança 2FA:**
  - Login com e-mail e senha com hash bcrypt.
  - Segundo fator (2FA) via OTP de 6 dígitos numéricos.
  - Perfis de acesso granular (RBAC) com suporte a Perfil Master e Usuários Customizados.
  - Alçadas monetárias de aprovação em R$ (teto máximo para lançamentos sem aprovação).
  - Restrição de visualização e lançamentos por Centro de Custo.
  - Rastreabilidade completa de ações críticas com Logs de Auditoria (timestamp e IP).

- **Gestão Financeira Completa:**
  - **Contas a Pagar:** Títulos com fornecedor, centro de custo, categoria DRE, NF, rateio por múltiplos centros e suporte a custas reembolsáveis vinculadas a processos/clientes. Baixa individual ou em lote.
  - **Contas a Receber:** Honorários contratuais (mensalidades), honorários de êxito, sucumbência e reembolsos. Retenções na fonte (ISS, IRRF, PIS/COFINS/CSLL) e emissão de recibos.
  - **Contas Bancárias & Bloqueio Retroativo:** Gestão de contas correntes, caixas e aplicações, com fechamento contábil mensal retroativo.

- **Importação de Extratos & Conciliação Bancária:**
  - Parser nativo de arquivos **OFX (SGML 1.x e XML 2.x)** e **CSV**.
  - Detecção rigorosa contra duplicidade via `fitid` único.
  - Conciliação visual lado a lado com detecção de correspondências automáticas.
  - Lançamento express (avulso) para tarifas e rendimentos direto da tela de conciliação.

- **Motor Contábil & Relatórios:**
  - **DRE:** Alternância dinâmica entre **Regime de Competência** e **Regime de Caixa**.
  - **Fluxo de Caixa:** Realizado vs. Projetado com evolução do saldo acumulado.
  - **Inadimplência (Aging List):** Vencidos em faixas de 1-30, 31-60, 61-90 e >90 dias com ranking por cliente.
  - **Despesas Reembolsáveis:** Custas processuais adiantadas vs. ressarcidas.
  - Exportação para Excel (CSV) e impressão para PDF.

- **Painel Executivo de BI:**
  - Cards de KPIs: Receita atual vs anterior, Lucro líquido, Margem líquida, Inadimplência global e Saldo em contas.
  - Gráficos interativos com Recharts (Área, Barras por Centro de Custo, Rosca por Categoria).
  - Curva ABC de concentração de clientes.

---

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend / API:** Next.js Route Handlers, Zod
- **Banco de Dados & ORM:** Prisma ORM com SQLite (dev local) e suporte a PostgreSQL
- **Segurança:** Bcryptjs, 2FA OTP, Cookies seguros

---

## 🚀 Como Executar Localmente

1. **Clone o repositório:**
```bash
git clone https://github.com/alepereira2/Jurisfy.git
cd Jurisfy
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

4. **Sincronize o banco de dados e popule os dados iniciais:**
```bash
npx prisma db push
npm run seed
```

5. **Inicie o servidor:**
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000).

---

## 🔑 Credenciais de Demonstração

| Perfil | E-mail | Senha | Alçada Máxima | Centro de Custo |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador Master** | `master@jurisfy.com.br` | `Senha@123456` | Ilimitada | Todos |
| **Sócio Gestor** | `carlos@jurisfy.com.br` | `Senha@123456` | R$ 25.000,00 | Tributário & Societário |
| **Financeiro Pleno** | `financeiro@jurisfy.com.br` | `Senha@123456` | R$ 3.000,00 | Administrativo & Operacional |

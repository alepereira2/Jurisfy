export interface OFXAccount {
  bankId?: string;
  branchId?: string;
  accountId?: string;
  accountType?: string;
}

export interface OFXTransaction {
  fitId: string;
  type: 'DEBIT' | 'CREDIT' | 'OTHER';
  date: Date;
  amount: number;
  memo: string;
  checkNumber?: string;
}

export interface OFXParsedData {
  account: OFXAccount;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  balance?: number;
  balanceDate?: Date;
  transactions: OFXTransaction[];
}

/**
 * Converte data do padrão OFX (YYYYMMDDHHMMSS[-03:EST]) em objeto Date.
 */
export function parseOFXDate(dateStr: string): Date {
  const cleaned = dateStr.trim();
  const year = parseInt(cleaned.substring(0, 4), 10);
  const month = parseInt(cleaned.substring(4, 6), 10) - 1;
  const day = parseInt(cleaned.substring(6, 8), 10);
  const hour = cleaned.length >= 10 ? parseInt(cleaned.substring(8, 10), 10) : 0;
  const minute = cleaned.length >= 12 ? parseInt(cleaned.substring(10, 12), 10) : 0;
  const second = cleaned.length >= 14 ? parseInt(cleaned.substring(12, 14), 10) : 0;

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Extrai o valor de uma tag SGML/XML do conteúdo OFX.
 */
export function extractTagValue(xmlOrSgml: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)(?:<\\/${tagName}>)?`, 'i');
  const match = xmlOrSgml.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Realiza o parse completo de um buffer/string de extrato OFX (SGML v1.x e XML v2.x).
 */
export function parseOFX(rawContent: string): OFXParsedData {
  // Isola a parte de conteúdo do OFX (descarta cabeçalhos de linha chave:valor se presentes)
  const bodyIndex = rawContent.indexOf('<OFX>');
  const content = bodyIndex !== -1 ? rawContent.substring(bodyIndex) : rawContent;

  const currency = extractTagValue(content, 'CURDEF') || 'BRL';

  // Dados da Conta
  const bankId = extractTagValue(content, 'BANKID');
  const branchId = extractTagValue(content, 'BRANCHID');
  const accountId = extractTagValue(content, 'ACCTID');
  const accountType = extractTagValue(content, 'ACCTTYPE');

  // Período do Extrato
  const dtStartRaw = extractTagValue(content, 'DTSTART');
  const dtEndRaw = extractTagValue(content, 'DTEND');
  const startDate = dtStartRaw ? parseOFXDate(dtStartRaw) : undefined;
  const endDate = dtEndRaw ? parseOFXDate(dtEndRaw) : undefined;

  // Saldo final (LEDGERBAL)
  let balance: number | undefined;
  let balanceDate: Date | undefined;
  const ledgerBalMatch = content.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i);
  if (ledgerBalMatch) {
    const balAmtRaw = extractTagValue(ledgerBalMatch[1], 'BALAMT');
    const dtAsOfRaw = extractTagValue(ledgerBalMatch[1], 'DTASOF');
    if (balAmtRaw) balance = parseFloat(balAmtRaw.replace(',', '.'));
    if (dtAsOfRaw) balanceDate = parseOFXDate(dtAsOfRaw);
  }

  // Transações (<STMTTRN>...</STMTTRN>)
  const transactions: OFXTransaction[] = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi;
  let match: RegExpExecArray | null;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const trnBlock = match[1];

    const fitId = extractTagValue(trnBlock, 'FITID');
    const trnTypeRaw = (extractTagValue(trnBlock, 'TRNTYPE') || '').toUpperCase();
    const dtPostedRaw = extractTagValue(trnBlock, 'DTPOSTED');
    const trnAmtRaw = extractTagValue(trnBlock, 'TRNAMT');
    const memo = extractTagValue(trnBlock, 'MEMO') || extractTagValue(trnBlock, 'NAME') || '';
    const checkNumber = extractTagValue(trnBlock, 'CHECKNUM');

    if (!fitId || !dtPostedRaw || !trnAmtRaw) {
      continue;
    }

    const amount = parseFloat(trnAmtRaw.replace(',', '.'));
    let type: 'DEBIT' | 'CREDIT' | 'OTHER' = 'OTHER';
    if (trnTypeRaw === 'DEBIT' || amount < 0) {
      type = 'DEBIT';
    } else if (trnTypeRaw === 'CREDIT' || amount > 0) {
      type = 'CREDIT';
    }

    transactions.push({
      fitId,
      type,
      date: parseOFXDate(dtPostedRaw),
      amount,
      memo,
      checkNumber,
    });
  }

  return {
    account: {
      bankId,
      branchId,
      accountId,
      accountType,
    },
    currency,
    startDate,
    endDate,
    balance,
    balanceDate,
    transactions,
  };
}

/**
 * Parser simples e robusto para extratos bancários em formato CSV (padrão Itaú, Bradesco, BB, Nubank).
 * Colunas suportadas: Data, Descrição/Histórico, Valor / Tipo, Documento.
 */
export function parseCSVStatement(csvContent: string): OFXTransaction[] {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const transactions: OFXTransaction[] = [];
  // Detectar delimitador (; ou ,)
  const header = lines[0];
  const delimiter = header.includes(';') ? ';' : ',';
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 3) continue;

    // Suposição comum: col 0 = Data (DD/MM/YYYY ou YYYY-MM-DD), col 1 = Descrição, col 2 = Valor
    const dateStr = cols[0];
    const memo = cols[1] || 'Lançamento Bancário';
    const valRaw = cols[2].replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
    const amount = parseFloat(valRaw);

    if (isNaN(amount)) continue;

    // Parse date
    let date = new Date();
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else if (dateStr.includes('-')) {
      date = new Date(dateStr);
    }

    const fitId = `CSV-${date.getTime()}-${Math.abs(Math.round(amount * 100))}-${i}`;
    transactions.push({
      fitId,
      type: amount < 0 ? 'DEBIT' : 'CREDIT',
      date,
      amount,
      memo,
    });
  }

  return transactions;
}

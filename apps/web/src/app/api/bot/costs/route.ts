import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const BOT_API_KEY = process.env.GELUK_BOT_API_KEY || 'geluk_bot_secret_2026_auth';

function checkAuth(request: Request): boolean {
  const headerKey = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');

  const providedKey = headerKey || bearerKey || queryKey;
  return providedKey === BOT_API_KEY;
}

const MESES: Record<string, number> = {
  janeiro: 1, jan: 1, '01': 1, '1': 1,
  fevereiro: 2, fev: 2, '02': 2, '2': 2,
  marco: 3, mar: 3, '03': 3, '3': 3,
  abril: 4, abr: 4, '04': 4, '4': 4,
  maio: 5, mai: 5, '05': 5, '5': 5,
  junho: 6, jun: 6, '06': 6, '6': 6,
  julho: 7, jul: 7, '07': 7, '7': 7,
  agosto: 8, ago: 8, '08': 8, '8': 8,
  setembro: 9, set: 9, '09': 9, '9': 9,
  outubro: 10, out: 10, '10': 10,
  novembro: 11, nov: 11, '11': 11,
  dezembro: 12, dez: 12, '12': 12
};

function parseAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim().replace(/[R$\s]/g, '');
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

function parseCostDate(rawDate: any): Date {
  if (!rawDate) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  }
  const str = String(rawDate).trim();
  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const d = parseInt(brMatch[1], 10);
    const m = parseInt(brMatch[2], 10);
    const y = parseInt(brMatch[3], 10);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  // DD/MM (assume ano corrente)
  const shortBrMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (shortBrMatch) {
    const now = new Date();
    const d = parseInt(shortBrMatch[1], 10);
    const m = parseInt(shortBrMatch[2], 10);
    return new Date(Date.UTC(now.getUTCFullYear(), m - 1, d, 12, 0, 0));
  }
  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
}

function normalizeCategory(rawCat: any): string {
  if (!rawCat) return 'FIXO';
  const upper = String(rawCat)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (upper.includes('VAR')) return 'VARIAVEL';
  if (upper.includes('IMP') || upper.includes('DARF') || upper.includes('DAS') || upper.includes('IOF') || upper.includes('IRPJ') || upper.includes('ISS')) return 'IMPOSTO';
  if (upper.includes('INV')) return 'INVESTIDORES';
  return 'FIXO';
}

function normalizePaymentMethod(rawMethod: any, pixKey?: string | null, barcode?: string | null): string {
  if (rawMethod) {
    const upper = String(rawMethod).toUpperCase().trim();
    if (upper.includes('PIX')) return 'PIX';
    if (upper.includes('BOL')) return 'BOLETO';
    if (upper.includes('OUT') || upper.includes('TED') || upper.includes('DEB') || upper.includes('CART')) return 'OUTRO';
  }
  if (pixKey) return 'PIX';
  if (barcode) return 'BOLETO';
  return 'BOLETO';
}

function normalizePaid(rawPaid: any): boolean | undefined {
  if (rawPaid === undefined || rawPaid === null || rawPaid === '') return undefined;
  if (typeof rawPaid === 'boolean') return rawPaid;
  const str = String(rawPaid).toLowerCase().trim();
  if (['true', '1', 'sim', 's', 'pago', 'paga', 'quitado', 'ok', 'yes'].includes(str)) return true;
  if (['false', '0', 'nao', 'não', 'n', 'pendente', 'aberto', 'em aberto', 'no'].includes(str)) return false;
  return undefined;
}

function formatCostItem(c: any) {
  const dt = new Date(c.date);
  const dia = String(dt.getUTCDate()).padStart(2, '0');
  const mes = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const ano = dt.getUTCFullYear();
  return {
    id: c.id,
    nome: c.name,
    valor: c.amount,
    vencimento: `${dia}/${mes}/${ano}`,
    dataIso: dt.toISOString().slice(0, 10),
    categoria: c.category,
    tipo: c.type,
    pago: c.paid,
    status: c.paid ? 'Pago' : 'Pendente',
    formaPagamento: c.paymentMethod || 'Não informado',
    codigoBarras: c.barcode || null,
    chavePix: c.pixKey || null,
    anexo: c.attachment || null
  };
}

/**
 * GET /api/bot/costs
 * Retorna custos e despesas do sistema para a Sarah (Bot)
 * Query params: ?month=10&year=2026&category=FIXO&status=pago&search=serasa
 */
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawMonth = (searchParams.get('month') || searchParams.get('mes') || '').toLowerCase().trim();
    const rawYear = searchParams.get('year') || searchParams.get('ano') || '';
    const category = searchParams.get('category') || searchParams.get('categoria');
    const statusParam = (searchParams.get('status') || '').toLowerCase().trim(); // 'pago', 'pendente', 'todos'
    const searchParam = (searchParams.get('search') || searchParams.get('busca') || searchParams.get('nome') || '').trim();

    const now = new Date();
    let y = rawYear ? parseInt(rawYear, 10) : now.getUTCFullYear();
    let m: number | null = now.getUTCMonth() + 1;

    if (rawMonth === 'all' || rawMonth === 'todos' || rawMonth === 'ano') {
      m = null;
    } else if (rawMonth) {
      const cleanM = rawMonth.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (cleanM.includes('-')) {
        const parts = cleanM.split('-');
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
      } else if (MESES[cleanM]) {
        m = MESES[cleanM];
      } else if (!isNaN(parseInt(cleanM, 10))) {
        m = parseInt(cleanM, 10);
      }
    }

    const whereClause: any = {};

    if (m !== null) {
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
      whereClause.date = { gte: startOfMonth, lte: endOfMonth };
    } else {
      const startOfYear = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      const endOfYear = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      whereClause.date = { gte: startOfYear, lte: endOfYear };
    }

    if (category && category.toLowerCase() !== 'todas' && category.toLowerCase() !== 'todos') {
      whereClause.category = { equals: normalizeCategory(category) };
    }

    if (statusParam === 'pago' || statusParam === 'pagos') {
      whereClause.paid = true;
    } else if (statusParam === 'pendente' || statusParam === 'pendentes' || statusParam === 'aberto') {
      whereClause.paid = false;
    }

    if (searchParam) {
      whereClause.name = { contains: searchParam, mode: 'insensitive' };
    }

    const costs = await prisma.cost.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    const total = costs.reduce((acc, c) => acc + c.amount, 0);
    const totalPago = costs.filter(c => c.paid).reduce((acc, c) => acc + c.amount, 0);
    const totalPendente = costs.filter(c => !c.paid).reduce((acc, c) => acc + c.amount, 0);

    const porCategoria: Record<string, { total: number; pago: number; pendente: number; quantidade: number }> = {};
    for (const c of costs) {
      const cat = c.category || 'OUTROS';
      if (!porCategoria[cat]) {
        porCategoria[cat] = { total: 0, pago: 0, pendente: 0, quantidade: 0 };
      }
      porCategoria[cat].total += c.amount;
      if (c.paid) porCategoria[cat].pago += c.amount;
      else porCategoria[cat].pendente += c.amount;
      porCategoria[cat].quantidade += 1;
    }

    const periodoStr = m !== null ? `${String(m).padStart(2, '0')}/${y}` : `Ano ${y}`;

    return NextResponse.json({
      success: true,
      periodo: periodoStr,
      resumo: {
        totalGeral: total,
        totalPago,
        totalPendente,
        quantidadeTotal: costs.length
      },
      porCategoria,
      itens: costs.map(formatCostItem)
    });
  } catch (error: any) {
    console.error('[API Bot Costs GET Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/bot/costs
 * Cria/lança um novo custo (ou lista de custos) no Sistema Geluk
 */
export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawItems = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [body];

    const createdItems = [];

    for (const item of rawItems) {
      const name = String(item.name || item.nome || item.descricao || '').trim();
      const amount = parseAmount(item.amount ?? item.valor);

      if (!name) {
        return NextResponse.json({ success: false, error: 'O campo "nome" (descrição do custo) é obrigatório.' }, { status: 400 });
      }
      if (amount <= 0) {
        return NextResponse.json({ success: false, error: `Valor inválido para o custo "${name}". Informe um valor maior que zero.` }, { status: 400 });
      }

      const date = parseCostDate(item.date || item.data || item.vencimento || item.data_vencimento);
      const category = normalizeCategory(item.category || item.categoria);
      const type = String(item.type || item.tipo || 'GERAL').toUpperCase().trim();
      const barcode = (item.barcode || item.codigoBarras || item.codigo_barras || item.linhaDigitavel || '').trim() || null;
      const pixKey = (item.pixKey || item.chavePix || item.chave_pix || '').trim() || null;
      const paymentMethod = normalizePaymentMethod(item.paymentMethod || item.formaPagamento || item.forma_pagamento, pixKey, barcode);
      const paidVal = normalizePaid(item.paid ?? item.pago ?? item.status);
      const paid = paidVal !== undefined ? paidVal : false;

      const created = await prisma.cost.create({
        data: {
          name,
          amount,
          date,
          category,
          type,
          barcode,
          paymentMethod,
          pixKey,
          paid
        }
      });

      createdItems.push(formatCostItem(created));
    }

    try {
      revalidatePath('/custos');
      revalidatePath('/');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      action: 'created',
      count: createdItems.length,
      cost: createdItems[0],
      items: createdItems,
      message: createdItems.length === 1
        ? `Custo "${createdItems[0].nome}" (R$ ${createdItems[0].valor.toFixed(2)}) lançado com sucesso para ${createdItems[0].vencimento}!`
        : `${createdItems.length} custos lançados com sucesso!`
    });
  } catch (error: any) {
    console.error('[API Bot Costs POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH / PUT /api/bot/costs
 * Atualiza um custo existente (ex: marcar como pago/pendente, alterar valor, data, chave PIX, boleto, categoria)
 * Pode localizar o custo pelo `id` ou pelo `nome`/`busca` (+ `mes`/`ano` opcional).
 */
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = body.id || body.costId || body.custo_id;
    const searchName = (body.searchName || body.busca_nome || body.busca || body.nome_atual || body.name || body.nome || '').trim();
    const rawMonth = (body.month || body.mes || '').toString().toLowerCase().trim();
    const rawYear = body.year || body.ano;

    let targetCost = null;

    if (id) {
      targetCost = await prisma.cost.findUnique({ where: { id: String(id) } });
    }

    if (!targetCost && searchName) {
      const now = new Date();
      let y = rawYear ? parseInt(String(rawYear), 10) : now.getUTCFullYear();
      let m: number | null = null;

      if (rawMonth) {
        const cleanM = rawMonth.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (cleanM.includes('-')) {
          const parts = cleanM.split('-');
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
        } else if (MESES[cleanM]) {
          m = MESES[cleanM];
        } else if (!isNaN(parseInt(cleanM, 10))) {
          m = parseInt(cleanM, 10);
        }
      }

      const whereSearch: any = {
        name: { contains: searchName, mode: 'insensitive' }
      };

      if (m !== null) {
        const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
        whereSearch.date = { gte: startOfMonth, lte: endOfMonth };
      }

      const candidates = await prisma.cost.findMany({
        where: whereSearch,
        orderBy: { date: 'desc' }
      });

      if (candidates.length > 0) {
        // Prioriza do mês atual se não filtrou mês
        const currentMonthCandidates = candidates.filter(c => {
          const d = new Date(c.date);
          return d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear();
        });
        targetCost = currentMonthCandidates[0] || candidates[0];
      }
    }

    if (!targetCost) {
      return NextResponse.json({
        success: false,
        error: `Nenhum custo encontrado para atualizar (${id ? 'ID: ' + id : 'Busca: ' + searchName}).`
      }, { status: 404 });
    }

    const updateData: any = {};

    const newName = body.newName || body.novo_nome || (id && (body.name || body.nome));
    if (newName && String(newName).trim()) {
      updateData.name = String(newName).trim();
    }

    if (body.amount !== undefined || body.valor !== undefined || body.novo_valor !== undefined) {
      const parsedVal = parseAmount(body.novo_valor ?? body.amount ?? body.valor);
      if (parsedVal > 0) updateData.amount = parsedVal;
    }

    if (body.date || body.data || body.vencimento || body.nova_data || body.data_vencimento) {
      updateData.date = parseCostDate(body.nova_data || body.date || body.data || body.vencimento || body.data_vencimento);
    }

    if (body.category || body.categoria) {
      updateData.category = normalizeCategory(body.category || body.categoria);
    }

    if (body.type || body.tipo) {
      updateData.type = String(body.type || body.tipo).toUpperCase().trim();
    }

    if (body.barcode !== undefined || body.codigoBarras !== undefined || body.codigo_barras !== undefined) {
      updateData.barcode = String(body.barcode ?? body.codigoBarras ?? body.codigo_barras ?? '').trim() || null;
    }

    if (body.pixKey !== undefined || body.chavePix !== undefined || body.chave_pix !== undefined) {
      updateData.pixKey = String(body.pixKey ?? body.chavePix ?? body.chave_pix ?? '').trim() || null;
    }

    if (body.paymentMethod || body.formaPagamento || body.forma_pagamento) {
      updateData.paymentMethod = normalizePaymentMethod(
        body.paymentMethod || body.formaPagamento || body.forma_pagamento,
        updateData.pixKey ?? targetCost.pixKey,
        updateData.barcode ?? targetCost.barcode
      );
    }

    const paidStatus = normalizePaid(body.paid ?? body.pago ?? body.status);
    if (paidStatus !== undefined) {
      updateData.paid = paidStatus;
    }

    const updated = await prisma.cost.update({
      where: { id: targetCost.id },
      data: updateData
    });

    try {
      revalidatePath('/custos');
      revalidatePath('/');
    } catch (_) {}

    const formatted = formatCostItem(updated);
    return NextResponse.json({
      success: true,
      action: 'updated',
      cost: formatted,
      message: `Custo "${formatted.nome}" atualizado com sucesso! Valor: R$ ${formatted.valor.toFixed(2)} | Vencimento: ${formatted.vencimento} | Status: ${formatted.status}.`
    });
  } catch (error: any) {
    console.error('[API Bot Costs PATCH Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}

/**
 * DELETE /api/bot/costs
 * Exclui um custo pelo `id` ou por `name`/`nome` (+ `month`/`mes` opcional)
 */
export async function DELETE(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('costId');
    let searchName = searchParams.get('name') || searchParams.get('nome') || searchParams.get('search') || '';
    let rawMonth = (searchParams.get('month') || searchParams.get('mes') || '').toLowerCase().trim();
    let rawYear = searchParams.get('year') || searchParams.get('ano') || '';

    try {
      const body = await request.json();
      if (body) {
        id = id || body.id || body.costId || body.custo_id;
        searchName = searchName || body.name || body.nome || body.search || body.busca || '';
        rawMonth = rawMonth || String(body.month || body.mes || '').toLowerCase().trim();
        rawYear = rawYear || String(body.year || body.ano || '');
      }
    } catch (_) {}

    let targetCost = null;

    if (id) {
      targetCost = await prisma.cost.findUnique({ where: { id: String(id) } });
    }

    if (!targetCost && searchName) {
      const now = new Date();
      let y = rawYear ? parseInt(rawYear, 10) : now.getUTCFullYear();
      let m: number | null = null;

      if (rawMonth) {
        const cleanM = rawMonth.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (cleanM.includes('-')) {
          const parts = cleanM.split('-');
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
        } else if (MESES[cleanM]) {
          m = MESES[cleanM];
        } else if (!isNaN(parseInt(cleanM, 10))) {
          m = parseInt(cleanM, 10);
        }
      }

      const whereSearch: any = {
        name: { contains: searchName.trim(), mode: 'insensitive' }
      };

      if (m !== null) {
        const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
        whereSearch.date = { gte: startOfMonth, lte: endOfMonth };
      }

      const candidates = await prisma.cost.findMany({
        where: whereSearch,
        orderBy: { date: 'desc' }
      });

      if (candidates.length > 0) {
        const currentMonthCandidates = candidates.filter(c => {
          const d = new Date(c.date);
          return d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear();
        });
        targetCost = currentMonthCandidates[0] || candidates[0];
      }
    }

    if (!targetCost) {
      return NextResponse.json({
        success: false,
        error: `Nenhum custo encontrado para exclusão (${id ? 'ID: ' + id : 'Nome: ' + searchName}).`
      }, { status: 404 });
    }

    const deleted = await prisma.cost.delete({
      where: { id: targetCost.id }
    });

    try {
      revalidatePath('/custos');
      revalidatePath('/');
    } catch (_) {}

    const formatted = formatCostItem(deleted);
    return NextResponse.json({
      success: true,
      action: 'deleted',
      deleted: formatted,
      message: `Custo "${formatted.nome}" (R$ ${formatted.valor.toFixed(2)} - ${formatted.vencimento}) excluído com sucesso do Sistema Geluk!`
    });
  } catch (error: any) {
    console.error('[API Bot Costs DELETE Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

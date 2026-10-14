import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

/**
 * GET /api/bot/costs
 * Retorna custos e despesas do sistema para a Sarah (Bot)
 * Query params: ?month=10&year=2026&category=FIXO&status=pago
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
    const statusParam = searchParams.get('status'); // 'pago', 'pendente', 'todos'

    const now = new Date();
    let y = rawYear ? parseInt(rawYear) : now.getUTCFullYear();
    let m = now.getUTCMonth() + 1;

    if (rawMonth) {
      if (rawMonth.includes('-')) {
        const parts = rawMonth.split('-');
        y = parseInt(parts[0]);
        m = parseInt(parts[1]);
      } else if (MESES[rawMonth]) {
        m = MESES[rawMonth];
      } else if (!isNaN(parseInt(rawMonth))) {
        m = parseInt(rawMonth);
      }
    }

    const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);

    let whereClause: any = {
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    };

    if (category) {
      whereClause.category = { equals: category.toUpperCase() };
    }

    if (statusParam === 'pago') {
      whereClause.paid = true;
    } else if (statusParam === 'pendente') {
      whereClause.paid = false;
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

    const mesFormatado = String(m).padStart(2, '0');

    return NextResponse.json({
      success: true,
      periodo: `${mesFormatado}/${y}`,
      resumo: {
        totalGeral: total,
        totalPago,
        totalPendente,
        quantidadeTotal: costs.length
      },
      porCategoria,
      itens: costs.map(c => ({
        id: c.id,
        nome: c.name,
        valor: c.amount,
        vencimento: c.date.toISOString().slice(8, 10) + '/' + mesFormatado + '/' + y,
        categoria: c.category,
        pago: c.paid,
        status: c.paid ? 'Pago' : 'Pendente',
        formaPagamento: c.paymentMethod || 'Não informado',
        codigoBarras: c.barcode || null,
        chavePix: c.pixKey || null
      }))
    });
  } catch (error: any) {
    console.error('[API Bot Costs Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

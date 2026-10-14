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

function cleanDigits(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

/**
 * GET /api/bot/clients
 * Permite que a Sarah (Bot) consulte clientes cadastrados no Sistema Geluk
 * Parâmetros aceitos: ?query=... ou ?cnpj=... ou ?name=...
 */
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('name') || '';
    const cnpj = searchParams.get('cnpj') || '';

    const cnpjDigits = cleanDigits(cnpj || query);

    let whereClause: any = {};

    if (cnpjDigits && cnpjDigits.length >= 8) {
      whereClause = {
        OR: [
          { cnpj: { contains: cnpjDigits } },
          { name: { contains: query.trim(), mode: 'insensitive' } }
        ]
      };
    } else if (query.trim()) {
      whereClause = {
        name: { contains: query.trim(), mode: 'insensitive' }
      };
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      take: 10,
      orderBy: { name: 'asc' },
      include: {
        representative: {
          select: { id: true, name: true, email: true }
        },
        operations: {
          take: 3,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            valorBruto: true,
            fator: true,
            percentual: true,
            valorLiquido: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      count: clients.length,
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        status: c.status,
        taxaFator: c.taxaFator,
        taxaAdValorem: c.taxaAdValorem,
        taxaTarifa: c.taxaTarifa,
        taxaIof: c.taxaIof,
        representante: c.representative ? c.representative.name : 'Mesa Geluk',
        ultimasOperacoes: c.operations
      }))
    });
  } catch (error: any) {
    console.error('[API Bot Clients Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

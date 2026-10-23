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
 * Parâmetros aceitos: ?query=... ou ?cnpj=... ou ?name=... ou ?whatsapp=... ou ?phone=...
 */
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('name') || '';
    const cnpj = searchParams.get('cnpj') || '';
    const phone = searchParams.get('whatsapp') || searchParams.get('phone') || searchParams.get('telefone') || '';

    const cnpjDigits = cleanDigits(cnpj);
    const phoneDigits = cleanDigits(phone || (query.match(/^\+?\d{8,15}$/) ? query : ''));

    let allClients = await prisma.client.findMany({
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

    let clients = allClients;

    // 1. Busca por WhatsApp / Telefone
    if (phoneDigits && phoneDigits.length >= 8) {
      // Pega os últimos 8 ou 9 dígitos para casar independente de DDD ou prefixo 55
      const significantDigits = phoneDigits.length >= 10 ? phoneDigits.slice(-9) : phoneDigits.slice(-8);
      const matchPhone = allClients.filter(c => {
        const cPhoneDigits = cleanDigits(c.telefone);
        if (!cPhoneDigits) return false;
        return cPhoneDigits.includes(significantDigits) || phoneDigits.includes(cPhoneDigits.slice(-8));
      });

      if (matchPhone.length > 0) {
        clients = matchPhone;
      } else {
        clients = [];
      }
    } 
    // 2. Busca por CNPJ
    else if (cnpjDigits && cnpjDigits.length >= 8) {
      const matchCnpj = allClients.filter(c => {
        const cDigits = cleanDigits(c.cnpj);
        return Boolean(cDigits && (cDigits === cnpjDigits || cDigits.includes(cnpjDigits)));
      });

      if (matchCnpj.length > 0) {
        clients = matchCnpj;
      } else if (query.trim()) {
        const qLower = query.trim().toLowerCase();
        clients = allClients.filter(c => 
          c.name.toLowerCase().includes(qLower) ||
          (c.representanteNome && c.representanteNome.toLowerCase().includes(qLower))
        );
      } else {
        clients = [];
      }
    } 
    // 3. Busca por Nome da Empresa ou Nome do Representante
    else if (query.trim()) {
      const qLower = query.trim().toLowerCase();
      clients = allClients.filter(c => 
        c.name.toLowerCase().includes(qLower) ||
        (c.representanteNome && c.representanteNome.toLowerCase().includes(qLower))
      );
    }

    return NextResponse.json({
      success: true,
      count: clients.length,
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        representanteNome: c.representanteNome,
        telefone: c.telefone,
        whatsapp: c.telefone,
        email: c.email,
        status: c.status,
        taxaFator: c.taxaFator,
        taxaAdValorem: c.taxaAdValorem,
        taxaTarifa: c.taxaTarifa,
        taxaIof: c.taxaIof,
        representanteInterno: c.representative ? c.representative.name : 'Mesa Geluk',
        representante: c.representanteNome || (c.representative ? c.representative.name : 'Mesa Geluk'),
        ultimasOperacoes: c.operations
      }))
    });
  } catch (error: any) {
    console.error('[API Bot Clients Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/bot/clients
 * Permite que a Sarah salve ou atualize o Nome do Representante e o WhatsApp do Cedente
 */
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, cnpj, representanteNome, telefone, email } = body;

    let client = null;

    if (id) {
      client = await prisma.client.findUnique({ where: { id } });
    } else if (cnpj) {
      const cnpjDigits = cleanDigits(cnpj);
      const all = await prisma.client.findMany();
      client = all.find(c => cleanDigits(c.cnpj) === cnpjDigits);
    } else if (name) {
      client = await prisma.client.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' } }
      });
    }

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado para atualização.' }, { status: 404 });
    }

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: {
        representanteNome: representanteNome !== undefined ? (representanteNome?.trim() || null) : client.representanteNome,
        telefone: telefone !== undefined ? (telefone?.trim() || null) : client.telefone,
        email: email !== undefined ? (email?.trim() || null) : client.email
      }
    });

    return NextResponse.json({
      success: true,
      message: `Dados do representante de ${updated.name} atualizados com sucesso!`,
      client: {
        id: updated.id,
        name: updated.name,
        representanteNome: updated.representanteNome,
        telefone: updated.telefone,
        email: updated.email
      }
    });
  } catch (error: any) {
    console.error('[API Bot Clients PATCH Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

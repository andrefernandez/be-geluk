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

function cleanDigits(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim().replace(/[R$\s]/g, '');
  if (str.includes(',') && str.includes('.')) {
    // Ex: "5.200,00" -> 5200.00
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (str.includes(',')) {
    // Ex: "5200,00" -> 5200.00
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

/**
 * POST /api/bot/sync-operation
 * Sincroniza operação recebida do Bot / SmartFactor com o Sistema da GELUK.
 */
export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado. Chave de API inválida.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log('[API Bot Sync] 📥 Recebida operação para sincronização:', body);

    const {
      smartfactorId,
      cedente,
      cnpj,
      data,
      valorBruto: rawValorBruto,
      fator: rawFator,
      percentual: rawPercentual,
      dias: rawDias,
      tarifas: rawTarifas,
      adValorem: rawAdValorem,
      iof: rawIof,
      iofAdicional: rawIofAdicional,
      recompra: rawRecompra,
      pendencia: rawPendencia,
      pendencias: rawPendencias,
      valorLiquido: rawValorLiquido,
      status = 'CONFIRMACAO',
      sacados = [],
      observacoes = '',
      criticas = ''
    } = body;

    if (!cedente || typeof cedente !== 'string' || cedente.trim().toLowerCase().includes('atendimento')) {
      return NextResponse.json({ error: 'Campo "cedente" é obrigatório e não pode ser genérico ou "Cliente em atendimento".' }, { status: 400 });
    }

    const valorBruto = parseNumber(rawValorBruto);
    if (valorBruto <= 0 && (!status || status === 'CONFIRMACAO')) {
      return NextResponse.json({ error: 'Operação com valor bruto zero ou não preenchida não pode ser criada.' }, { status: 400 });
    }
    const fator = parseNumber(rawFator);
    const percentual = parseNumber(rawPercentual) || 9.5;
    const dias = parseNumber(rawDias) || 30;
    const tarifas = parseNumber(rawTarifas);
    const adValorem = parseNumber(rawAdValorem);
    const iof = parseNumber(rawIof);
    const iofAdicional = parseNumber(rawIofAdicional);
    const recompra = parseNumber(rawRecompra ?? rawPendencia ?? rawPendencias);
    const valorLiquido = parseNumber(rawValorLiquido);

    // 1. Identificar ou Criar Cliente (Cedente)
    const cnpjNumeros = cleanDigits(cnpj);
    let client = null;
    const allClients = await prisma.client.findMany();

    if (cnpjNumeros) {
      client = allClients.find(c => {
        const cDigits = cleanDigits(c.cnpj);
        return Boolean(cDigits && cDigits === cnpjNumeros);
      });
    }

    if (!client) {
      const cleanTarget = cedente.trim().toLowerCase();
      // Match exato por nome
      client = allClients.find(c => c.name.toLowerCase() === cleanTarget);

      // Match aproximado / alias (ex: "HYNO" para "HYNOBABY CRIANCAS FELIZES LTDA", ou prefixos de marca)
      if (!client) {
        client = allClients.find(c => {
          const cName = c.name.toLowerCase().trim();
          if (cName.length >= 3 && cleanTarget.includes(cName)) return true;
          if (cleanTarget.length >= 3 && cName.includes(cleanTarget)) return true;
          const firstTokenC = cName.split(/[\s\-]/)[0];
          const firstTokenT = cleanTarget.split(/[\s\-]/)[0];
          if (firstTokenC.length >= 4 && (firstTokenT.startsWith(firstTokenC) || firstTokenC.startsWith(firstTokenT))) return true;
          return false;
        });
      }
    }

    if (!client) {
      // Cria o cliente se não existir
      console.log(`[API Bot Sync] ➕ Criando novo cliente no sistema: "${cedente}"`);
      client = await prisma.client.create({
        data: {
          name: cedente.trim(),
          cnpj: cnpjNumeros || null,
          status: 'ATIVO',
          taxaFator: percentual,
          taxaTarifa: tarifas > 0 ? tarifas : null
        }
      });
    } else if (cnpjNumeros && !client.cnpj) {
      // Atualiza CNPJ caso não estivesse cadastrado
      await prisma.client.update({
        where: { id: client.id },
        data: { cnpj: cnpjNumeros }
      });
    }

    // 2. Tratar Data da Operação
    let opDate = new Date();
    if (data) {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        const [d, m, y] = data.split('/');
        opDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
      } else {
        const parsed = new Date(data);
        if (!isNaN(parsed.getTime())) opDate = parsed;
      }
    }

    // Intervalo do dia para buscar se a operação já existe
    const startOfDay = new Date(Date.UTC(opDate.getUTCFullYear(), opDate.getUTCMonth(), opDate.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(opDate.getUTCFullYear(), opDate.getUTCMonth(), opDate.getUTCDate(), 23, 59, 59, 999));

    // 3. Buscar se já existe operação deste cliente no mesmo dia ou com mesmo valor bruto
    const existingOp = await prisma.operation.findFirst({
      where: {
        clientId: client.id,
        date: { gte: startOfDay, lte: endOfDay }
      },
      include: { sacados: true }
    });

    let operationResult = null;
    let actionType = 'created';

    if (existingOp) {
      actionType = 'updated';
      console.log(`[API Bot Sync] 🔄 Atualizando operação existente ID ${existingOp.id}...`);

      operationResult = await prisma.operation.update({
        where: { id: existingOp.id },
        data: {
          date: opDate,
          valorBruto,
          fator,
          percentual,
          dias,
          tarifas,
          adValorem,
          iof,
          iofAdicional,
          recompra: recompra > 0 ? recompra : existingOp.recompra,
          valorLiquido,
          status: status || existingOp.status,
          updatedAt: new Date()
        },
        include: { sacados: true }
      });

      // Atualiza sacados se informados
      if (Array.isArray(sacados) && sacados.length > 0) {
        await prisma.sacado.deleteMany({ where: { operationId: existingOp.id } });
        await prisma.sacado.createMany({
          data: sacados.map(s => ({
            operationId: existingOp.id,
            nome: s.nome || 'Sacado',
            cnpj: cleanDigits(s.cnpj) || null,
            valor: parseNumber(s.valor) || null
          }))
        });
      }
    } else {
      console.log(`[API Bot Sync] ➕ Registrando nova operação para "${client.name}"...`);

      operationResult = await prisma.operation.create({
        data: {
          clientId: client.id,
          date: opDate,
          valorBruto,
          fator,
          percentual,
          percentualPrazo: 0,
          dias,
          tarifas,
          adValorem,
          iof,
          iofAdicional,
          recompra: recompra > 0 ? recompra : null,
          valorLiquido,
          declarada: true,
          active: true,
          status: status || 'CONFIRMACAO',
          sacados: {
            create: (Array.isArray(sacados) && sacados.length > 0)
              ? sacados.map(s => ({
                  nome: s.nome || 'Sacado',
                  cnpj: cleanDigits(s.cnpj) || null,
                  valor: parseNumber(s.valor) || null
                }))
              : []
          }
        },
        include: { sacados: true }
      });
    }

    // 4. Revalidar rotas no Next.js para atualizar o dashboard e tabelas no ar
    try {
      revalidatePath('/operacoes');
      revalidatePath('/em-aberto');
      revalidatePath('/redesconto');
      revalidatePath('/');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      action: actionType,
      operationId: operationResult.id,
      smartfactorId: smartfactorId || null,
      client: {
        id: client.id,
        name: client.name,
        cnpj: client.cnpj
      },
      financeiro: {
        valorBruto,
        fator,
        percentual,
        dias,
        tarifas,
        adValorem,
        iof,
        iofAdicional,
        recompra,
        valorLiquido,
        data: opDate.toISOString()
      },
      message: actionType === 'updated'
        ? `Operação de ${client.name} atualizada com sucesso no Sistema Geluk!`
        : `Nova operação de ${client.name} criada com sucesso no Sistema Geluk!`
    });
  } catch (error: any) {
    console.error('[API Bot Sync Error]:', error);
    return NextResponse.json({
      success: false,
      error: `Falha ao sincronizar operação: ${error.message}`
    }, { status: 500 });
  }
}

/**
 * GET /api/bot/sync-operation
 * Consulta operações recentes ou busca por ID.
 */
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');

    if (id) {
      const op = await prisma.operation.findUnique({
        where: { id },
        include: { client: true, sacados: true }
      });
      return NextResponse.json(op || { error: 'Operação não encontrada' });
    }

    const operations = await prisma.operation.findMany({
      where: clientId ? { clientId } : {},
      take: 20,
      orderBy: { date: 'desc' },
      include: {
        client: { select: { id: true, name: true, cnpj: true } },
        sacados: true
      }
    });

    return NextResponse.json({ success: true, count: operations.length, operations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/bot/sync-operation
 * Exclui uma operação pelo ID do Geluk, pelo nome do cedente ou operação mais recente.
 */
export async function DELETE(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado. Chave de API inválida.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    const id = searchParams.get('id') || body.id || body.operationId;
    const clientId = searchParams.get('clientId') || body.clientId;
    const cedente = searchParams.get('cedente') || body.cedente;

    let opToDelete = null;

    if (id) {
      opToDelete = await prisma.operation.findUnique({
        where: { id },
        include: { client: true }
      });
    } else if (clientId) {
      opToDelete = await prisma.operation.findFirst({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        include: { client: true }
      });
    } else if (cedente) {
      const client = await prisma.client.findFirst({
        where: { name: { equals: String(cedente).trim(), mode: 'insensitive' } }
      });
      if (client) {
        opToDelete = await prisma.operation.findFirst({
          where: { clientId: client.id },
          orderBy: { createdAt: 'desc' },
          include: { client: true }
        });
      }
    }

    if (!opToDelete) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma operação encontrada para exclusão com os parâmetros informados.'
      }, { status: 404 });
    }

    // Exclui sacados e a operação
    await prisma.sacado.deleteMany({ where: { operationId: opToDelete.id } });
    await prisma.operation.delete({ where: { id: opToDelete.id } });

    console.log(`[API Bot Delete] 🗑️ Operação ID ${opToDelete.id} (${opToDelete.client?.name || 'Cliente'}) excluída com sucesso.`);

    // Revalidação de cache no Next.js
    try {
      revalidatePath('/operacoes');
      revalidatePath('/em-aberto');
      revalidatePath('/redesconto');
      revalidatePath('/');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      deletedOperationId: opToDelete.id,
      client: opToDelete.client?.name,
      message: `Operação de ${opToDelete.client?.name || 'Cedente'} excluída com sucesso do Sistema Geluk!`
    });
  } catch (error: any) {
    console.error('[API Bot Delete Error]:', error);
    return NextResponse.json({
      success: false,
      error: `Falha ao excluir operação: ${error.message}`
    }, { status: 500 });
  }
}


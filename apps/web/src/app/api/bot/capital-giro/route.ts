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

/**
 * GET /api/bot/capital-giro
 * Retorna o capital a girar e as projeções salvas no sistema
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || 'current';

    const settingKey = `capital_giro_${month}`;
    const setting = await prisma.todo.findFirst({
      where: { title: settingKey },
      orderBy: { updatedAt: 'desc' }
    });

    if (!setting || !setting.description) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum dado de capital a girar registrado ainda para este período.'
      });
    }

    const data = JSON.parse(setting.description);
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/bot/capital-giro
 * Salva ou atualiza a projeção de capital a girar no sistema
 */
export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      month = 'current',
      capitalAGirar = 0,
      capitalDoDia = 0,
      dataInicial,
      dataFinal,
      rentabilidadeAtual = 0,
      lucroLiquidoAtual = 0,
      lucroProjetadoComGiro = 0,
      lucroLiquidoProjetadoFinal = 0,
      updatedBy = 'SmartFactor Automation'
    } = body;

    const payload = {
      month,
      capitalAGirar: Number(capitalAGirar) || 0,
      capitalDoDia: Number(capitalDoDia) || 0,
      dataInicial,
      dataFinal,
      rentabilidadeAtual: Number(rentabilidadeAtual) || 0,
      lucroLiquidoAtual: Number(lucroLiquidoAtual) || 0,
      lucroProjetadoComGiro: Number(lucroProjetadoComGiro) || 0,
      lucroLiquidoProjetadoFinal: Number(lucroLiquidoProjetadoFinal) || 0,
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    const settingKey = `capital_giro_${month}`;

    const existing = await prisma.todo.findFirst({
      where: { title: settingKey }
    });

    if (existing) {
      await prisma.todo.update({
        where: { id: existing.id },
        data: {
          description: JSON.stringify(payload),
          status: 'OPEN',
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.todo.create({
        data: {
          title: settingKey,
          description: JSON.stringify(payload),
          status: 'OPEN'
        }
      });
    }

    try {
      revalidatePath('/');
      revalidatePath('/custos');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      data: payload,
      message: 'Capital a girar e lucro projetado registrados com sucesso!'
    });
  } catch (error: any) {
    console.error('[API Capital Giro POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

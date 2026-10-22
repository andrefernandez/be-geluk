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

    const settings = await prisma.globalSettings.findFirst();
    const config = (settings?.defaultTarifas as any) || {};
    const data = config[`capital_giro_${month}`] || config['capital_giro_current'];

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum dado de capital a girar registrado ainda para este período.'
      });
    }

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
 * Salva ou atualiza a projeção de capital a girar no sistema em GlobalSettings
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
      dataReferencia,
      dataLimiteGiro,
      dataUltimoDiaUtil,
      rentabilidadeAtual = 0,
      rentabilidadeProjetada = 0,
      lucroLiquidoAtual = 0,
      lucroProjetadoComGiro = 0,
      lucroLiquidoProjetadoFinal = 0,
      updatedBy = 'SmartFactor Automation'
    } = body;

    const payload = {
      month,
      capitalAGirar: Number(capitalAGirar) || 0,
      capitalDoDia: Number(capitalDoDia) || 0,
      dataInicial: dataInicial || dataReferencia,
      dataFinal: dataFinal || dataLimiteGiro,
      dataReferencia,
      dataLimiteGiro,
      dataUltimoDiaUtil,
      rentabilidadeAtual: Number(rentabilidadeAtual || rentabilidadeProjetada) || 0,
      rentabilidadeProjetada: Number(rentabilidadeProjetada || rentabilidadeAtual) || 0,
      lucroLiquidoAtual: Number(lucroLiquidoAtual) || 0,
      lucroProjetadoComGiro: Number(lucroProjetadoComGiro) || 0,
      lucroLiquidoProjetadoFinal: Number(lucroLiquidoProjetadoFinal) || 0,
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    let settings = await prisma.globalSettings.findFirst();
    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: {}
      });
    }

    const currentTarifas = (settings.defaultTarifas as any) || {};
    const updatedTarifas = {
      ...currentTarifas,
      [`capital_giro_${month}`]: payload,
      capital_giro_current: payload
    };

    await prisma.globalSettings.update({
      where: { id: settings.id },
      data: {
        defaultTarifas: updatedTarifas
      }
    });

    try {
      revalidatePath('/');
      revalidatePath('/projecao');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      data: payload,
      message: 'Capital a girar e lucro projetado registrados com sucesso no GlobalSettings!'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month') || searchParams.get('mes');
    const yearParam = searchParams.get('year') || searchParams.get('ano');
    const category = searchParams.get('category') || searchParams.get('categoria');
    const statusParam = searchParams.get('status');

    const now = new Date();
    let y = yearParam ? Number(yearParam) : now.getUTCFullYear();
    let m: number | null = now.getUTCMonth() + 1;

    if (monthParam === 'all') {
      m = null;
    } else if (monthParam) {
      if (monthParam.includes('-')) {
        const parts = monthParam.split('-');
        y = Number(parts[0]);
        m = Number(parts[1]);
      } else {
        m = Number(monthParam);
      }
    }

    const where: any = {};
    if (m !== null) {
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
      where.date = { gte: startOfMonth, lte: endOfMonth };
    } else {
      const startOfYear = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      const endOfYear = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      where.date = { gte: startOfYear, lte: endOfYear };
    }

    if (category) {
      where.category = category.toUpperCase();
    }
    if (statusParam === 'pago') {
      where.paid = true;
    } else if (statusParam === 'pendente') {
      where.paid = false;
    }

    const costs = await prisma.cost.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(costs);
  } catch (error) {
    console.error('Error fetching mobile costs:', error);
    return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cost = await prisma.cost.create({
      data: {
        name: body.name || body.nome,
        amount: Number(body.amount ?? body.valor) || 0,
        date: body.date ? new Date(body.date) : new Date(),
        category: (body.category || body.categoria || 'FIXO').toUpperCase(),
        type: (body.type || body.tipo || 'GERAL').toUpperCase(),
        barcode: body.barcode || null,
        paymentMethod: body.paymentMethod || 'BOLETO',
        pixKey: body.pixKey || null,
        paid: Boolean(body.paid ?? body.pago)
      }
    });
    try {
      revalidatePath('/custos');
      revalidatePath('/');
    } catch (_) {}
    return NextResponse.json(cost);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create cost' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Campo "id" é obrigatório.' }, { status: 400 });
    }
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.amount !== undefined) data.amount = Number(body.amount);
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.category !== undefined) data.category = body.category;
    if (body.type !== undefined) data.type = body.type;
    if (body.barcode !== undefined) data.barcode = body.barcode;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.pixKey !== undefined) data.pixKey = body.pixKey;
    if (body.paid !== undefined) data.paid = Boolean(body.paid);

    const updated = await prisma.cost.update({
      where: { id: String(body.id) },
      data
    });
    try {
      revalidatePath('/custos');
      revalidatePath('/');
    } catch (_) {}
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update cost' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) {
      return NextResponse.json({ error: 'Campo "id" é obrigatório.' }, { status: 400 });
    }
    await prisma.cost.delete({ where: { id: String(id) } });
    try {
      revalidatePath('/custos');
      revalidatePath('/');
    } catch (_) {}
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete cost' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const investors = await prisma.investor.findMany({
      include: {
        transactions: true,
      },
      orderBy: { name: 'asc' },
    });

    const result = investors.map((inv) => {
      const totalInvested = inv.transactions
        .filter((t) => t.type === 'APORTE')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalWithdrawn = inv.transactions
        .filter((t) => t.type === 'RETIRADA')
        .reduce((sum, t) => sum + t.amount, 0);
      const balance = totalInvested - totalWithdrawn;

      return {
        id: inv.id,
        name: inv.name,
        rate: inv.rate,
        type: inv.type,
        startDate: inv.startDate,
        totalInvested,
        totalWithdrawn,
        balance,
        transactionCount: inv.transactions.length,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching investors:', error);
    return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 });
  }
}

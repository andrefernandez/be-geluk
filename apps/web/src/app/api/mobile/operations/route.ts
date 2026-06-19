import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    let dateFilter: any = undefined;

    if (day || monthParam || yearParam) {
      let m = new Date().getUTCMonth() + 1;
      let y = new Date().getUTCFullYear();
      let d = day ? Number(day) : null;

      if (monthParam) {
        if (monthParam.includes('-')) {
          const parts = monthParam.split('-');
          y = Number(parts[0]);
          m = Number(parts[1]);
        } else {
          m = Number(monthParam);
        }
      }
      
      if (yearParam) {
        y = Number(yearParam);
      }

      if (d) {
        // Filter by specific day
        const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
        dateFilter = { gte: startOfDay, lte: endOfDay };
      } else {
        // Filter by entire month
        const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
        dateFilter = { gte: startOfMonth, lte: endOfMonth };
      }
    }

    const queryOptions: any = {
      orderBy: { date: 'desc' },
      include: {
        client: {
          select: { name: true }
        }
      },
    };

    if (dateFilter) {
      queryOptions.where = { date: dateFilter };
      // Limiting to 100 when filtered, or maybe more if needed.
      queryOptions.take = 100;
    } else {
      queryOptions.take = 20; // Default limit without filter
    }

    const operations = await prisma.operation.findMany(queryOptions);
    
    return NextResponse.json(operations);
  } catch (error) {
    console.error('Error fetching operations:', error);
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 });
  }
}

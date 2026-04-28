import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const operations = await prisma.operation.findMany({
      orderBy: { date: 'desc' },
      include: {
        client: {
          select: { name: true }
        }
      },
      take: 20, // Limiting to 20 for the mobile app
    });
    
    return NextResponse.json(operations);
  } catch (error) {
    console.error('Error fetching operations:', error);
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 });
  }
}

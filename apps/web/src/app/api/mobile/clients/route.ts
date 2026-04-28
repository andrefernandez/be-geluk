import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      take: 20, // Limiting to 20 for the mobile app
    });
    
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

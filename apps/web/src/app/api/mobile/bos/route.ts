import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const bos = await prisma.todo.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(bos);
  } catch (error) {
    console.error('Error fetching BOs:', error);
    return NextResponse.json({ error: 'Failed to fetch BOs' }, { status: 500 });
  }
}

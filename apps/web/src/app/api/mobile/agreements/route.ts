import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const agreements = await prisma.agreement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { name: true }
        },
        installments: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });
    
    return NextResponse.json(agreements);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json({ error: 'Failed to fetch agreements' }, { status: 500 });
  }
}

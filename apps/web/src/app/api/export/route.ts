import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month');

        let dateFilter: any = {};
        if (monthParam && monthParam !== "all") {
            const [year, month] = monthParam.split("-");
            const now = new Date(Number(year), Number(month) - 1, 15);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            dateFilter = { gte: startOfMonth, lte: endOfMonth };
        } else if (monthParam === "all") {
            const startOfYear = new Date(2026, 0, 1);
            const endOfYear = new Date(2026, 11, 31, 23, 59, 59);
            dateFilter = { gte: startOfYear, lte: endOfYear };
        } else {
             const now = new Date();
             const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
             const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
             dateFilter = { gte: startOfMonth, lte: endOfMonth };
        }

        const costs = await prisma.cost.findMany({
            where: { date: dateFilter },
            orderBy: { date: 'asc' }
        });

        // Prepare data for Excel
        const excelData = costs.map(cost => ({
            'Data': new Date(cost.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' }),
            'Descrição': cost.name,
            'Categoria': cost.category,
            'Tipo': cost.type,
            'Valor': cost.amount
        }));

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(excelData);
        xlsx.utils.book_append_sheet(wb, ws, "Custos");

        // Write as buffer
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        return new NextResponse(buffer, {
            headers: {
                'Content-Disposition': `attachment; filename="custos-${monthParam || 'atual'}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

    } catch (error) {
        console.error("Export Error:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

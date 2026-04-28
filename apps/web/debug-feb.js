const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const startOfMonth = new Date(2026, 1, 1);
    const endOfMonth = new Date(2026, 2, 0, 23, 59, 59);

    const operations = await prisma.operation.findMany({
        where: {
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        },
        orderBy: { date: "asc" },
    });

    const opsWithRecompra = operations.filter(o => o.recompra);
    const sum = opsWithRecompra.reduce((acc, o) => acc + Math.round((o.recompra || 0) * 100), 0) / 100;

    console.log("Operations matching page logic length:", operations.length);
    console.log("Found recompra values:", opsWithRecompra.map(o => o.recompra));
    console.log("Calculated recompra sum from DB for UI:", sum);
}
main().finally(() => prisma.$disconnect());

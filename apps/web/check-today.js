const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const todayStr = '2026-06-19';
    const startOfToday = new Date(Date.UTC(2026, 5, 19, 0, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(2026, 5, 19, 23, 59, 59, 999));

    const operations = await prisma.operation.findMany({
        where: {
            date: {
                gte: startOfToday,
                lte: endOfToday
            }
        },
        include: { client: true }
    });

    console.log(`Operations found for ${todayStr}:`, operations.length);
    operations.forEach(op => {
        console.log(`  ID: ${op.id} | Client: ${op.client.name} | Bruto: ${op.valorBruto} | Liquido: ${op.valorLiquido}`);
    });
}

run().catch(console.error).finally(() => prisma.$disconnect());

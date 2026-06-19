const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const operations = await prisma.operation.findMany({
        include: { client: true },
        orderBy: { date: 'asc' }
    });

    console.log(`Total operations in DB: ${operations.length}`);

    // Group operations by month in UTC
    const grouped = {};
    operations.forEach(op => {
        const d = new Date(op.date);
        const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!grouped[ym]) grouped[ym] = [];
        grouped[ym].push(op);
    });

    Object.keys(grouped).sort().forEach(ym => {
        console.log(`${ym}: ${grouped[ym].length} operations, total valorBruto: ${grouped[ym].reduce((sum, op) => sum + op.valorBruto, 0)}`);
    });
}

run().catch(console.error).finally(() => prisma.$disconnect());

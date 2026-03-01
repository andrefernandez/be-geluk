import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    let now = new Date();
    // Assuming current month is February 2026 based on local time
    // Let's just fetch all of them and sum globally, and also sum by month
    const operations = await prisma.operation.findMany();

    const sumAllJS = operations.reduce((acc, op) => acc + (Number(op.recompra) || 0), 0);

    // safe sum
    const sumAllSafe = operations.reduce((acc, op) => acc + Math.round((Number(op.recompra) || 0) * 100), 0) / 100;

    console.log("Total DB Recompra (JS addition):", sumAllJS);
    console.log("Total DB Recompra (Safe addition):", sumAllSafe);

    // Group by month
    const byMonth = {};
    operations.forEach(op => {
        if (!op.recompra) return;
        const monthKey = `${op.date.getFullYear()}-${(op.date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!byMonth[monthKey]) byMonth[monthKey] = { js: 0, safe: 0, items: [] };
        byMonth[monthKey].js += Number(op.recompra);
        byMonth[monthKey].safe += Math.round(Number(op.recompra) * 100);
        byMonth[monthKey].items.push(Number(op.recompra));
    });

    for (const [m, data] of Object.entries(byMonth)) {
        console.log(`\nMonth ${m}:`);
        console.log(`  JS sum: ${data.js}`);
        console.log(`  Safe sum: ${(data.safe / 100)}`);
        // Calculate exact using integer addition
        let exact = 0;
        for (let val of data.items) {
            exact += Math.round(val * 100);
        }
        console.log(`  Exact (cents): ${exact / 100}`);
    }
}
main();

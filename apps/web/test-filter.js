const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMonth(monthParam) {
    const [year, month] = monthParam.split("-");
    const y = Number(year);
    const m = Number(month) - 1;
    
    // New UTC-based boundaries
    const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
    endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
    
    console.log(`\n--- Month Parameter: ${monthParam} ---`);
    console.log('startOfMonth:', startOfMonth.toISOString());
    console.log('endOfMonth:', endOfMonth.toISOString());

    const costs = await prisma.cost.findMany({
        where: {
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        }
    });

    console.log(`Prisma query returned ${costs.length} costs.`);
    const sum = costs.reduce((acc, c) => acc + c.amount, 0);
    console.log(`Total amount: ${sum}`);

    const ops = await prisma.operation.findMany({
        where: {
            date: {
                gte: startOfMonth,
                lte: endOfMonth
            }
        }
    });
    const totalOperado = ops.reduce((acc, op) => acc + op.valorBruto, 0);
    const yieldAmount = ops.reduce((acc, op) => acc + (op.fator + op.tarifas + op.adValorem), 0);
    const iof = ops.reduce((acc, op) => acc + (op.iof + op.iofAdicional), 0);
    const receitaBruta = yieldAmount + iof;
    const rate = totalOperado > 0 ? (receitaBruta / totalOperado) * 100 : 0;
    console.log(`Total Operado: ${totalOperado}`);
    console.log(`Receita Bruta: ${receitaBruta}`);
    console.log(`Taxa Retorno: ${rate.toFixed(4)}%`);
}

async function run() {
    await testMonth("2026-05");
    await testMonth("2026-06");
    await testMonth("2026-07");
}

run().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const startOfToday = new Date(Date.UTC(2026, 5, 19, 0, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(2026, 5, 19, 23, 59, 59, 999));

    const operations = await prisma.operation.findMany({
        where: {
            date: {
                gte: startOfToday,
                lte: endOfToday
            }
        }
    });

    const bruto = operations.reduce((acc, op) => acc + op.valorBruto, 0);
    const liquido = operations.reduce((acc, op) => acc + op.valorLiquido, 0);
    
    // Revenue (yield) = fator + tarifas + adValorem
    const yieldAmount = operations.reduce((acc, op) => acc + (op.fator + op.tarifas + op.adValorem), 0);
    const iof = operations.reduce((acc, op) => acc + (op.iof + op.iofAdicional), 0);
    const totalRevenue = yieldAmount + iof; // Receita Bruta

    console.log(`Today's Count: ${operations.length}`);
    console.log(`Today's Bruto: R$ ${bruto}`);
    console.log(`Today's Liquido: R$ ${liquido}`);
    console.log(`Today's Yield (Fator + Tarifas + AdValorem): R$ ${yieldAmount}`);
    console.log(`Today's IOF: R$ ${iof}`);
    console.log(`Today's Receita Bruta (Yield + IOF): R$ ${totalRevenue}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());

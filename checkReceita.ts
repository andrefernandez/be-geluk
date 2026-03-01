import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.999Z');
    const ops = await prisma.operation.findMany({ where: { date: { gte: start, lte: end } } });

    const sum = ops.reduce((acc, o) => acc + Math.round((Number(o.fator) + Number(o.tarifas) + Number(o.adValorem) + Number(o.iof) + Number(o.iofAdicional)) * 100), 0) / 100;
    console.log('Receita Bruta: ', sum);
}
run().finally(() => prisma.$disconnect());

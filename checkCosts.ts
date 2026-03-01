import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCosts() {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.999Z');
    const costs = await prisma.cost.findMany({ where: { date: { gte: start, lte: end } } });
    console.log('Impostos manuais Jan:');
    costs.filter(c => c.category === 'IMPOSTO').forEach(c => console.log(c.name, c.amount));
    console.log('---');
    console.log('Todos os Custos Jan:');
    costs.forEach(c => console.log(c.category, c.name, c.amount));
}
checkCosts().finally(() => prisma.$disconnect());

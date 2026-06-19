const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const costs = await prisma.cost.findMany({
        orderBy: { date: 'asc' }
    });

    console.log(`Total costs in DB: ${costs.length}`);

    // Let's filter for May and June
    const mayCosts = costs.filter(c => {
        const d = new Date(c.date);
        return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 4;
    });

    const juneCosts = costs.filter(c => {
        const d = new Date(c.date);
        return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 5;
    });

    console.log(`\nMay 2026 Costs (Total: ${mayCosts.length}):`);
    mayCosts.forEach(c => {
        console.log(`  ID: ${c.id} | Name: ${c.name} | Amount: ${c.amount} | Date: ${c.date.toISOString()} | Cat: ${c.category}`);
    });

    console.log(`\nJune 2026 Costs (Total: ${juneCosts.length}):`);
    juneCosts.forEach(c => {
        console.log(`  ID: ${c.id} | Name: ${c.name} | Amount: ${c.amount} | Date: ${c.date.toISOString()} | Cat: ${c.category}`);
    });
}

run().catch(console.error).finally(() => prisma.$disconnect());

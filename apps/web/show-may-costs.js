const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const costs = await prisma.cost.findMany();
    console.log(`Total costs in DB: ${costs.length}`);
    
    // Group costs by year-month in UTC
    const grouped = {};
    costs.forEach(c => {
        const d = new Date(c.date);
        const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!grouped[ym]) grouped[ym] = [];
        grouped[ym].push(c);
    });

    console.log('Grouped by Month (UTC):');
    Object.keys(grouped).sort().forEach(ym => {
        console.log(`${ym}: ${grouped[ym].length} costs, total amount: ${grouped[ym].reduce((sum, c) => sum + c.amount, 0)}`);
    });

    console.log('\nDetails for May 2026 (UTC):');
    const may2026 = grouped['2026-05'] || [];
    may2026.forEach(c => {
        console.log(`ID: ${c.id} | Name: ${c.name} | Amount: ${c.amount} | Date: ${c.date.toISOString()} | Type: ${c.type} | Category: ${c.category}`);
    });

    console.log('\nDetails for June 2026 (UTC):');
    const june2026 = grouped['2026-06'] || [];
    june2026.forEach(c => {
        console.log(`ID: ${c.id} | Name: ${c.name} | Amount: ${c.amount} | Date: ${c.date.toISOString()} | Type: ${c.type} | Category: ${c.category}`);
    });
}

run().catch(console.error).finally(() => prisma.$disconnect());

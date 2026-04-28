const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findBeto() {
    const investors = await prisma.investor.findMany({
        include: { transactions: { orderBy: { date: 'asc' } } }
    });
    const beto = investors.find(i => i.name.toLowerCase().includes('beto') || i.name.toLowerCase().includes('berto'));
    if (beto) {
        console.log(`Found: ${beto.name} (ID: ${beto.id})`);
        console.log(`Type: ${beto.type}, Rate: ${beto.rate}`);
        beto.transactions.forEach(t => {
            console.log(`- ${t.date.toISOString().split('T')[0]} | ${t.type} | ${t.amount} | Mod: ${t.modalidade} | Rate: ${t.rate}`);
        });
    } else {
        console.log('No investor named Beto or Berto found.');
        console.log('List of all investors:');
        investors.forEach(i => console.log(`- ${i.name}`));
    }
}

findBeto().finally(() => prisma.$disconnect());

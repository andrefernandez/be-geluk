const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBeto() {
    const beto = await prisma.investor.findFirst({
        where: { name: { contains: 'Beto', mode: 'insensitive' } },
        include: { transactions: { orderBy: { date: 'asc' } } }
    });

    if (!beto) {
        console.log('Beto not found');
        return;
    }

    console.log(`Investor: ${beto.name} (Type: ${beto.type}, Rate: ${beto.rate}%)`);
    console.log('Transactions:');
    beto.transactions.forEach(tx => {
        console.log(`${tx.date.toISOString().split('T')[0]} | ${tx.type} | ${tx.amount} | Rate: ${tx.rate} | Mod: ${tx.modalidade}`);
    });
}

checkBeto().finally(() => prisma.$disconnect());

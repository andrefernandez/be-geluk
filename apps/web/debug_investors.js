const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllData() {
    try {
        const count = await prisma.investor.count();
        console.log(`Investors count: ${count}`);

        const all = await prisma.investor.findMany({
            take: 5
        });
        console.log('Sample investors:');
        console.log(all.map(i => i.name));

        const beto = await prisma.investor.findFirst({
            where: { name: { contains: 'Beto', mode: 'insensitive' } },
            include: { transactions: { orderBy: { date: 'asc' } } }
        });
        if (beto) {
            console.log(`Found Beto: ${beto.name}`);
            beto.transactions.forEach(tx => {
                console.log(`${tx.date.toISOString()} | ${tx.type} | ${tx.amount} | Rate: ${tx.rate}`);
            });
        } else {
            console.log('Beto not found in findFirst');
        }
    } catch (e) {
        console.error(e);
    }
}

checkAllData().finally(() => prisma.$disconnect());

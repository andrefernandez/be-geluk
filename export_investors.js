const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
    try {
        const investors = await prisma.investor.findMany({
            include: { transactions: { orderBy: { date: 'asc' } } }
        });
        fs.writeFileSync('investors_data.json', JSON.stringify(investors, null, 2));
        console.log('Success - data written to investors_data.json');
    } catch (e) {
        fs.writeFileSync('error.txt', e.stack);
        console.log('Error - ' + e.message);
    }
}

run().finally(() => prisma.$disconnect());

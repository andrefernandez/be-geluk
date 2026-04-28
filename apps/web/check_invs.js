const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function check() {
    try {
        const invs = await prisma.investor.findMany({
            include: { transactions: true }
        });
        const output = invs.map(i => {
            const totalAportes = i.transactions.filter(t => t.type === 'APORTE').reduce((a, b) => a + b.amount, 0);
            return `${i.name}: Aportes Total: ${totalAportes}`;
        }).join('\n');
        fs.writeFileSync('check_results.txt', output);
        console.log('Results written');
    } catch (e) {
        fs.writeFileSync('check_results.txt', 'Error: ' + e.message);
    }
}

check().finally(() => prisma.$disconnect());

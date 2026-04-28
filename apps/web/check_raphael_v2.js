console.log("STARTING SCRIPT...");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRafael() {
    const allInvestors = await prisma.investor.findMany({
        include: { transactions: true }
    });

    console.log(`Searching in ${allInvestors.length} investors...`);

    const rafael = allInvestors.find(i =>
        i.name.toLowerCase().includes('raphael') ||
        i.name.toLowerCase().includes('rafael')
    );

    if (!rafael) {
        console.log("No Rafael/Raphael found. List of all investors:");
        allInvestors.forEach(i => console.log(`- ${i.name}`));
        return;
    }

    console.log(`Investor Found: ${rafael.name}`);
    rafealData(rafael);
}

function rafealData(investor) {
    console.log(`\n--- ${investor.name} ---`);
    console.log(`Global Rate: ${investor.rate}%`);
    console.log(`Global Rule: ${investor.type}`);
    console.log("Transactions:");
    investor.transactions.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(tx => {
        console.log(`- Date: ${tx.date.toISOString()} | Type: ${tx.type.padEnd(14)} | Amount: ${tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | Rate: ${tx.rate || '-'}% | Rule: ${tx.modalidade || '-'}`);
    });
}

checkRafael().finally(() => prisma.$disconnect());

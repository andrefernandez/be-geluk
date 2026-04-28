const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransactions() {
    console.log("Starting...");
    try {
        const count = await prisma.investmentTransaction.count();
        console.log("Total InvestmentTransactions local count:", count);
    } catch (e) {
        console.error("ERRO:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
checkTransactions();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listInvestors() {
    const investors = await prisma.investor.findMany({
        select: { id: true, name: true }
    });
    console.log(JSON.stringify(investors, null, 2));
}

listInvestors().finally(() => prisma.$disconnect());

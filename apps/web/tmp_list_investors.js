const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const investors = await prisma.investor.findMany();
    console.log(JSON.stringify(investors, null, 2));
}

main().finally(() => prisma.$disconnect());

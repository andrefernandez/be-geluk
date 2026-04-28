const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
    const investors = await prisma.investor.findMany();
    const names = investors.map(i => i.name).join('\n');
    fs.writeFileSync('investor_names.txt', names);
}

run().finally(() => prisma.$disconnect());

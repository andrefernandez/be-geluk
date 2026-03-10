require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting DB update, checking URL:", process.env.DATABASE_URL ? "Exists" : "Missing");
    const result = await prisma.operation.updateMany({
        where: {},
        data: { declarada: true }
    });
    console.log(`Successfully updated ${result.count} operations.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

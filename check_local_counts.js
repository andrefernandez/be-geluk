const { PrismaClient } = require('@prisma/client');

async function checkData() {
    console.log("Initializing Prisma Client...");
    const prisma = new PrismaClient();
    try {
        console.log("Fetching counts...");
        const counts = {
            clients: await prisma.client.count(),
            investors: await prisma.investor.count(),
            operations: await prisma.operation.count(),
            costs: await prisma.cost.count(),
            users: await prisma.user.count()
        };
        console.log("Counts:", JSON.stringify(counts));
    } catch (e) {
        console.log("Error caught:", e.name, e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();

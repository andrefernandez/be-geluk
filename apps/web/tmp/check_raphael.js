console.log("START SCRIPT");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("FETCHING...");
    const invs = await prisma.investor.findMany({
        include: { transactions: true }
    });
    console.log("RESULTS:", JSON.stringify(invs, null, 2));
    process.exit(0);
}
main().catch(err => {
    console.error("ERROR:", err);
    process.exit(1);
});

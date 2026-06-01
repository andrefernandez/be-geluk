const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    // 1. Clean up the previous bad copies
    console.log("Cleaning up incorrect June/July copies...");
    const deleteResult = await prisma.cost.deleteMany({
        where: {
            date: {
                gte: new Date('2026-06-01T00:00:00.000Z')
            }
        }
    });
    console.log(`Deleted ${deleteResult.count} incorrect cost records.`);

    // 2. Fetch costs for May 2026 in UTC
    console.log("Fetching costs for May 2026...");
    const startMay = new Date('2026-05-01T00:00:00.000Z');
    const endMay = new Date('2026-05-31T23:59:59.999Z');
    
    const mayCosts = await prisma.cost.findMany({
        where: {
            date: {
                gte: startMay,
                lte: endMay
            }
        }
    });

    console.log(`Found ${mayCosts.length} costs in May 2026 in UTC.`);

    if (mayCosts.length === 0) {
        console.log("No costs found in May 2026 to copy!");
        return;
    }

    // 3. Map costs to June using setUTCMonth to avoid timezone issues
    const juneCostsData = mayCosts.map(cost => {
        const originalDate = new Date(cost.date);
        const juneDate = new Date(originalDate);
        // Change month from May (4) to June (5) in UTC
        juneDate.setUTCMonth(5); 

        return {
            name: cost.name,
            amount: cost.amount,
            type: cost.type,
            category: cost.category,
            date: juneDate
        };
    });

    console.log("Copying costs to June 2026 (using UTC)...");
    const result = await prisma.cost.createMany({
        data: juneCostsData
    });

    console.log(`Successfully copied ${result.count} costs to June 2026.`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

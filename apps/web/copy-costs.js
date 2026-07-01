const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    // 1. Clean up the previous bad copies in July 2026
    console.log("Cleaning up incorrect July copies...");
    const deleteResult = await prisma.cost.deleteMany({
        where: {
            date: {
                gte: new Date('2026-07-01T00:00:00.000Z'),
                lte: new Date('2026-07-31T23:59:59.999Z')
            }
        }
    });
    console.log(`Deleted ${deleteResult.count} incorrect cost records in July.`);

    // 2. Fetch costs for June 2026 in UTC
    console.log("Fetching costs for June 2026...");
    const startJune = new Date('2026-06-01T00:00:00.000Z');
    const endJune = new Date('2026-06-30T23:59:59.999Z');
    
    const juneCosts = await prisma.cost.findMany({
        where: {
            date: {
                gte: startJune,
                lte: endJune
            }
        }
    });

    console.log(`Found ${juneCosts.length} costs in June 2026 in UTC.`);

    if (juneCosts.length === 0) {
        console.log("No costs found in June 2026 to copy!");
        return;
    }

    // 3. Map costs to July using setUTCMonth to avoid timezone issues
    const julyCostsData = juneCosts.map(cost => {
        const originalDate = new Date(cost.date);
        const julyDate = new Date(originalDate);
        // Change month from June (5) to July (6) in UTC
        julyDate.setUTCMonth(6); 

        return {
            name: cost.name,
            amount: cost.amount,
            type: cost.type,
            category: cost.category,
            date: julyDate
        };
    });

    console.log("Copying costs to July 2026 (using UTC)...");
    const result = await prisma.cost.createMany({
        data: julyCostsData
    });

    console.log(`Successfully copied ${result.count} costs to July 2026.`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

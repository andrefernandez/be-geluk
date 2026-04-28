const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('Connecting...');
        const count = await prisma.operation.count();
        console.log('Count:', count);
        const ops = await prisma.operation.findMany({ take: 5 });
        console.log('Sample IDs:', ops.map(o => o.id));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}
check();

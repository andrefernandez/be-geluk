import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const ops = await prisma.operation.findMany();
    console.log(ops.map(o => ({
        id: o.id,
        valorBruto: o.valorBruto,
        type: typeof o.valorBruto
    })));
}
main();

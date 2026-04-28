const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateSQL() {
    try {
        const operations = await prisma.operation.findMany();

        console.log('-- SQL Script to update operation percentages');
        console.log('BEGIN;');

        operations.forEach(op => {
            const bruto = op.valorBruto || 0;
            if (bruto > 0) {
                const percentual = ((op.fator / bruto) * 100).toFixed(2);
                const percentualTarifas = ((op.tarifas / bruto) * 100).toFixed(2);
                const percentualAdValorem = ((op.adValorem / bruto) * 100).toFixed(2);

                console.log(`UPDATE "Operation" SET "percentual" = ${percentual}, "percentualTarifas" = ${percentualTarifas}, "percentualAdValorem" = ${percentualAdValorem} WHERE "id" = '${op.id}';`);
            }
        });

        console.log('COMMIT;');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateSQL();

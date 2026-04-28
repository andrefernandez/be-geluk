const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function fixPercentages() {
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync('fix_log.txt', msg + '\n');
    };

    log("Iniciando a atualização das porcentagens das operações...");

    try {
        const operations = await prisma.operation.findMany();
        log(`Encontradas ${operations.length} operações.`);

        let updatedCount = 0;
        for (const op of operations) {
            const bruto = op.valorBruto || 0;
            if (bruto === 0) continue;

            const newPercentFator = parseFloat(((op.fator / bruto) * 100).toFixed(2));
            const newPercentTarifas = parseFloat(((op.tarifas / bruto) * 100).toFixed(2));
            const newPercentAdValorem = parseFloat(((op.adValorem / bruto) * 100).toFixed(2));

            const needsUpdate =
                op.percentual !== newPercentFator ||
                op.percentualTarifas !== newPercentTarifas ||
                op.percentualAdValorem !== newPercentAdValorem;

            if (needsUpdate) {
                await prisma.operation.update({
                    where: { id: op.id },
                    data: {
                        percentual: newPercentFator,
                        percentualTarifas: newPercentTarifas,
                        percentualAdValorem: newPercentAdValorem
                    }
                });
                updatedCount++;
            }
        }

        log(`\nSucesso! ${updatedCount} operações foram corrigidas.`);
    } catch (error) {
        log("Erro durante a atualização: " + error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixPercentages();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function exportToSQL() {
    const clients = await prisma.client.findMany();
    const investors = await prisma.investor.findMany();
    const operations = await prisma.operation.findMany();
    const costs = await prisma.cost.findMany();
    const users = await prisma.user.findMany();

    let sql = "";

    // 1. Usuarios
    for (const u of users) {
        sql += `INSERT INTO "User" (id, name, email, password, role, "investorId", "createdAt", "updatedAt") VALUES ('${u.id}', '${u.name}', '${u.email}', '${u.password}', '${u.role}', ${u.investorId ? `'${u.investorId}'` : 'NULL'}, '${u.createdAt.toISOString()}', '${u.updatedAt.toISOString()}');\n`;
    }

    // 2. Clientes
    for (const c of clients) {
        sql += `INSERT INTO "Client" (id, name, "createdAt", "updatedAt") VALUES ('${c.id}', '${c.name}', '${c.createdAt.toISOString()}', '${c.updatedAt.toISOString()}');\n`;
    }

    // 3. Investidores
    for (const i of investors) {
        sql += `INSERT INTO "Investor" (id, name, rate, type, "startDate", "userId", "createdAt", "updatedAt") VALUES ('${i.id}', '${i.name}', ${i.rate || 'NULL'}, '${i.type}', ${i.startDate ? `'${i.startDate.toISOString()}'` : 'NULL'}, ${i.userId ? `'${i.userId}'` : 'NULL'}, '${i.createdAt.toISOString()}', '${i.updatedAt.toISOString()}');\n`;
    }

    // 4. Operações
    for (const op of operations) {
        sql += `INSERT INTO "Operation" (id, "clientId", date, "valorBruto", fator, percentual, "percentualPrazo", dias, tarifas, "percentualTarifas", "adValorem", "percentualAdValorem", irpj, iof, "iofAdicional", "valorLiquido", recompra, "createdAt", "updatedAt") VALUES ('${op.id}', '${op.clientId}', '${op.date.toISOString()}', ${op.valorBruto}, ${op.fator}, ${op.percentual}, ${op.percentualPrazo}, ${op.dias}, ${op.tarifas}, ${op.percentualTarifas || 'NULL'}, ${op.adValorem}, ${op.percentualAdValorem || 'NULL'}, ${op.irpj || 'NULL'}, ${op.iof || 'NULL'}, ${op.iofAdicional || 'NULL'}, ${op.valorLiquido}, ${op.recompra || 'NULL'}, '${op.createdAt.toISOString()}', '${op.updatedAt.toISOString()}');\n`;
    }

    // 5. Custos
    for (const c of costs) {
        sql += `INSERT INTO "Cost" (id, name, amount, date, type, category, "createdAt", "updatedAt") VALUES ('${c.id}', '${c.name}', ${c.amount}, '${c.date.toISOString()}', '${c.type}', '${c.category}', '${c.createdAt.toISOString()}', '${c.updatedAt.toISOString()}');\n`;
    }

    console.log(sql);
}

async function run() {
    try {
        console.log("-- COMEÇANDO EXPORTAÇÃO");
        await exportToSQL();
        console.log("-- EXPORTAÇÃO CONCLUÍDA");
    } catch (e) {
        console.error("-- ERRO NA EXPORTAÇÃO:", e);
        process.exit(1);
    }
}

run();

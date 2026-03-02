const { PrismaClient: PrismaSQLite } = require('./node_modules/@prisma/client');
const { PrismaClient: PrismaPostgres } = require('@prisma/client');

// Forçamos o uso das URLs que funcionam para o Neon
const DATABASE_URL = "postgresql://neondb_owner:npg_Pl3dRxUY6uwv@ep-muddy-block-ai29otkv-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function migrate() {
    // 1. Conexão com SQLite local (usando o builder antigo do Prisma se necessário ou apenas o novo)
    console.log("Conectando ao SQLite local...");
    const sqlite = new PrismaSQLite({
        datasources: { db: { url: 'file:./prisma/dev.db' } }
    });

    // 2. Conexão com o Neon (Postgres)
    console.log("Conectando ao Neon...");
    const pg = new PrismaPostgres({
        datasources: { db: { url: DATABASE_URL } }
    });

    try {
        // --- CLIENTES ---
        console.log("Migrando Clientes...");
        const clients = await sqlite.client.findMany();
        for (const c of clients) {
            await pg.client.upsert({ where: { id: c.id }, update: {}, create: c });
        }

        // --- INVESTIDORES ---
        console.log("Migrando Investidores...");
        const investors = await sqlite.investor.findMany();
        for (const i of investors) {
            await pg.investor.upsert({ where: { id: i.id }, update: {}, create: i });
        }

        // --- USUÁRIOS ---
        console.log("Migrando Usuários...");
        const users = await sqlite.user.findMany();
        for (const u of users) {
            await pg.user.upsert({ where: { id: u.id }, update: {}, create: u });
        }

        // --- OPERAÇÕES ---
        console.log("Migrando Operações...");
        const operations = await sqlite.operation.findMany();
        await pg.operation.createMany({ data: operations, skipDuplicates: true });

        // --- CUSTOS ---
        console.log("Migrando Custos...");
        const costs = await sqlite.cost.findMany();
        await pg.cost.createMany({ data: costs, skipDuplicates: true });

        // --- TRANSAÇÕES DE INVESTIMENTO ---
        console.log("Migrando Transações...");
        const txs = await sqlite.investmentTransaction.findMany();
        await pg.investmentTransaction.createMany({ data: txs, skipDuplicates: true });

        console.log("MIGRAÇÃO CONCLUÍDA COM SUCESSO!");

    } catch (error) {
        console.error("ERRO NA MIGRAÇÃO:", error);
    } finally {
        await sqlite.$disconnect();
        await pg.$disconnect();
    }
}

migrate();

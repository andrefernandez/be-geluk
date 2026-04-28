import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });

async function run() {
    try {
        await client.connect();
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS "GlobalSettings" (
                "id" TEXT NOT NULL,
                "defaultFator" DOUBLE PRECISION,
                "defaultAdValorem" DOUBLE PRECISION,
                "defaultIof" DOUBLE PRECISION,
                "defaultIofAdicional" DOUBLE PRECISION,
                "defaultTarifas" JSONB,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
            );
        `);
        
        // Seed initial row if empty
        const res = await client.query(`SELECT count(*) as count FROM "GlobalSettings"`);
        if (res.rows[0].count == 0) {
            await client.query(`
                INSERT INTO "GlobalSettings" ("id", "defaultFator", "updatedAt") 
                VALUES ('default_1', 8.5, NOW())
            `);
            console.log("GlobalSettings table created and seeded successfully.");
        } else {
            console.log("GlobalSettings table already exists and forms are seeded.");
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();

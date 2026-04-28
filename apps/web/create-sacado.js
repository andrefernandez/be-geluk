require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Sacado" (
          "id" TEXT NOT NULL,
          "operationId" TEXT NOT NULL,
          "nome" TEXT NOT NULL,
          "cnpj" TEXT,
          "valor" DOUBLE PRECISION,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Sacado_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Sacado table created');

    // Add foreign key if not exists (handling error if already exists)
    try {
        await pool.query(`
            ALTER TABLE "Sacado" ADD CONSTRAINT "Sacado_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
        console.log('Foreign key added');
    } catch (e) {
        if (e.code === '42710') { // duplicate_object
            console.log('Foreign key already exists');
        } else {
            throw e;
        }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}
run();

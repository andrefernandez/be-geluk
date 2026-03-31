const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_Pl3dRxUY6uwv@ep-muddy-block-ai29otkv-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function addClientRates() {
  try {
    await client.connect();
    console.log('Connected to DB');
    
    await client.query(`
      ALTER TABLE "Client"
      ADD COLUMN IF NOT EXISTS "taxaFator" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "taxaAdValorem" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "taxaTarifa" DOUBLE PRECISION;
    `);
    
    console.log('Successfully added taxaFator, taxaAdValorem, and taxaTarifa to Client table');
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

addClientRates();

const bcrypt = require('bcryptjs');

async function generateHash() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);
    console.log("\n--- NOVO COMANDO SQL PARA O NEON ---\n");
    console.log(`UPDATE "User" SET password = '${hash}' WHERE email = 'admin@begeluk.com';`);
    console.log("\n------------------------------------\n");
}

generateHash();

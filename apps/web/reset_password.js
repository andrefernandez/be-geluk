const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const email = "leonardo@gelukbank.com.br";
    const newPasswordPlain = "geluk1234";
    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);

    await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });

    console.log(`Password for ${email} successfully reset to: ${newPasswordPlain}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

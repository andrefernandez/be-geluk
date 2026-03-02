const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const investors = await prisma.investor.findMany();

    for (const investor of investors) {
        const email = `${investor.name.toLowerCase()}@geluk.com.br`;
        const passwordPlain = `${investor.name.toLowerCase()}123`;
        const hashedPassword = await bcrypt.hash(passwordPlain, 10);

        console.log(`Processing ${investor.name}...`);

        // Create or update user
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                name: investor.name,
                password: hashedPassword,
                role: "INVESTOR",
                investorId: investor.id
            },
            create: {
                name: investor.name,
                email,
                password: hashedPassword,
                role: "INVESTOR",
                investorId: investor.id
            }
        });

        // Link investor back to user
        await prisma.investor.update({
            where: { id: investor.id },
            data: { userId: user.id }
        });

        console.log(`Created/Updated user for ${investor.name}: ${email} / ${passwordPlain}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

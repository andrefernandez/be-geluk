const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'admin@geluk.com.br' },
        update: {
            password: hashedPassword,
            role: 'ADMIN'
        },
        create: {
            name: 'Administrador',
            email: 'admin@geluk.com.br',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });
    console.log('Usuário Admin criado/resetado com sucesso!');
    console.log('Email: admin@geluk.com.br');
    console.log('Senha: admin123');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

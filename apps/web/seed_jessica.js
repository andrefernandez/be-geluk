const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'jessica@gelukbank.com.br';
  const password = 'jessica123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'COMERCIAL',
    },
    create: {
      email,
      name: 'Jessica Comercial',
      password: hashedPassword,
      role: 'COMERCIAL',
    },
  });

  console.log('User Jessica created/updated:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

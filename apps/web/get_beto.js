const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBeto() {
    try {
        const investors = await prisma.investor.findMany({
            where: { name: { contains: 'Beto', mode: 'insensitive' } },
            include: { transactions: { orderBy: { date: 'asc' } } }
        });

        if (investors.length === 0) {
            console.log("Nenhum investidor Beto encontrado.");
            return;
        }

        investors.forEach(inv => {
            console.log(`\nInvestidor: ${inv.name}`);
            console.log(`Taxa: ${inv.rate}%`);
            console.log(`Tipo: ${inv.type}`);
            console.log(`Início: ${inv.startDate || 'Não definido'}`);
            console.log("Transações:");
            inv.transactions.forEach(t => {
                console.log(`- ${t.date.toISOString().split('T')[0]} | ${t.type} | R$ ${t.amount} | Mod: ${t.modalidade || '-'}`);
            });
        });
    } catch (e) {
        console.error("Erro ao buscar dados:", e);
    }
}

checkBeto().finally(() => prisma.$disconnect());

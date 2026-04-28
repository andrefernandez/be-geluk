import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkJan() {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.999Z');

    const ops = await prisma.operation.findMany({ where: { date: { gte: start, lte: end } } });
    const costs = await prisma.cost.findMany({ where: { date: { gte: start, lte: end } } });

    const safeSumOperations = (key: string) => ops.reduce((acc, op) => acc + Math.round((Number((op as any)[key]) || 0) * 100), 0) / 100;
    const safeSumList = (list: any[]) => list.reduce((acc, c) => acc + Math.round((Number(c.amount) || 0) * 100), 0) / 100;

    const totalOperado = safeSumOperations('valorBruto');

    const fator = safeSumOperations('fator');
    const tarifas = safeSumOperations('tarifas');
    const adValorem = safeSumOperations('adValorem');
    const iof = safeSumOperations('iof');
    const iofAdicional = safeSumOperations('iofAdicional');

    const receitaBruta = (Math.round((fator + tarifas + adValorem + iof + iofAdicional) * 100)) / 100;

    const custosFixos = safeSumList(costs.filter(c => c.category === 'FIXO'));
    const custosVariaveis = safeSumList(costs.filter(c => c.category === 'VARIAVEL'));
    const impostosList = costs.filter(c => c.category === 'IMPOSTO');
    const impostosRegistrados = safeSumList(impostosList);
    const investidoresTotal = safeSumList(costs.filter(c => c.category === 'INVESTIDORES'));

    const iofTotal = (Math.round((iof + iofAdicional) * 100)) / 100;

    const lucroLiquido = receitaBruta - custosFixos - custosVariaveis - impostosRegistrados - investidoresTotal - iofTotal;

    console.log({
        totalOperado,
        fator, tarifas, adValorem, iof, iofAdicional, iofTotal,
        receitaBruta,
        custosFixos, custosVariaveis, impostosRegistrados, investidoresTotal,
        lucroLiquido
    });
}

checkJan().finally(() => prisma.$disconnect());

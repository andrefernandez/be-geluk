const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRafael() {
    const rafael = await prisma.investor.findFirst({
        where: { name: { contains: 'Raphael' } },
        include: { transactions: true }
    });

    if (!rafael) return;

    console.log(`\n--- V3 LOGIC CALCULATION FOR ${rafael.name} ---`);
    let runningBalance = 0;
    const sorted = rafael.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let lastCalcDate = new Date(sorted[0].date);
    let currentMode = rafael.type;
    let currentRate = rafael.rate || 1.7;

    sorted.forEach(tx => {
        const txDate = new Date(tx.date);

        // 1. Anniversary Logic
        let monthsPassed = (txDate.getUTCFullYear() - lastCalcDate.getUTCFullYear()) * 12 + (txDate.getUTCMonth() - lastCalcDate.getUTCMonth());
        if (txDate.getUTCDate() < lastCalcDate.getUTCDate()) {
            monthsPassed--;
        }
        monthsPassed = Math.max(0, monthsPassed);

        if (monthsPassed > 0 && runningBalance > 0) {
            const i = currentRate / 100;
            const oldBal = runningBalance;
            if (currentMode === "REINVESTIMENTO") {
                runningBalance *= Math.pow(1 + i, monthsPassed);
            } else {
                runningBalance += (runningBalance * i * monthsPassed);
            }
            console.log(`[CREDIT] Months: ${monthsPassed} | Interest: ${(runningBalance - oldBal).toFixed(2)} | Balance now: ${runningBalance.toFixed(2)}`);
            lastCalcDate.setUTCMonth(lastCalcDate.getUTCMonth() + monthsPassed);
        }

        // 2. Apply Transaction
        if (tx.type === "APORTE") {
            runningBalance += tx.amount;
            if (tx.modalidade) currentMode = tx.modalidade;
            if (tx.rate !== null && tx.rate !== undefined) currentRate = tx.rate;
        } else if (tx.type === "RETIRADA") {
            runningBalance -= tx.amount;
        } else if (tx.type === "MUDANCA_REGRA") {
            if (tx.modalidade) currentMode = tx.modalidade;
            if (tx.rate !== null && tx.rate !== undefined) currentRate = tx.rate;
        }

        console.log(`[${txDate.toISOString().split('T')[0]}] ${tx.type.padEnd(14)} | Amount: ${tx.amount.toFixed(2)} | Balance: ${runningBalance.toFixed(2)} | Base: ${lastCalcDate.toISOString().split('T')[0]}`);
    });

    console.log(`\nFinal Result: R$ ${runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

checkRafael().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRafael() {
    const rafael = await prisma.investor.findFirst({
        where: { name: { contains: 'Raphael' } },
        include: { transactions: true }
    });

    if (!rafael) return;

    console.log(`\n--- DUP-BY-STEP CALCULATION FOR ${rafael.name} ---`);
    let balance = 0;
    let lastDate = new Date(rafael.transactions.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date);
    let rate = 0.017;
    let rule = "REINVESTIMENTO";

    const sorted = rafael.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(tx => {
        let txDate = new Date(tx.date);

        // Anniversary months
        let months = (txDate.getUTCFullYear() - lastDate.getUTCFullYear()) * 12 + (txDate.getUTCMonth() - lastDate.getUTCMonth());
        if (txDate.getUTCDate() < lastDate.getUTCDate()) months--;
        months = Math.max(0, months);

        let interest = 0;
        if (months > 0 && balance > 0) {
            let oldBal = balance;
            if (rule === "REINVESTIMENTO") {
                balance *= Math.pow(1 + rate, months);
            } else {
                balance += balance * rate * months;
            }
            interest = balance - oldBal;
        }

        console.log(`[${txDate.toISOString().split('T')[0]}] ${tx.type.padEnd(10)} | Prin Before: ${balance.toFixed(2)} | Months: ${months} | Interest: ${interest.toFixed(2)} | Tx: ${tx.amount}`);

        if (tx.type === "APORTE") balance += tx.amount;
        else if (tx.type === "RETIRADA") balance -= tx.amount;

        if (tx.modalidade) rule = tx.modalidade;
        if (tx.rate) rate = tx.rate / 100;

        lastDate = txDate;
        console.log(`            | Prin After: ${balance.toFixed(2)}`);
    });

    console.log(`\nFinal Balance on last TX: ${balance.toFixed(2)}`);
}

checkRafael().finally(() => prisma.$disconnect());

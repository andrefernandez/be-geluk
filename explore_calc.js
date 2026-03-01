
function calculate(investor) {
    let principal = 0;
    let totalInterest = 0;
    let sorted = [...investor.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let currentRate = 0.017;
    let currentRule = "REINVESTIMENTO";

    let d = new Date(sorted[0].date);
    let runningDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    let targetDate = new Date(2024, 10, 6);

    let txIdx = 0;
    let monthlyBalanceSum = 0;
    let daysInMonth = 0;

    while (runningDate <= targetDate) {
        // Process txs for today
        while (txIdx < sorted.length && new Date(sorted[txIdx].date).toISOString().split('T')[0] === runningDate.toISOString().split('T')[0]) {
            let tx = sorted[txIdx];
            if (tx.type === "APORTE") principal += tx.amount;
            else if (tx.type === "RETIRADA") principal -= tx.amount;

            if (tx.modalidade) currentRule = tx.modalidade;
            if (tx.rate) currentRate = tx.rate / 100;
            txIdx++;
        }

        monthlyBalanceSum += principal;
        daysInMonth++;

        let tomorrow = new Date(runningDate);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (tomorrow.getMonth() !== runningDate.getMonth() || tomorrow > targetDate) {
            // End of month or end of period. Calculate month's interest
            let avgBal = monthlyBalanceSum / daysInMonth;
            let interest = avgBal * currentRate;
            totalInterest += interest;

            if (currentRule === "REINVESTIMENTO") {
                // Compounding the monthly profit into principal for the next month
                principal += interest;
            }

            monthlyBalanceSum = 0;
            daysInMonth = 0;
        }

        runningDate = tomorrow;
    }

    return principal;
}

const raphael = {
    transactions: [
        { date: "2023-06-16", type: "APORTE", amount: 50000 },
        { date: "2023-08-17", type: "APORTE", amount: 35000, rate: 1.7, modalidade: "REINVESTIMENTO" },
        { date: "2023-11-17", type: "APORTE", amount: 60000, rate: 1.7, modalidade: "REINVESTIMENTO" },
        { date: "2024-06-03", type: "RETIRADA", amount: 5000 },
        { date: "2024-08-05", type: "RETIRADA", amount: 20000 },
        { date: "2024-10-07", type: "RETIRADA", amount: 5000 },
        { date: "2024-11-06", type: "MUDANCA_REGRA", amount: 0, modalidade: "RETIRADA" }
    ]
};

console.log("Monthly Avg Balance Pro-rata:", calculate(raphael));

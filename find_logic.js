
function solve() {
    const txs = [
        { date: "2023-06-16", type: "APORTE", amount: 50000 },
        { date: "2023-08-17", type: "APORTE", amount: 35000, rate: 1.7, modalidade: "REINVESTIMENTO" },
        { date: "2023-11-17", type: "APORTE", amount: 60000, rate: 1.7, modalidade: "REINVESTIMENTO" },
        { date: "2024-06-03", type: "RETIRADA", amount: 5000 },
        { date: "2024-08-05", type: "RETIRADA", amount: 20000 },
        { date: "2024-10-07", type: "RETIRADA", amount: 5000 },
        { date: "2024-11-06", type: "MUDANCA_REGRA", amount: 0, modalidade: "RETIRADA" }
    ];

    const target = 147665.57;

    let balance = 0;
    let totalInterest = 0;
    let lastDate = new Date(txs[0].date);
    let currentRate = 0.017;

    for (let tx of txs) {
        let txDate = new Date(tx.date);

        // Days difference
        let days = (txDate - lastDate) / (1000 * 60 * 60 * 24);

        // Simple Interest on principal
        totalInterest += balance * currentRate * (days / 30);

        if (tx.type === "APORTE") {
            balance += tx.amount;
        } else if (tx.type === "RETIRADA") {
            balance -= tx.amount;
        }

        if (tx.rate) currentRate = tx.rate / 100;
        lastDate = txDate;
    }

    console.log("Daily Pro-rata Simple Interest:", (balance + totalInterest).toFixed(2));
}

solve();

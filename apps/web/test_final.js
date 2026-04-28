
function solve() {
    const txs = [
        { d: "2023-06-16", t: "A", v: 50000 },
        { d: "2023-08-17", t: "A", v: 35000, r: 1.7 },
        { d: "2023-11-17", t: "A", v: 60000, r: 1.7 },
        { d: "2024-06-03", t: "W", v: 5000 },
        { d: "2024-08-05", t: "W", v: 20000 },
        { d: "2024-10-07", t: "W", v: 5000 },
        { d: "2024-11-06", t: "Rule", v: 0 }
    ];

    const target = 147665.57;

    function calc(mode, comp) {
        let bal = 0;
        let lastAnniv = new Date(txs[0].d);
        let rate = 0.017;
        for (let tx of txs) {
            let txD = new Date(tx.d);
            let months = (txD.getUTCFullYear() - lastAnniv.getUTCFullYear()) * 12 + (txD.getUTCMonth() - lastAnniv.getUTCMonth());
            if (txD.getUTCDate() < lastAnniv.getUTCDate()) months--;

            if (months > 0 && bal > 0) {
                if (comp) bal *= Math.pow(1 + rate, months);
                else bal += bal * rate * months;
                lastAnniv.setUTCMonth(lastAnniv.getUTCMonth() + months);
            }

            if (tx.t === "A") bal += tx.v;
            else if (tx.t === "W") bal -= tx.v;
            if (tx.r) rate = tx.r / 100;
        }
        return bal;
    }

    console.log("Compounding:", calc("anniv", true));
    console.log("Simple:", calc("anniv", false));
}
solve();

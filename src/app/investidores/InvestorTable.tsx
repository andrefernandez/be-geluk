"use client";

import React, { useState } from "react";
import { createInvestor, updateInvestor, addTransaction, deleteTransaction, deleteInvestor, updateTransactionDate } from "./actions";
import { NumericFormat } from 'react-number-format';

type Transaction = {
    id: string;
    type: string;
    amount: number;
    date: Date;
    prazo: number | null;
    parentId?: string | null;
    modalidade?: string | null;
    rate?: number | null;
};

type Investor = {
    id: string;
    name: string;
    rate: number | null;
    type: string; // RETIRADA ou REINVESTIMENTO
    startDate?: Date;
    transactions: Transaction[];
    createdAt: Date;
};

export default function InvestorTable({ initialInvestors, currentUserRole }: { initialInvestors: Investor[], currentUserRole: string }) {
    const investors = initialInvestors;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [activeInvestorForTx, setActiveInvestorForTx] = useState<Investor | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [editingDateTxId, setEditingDateTxId] = useState<string | null>(null);
    const [editingDateValue, setEditingDateValue] = useState("");

    // Investor Form
    const [name, setName] = useState("");
    const [rate, setRate] = useState<number | "">("");
    const [invType, setInvType] = useState("RETIRADA");
    const [startDate, setStartDate] = useState("");
    const [initialAmount, setInitialAmount] = useState<number | "">("");

    // Transaction Form
    const [txType, setTxType] = useState("APORTE");
    const [txModalidade, setTxModalidade] = useState("RETIRADA");
    const [txAmount, setTxAmount] = useState<number | "">("");
    const [txDate, setTxDate] = useState("");
    const [txRateValue, setTxRateValue] = useState<number | "">("");

    // Resgate (Withdrawal) Form
    const [isResgateModalOpen, setIsResgateModalOpen] = useState(false);
    const [resgateInvestorId, setResgateInvestorId] = useState("");
    const [resgateAporteId, setResgateAporteId] = useState("");
    const [resgateAmount, setResgateAmount] = useState<number | "">("");
    const [resgateDate, setResgateDate] = useState("");

    const [loading, setLoading] = useState(false);

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    // --- Calculations ---
    // Função simplificada baseada na planilha "1WOisi8I-vuBCYajBmHy4mNhOzYxrh60Fyk0dJsFKmmA" (Juros Simples)
    // Valor Atual = Valor Aplicado + (Valor Aplicado * Tempo * Taxa%)
    const calculateTotal = (investor: Investor) => {
        let totalAplicado = 0;
        let runningBalance = 0;

        // Ordenar transações por data para o cálculo cronológico
        const sortedTransactions = [...investor.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (sortedTransactions.length === 0) return { totalAplicado: 0, totalAtual: 0 };

        let lastCalcDate = new Date(sortedTransactions[0].date);
        let currentMode = investor.type; // Começa com a regra global do investidor
        let currentRate = investor.rate ?? 0;

        sortedTransactions.forEach((tx) => {
            const txDate = new Date(tx.date);

            // 1. Calcula juros apenas nos aniversários que passaram
            let monthsPassed = (txDate.getUTCFullYear() - lastCalcDate.getUTCFullYear()) * 12 + (txDate.getUTCMonth() - lastCalcDate.getUTCMonth());
            if (txDate.getUTCDate() < lastCalcDate.getUTCDate()) {
                monthsPassed--;
            }
            monthsPassed = Math.max(0, monthsPassed);

            if (monthsPassed > 0 && runningBalance > 0) {
                const i = currentRate / 100;
                if (currentMode === "REINVESTIMENTO") {
                    // Capitaliza (Reinveste)
                    runningBalance *= Math.pow(1 + i, monthsPassed);
                } else {
                    // Retirada Mensal: O rendimento sai, o saldo não cresce
                    // Não somamos ao runningBalance
                }
                lastCalcDate.setUTCMonth(lastCalcDate.getUTCMonth() + monthsPassed);
            }

            // 2. Aplica a transação
            if (tx.type === "APORTE") {
                totalAplicado += tx.amount;
                runningBalance += tx.amount;
                if (tx.modalidade) currentMode = tx.modalidade;
                if (tx.rate !== null && tx.rate !== undefined) currentRate = tx.rate;
            } else if (tx.type === "RETIRADA") {
                totalAplicado -= tx.amount;
                runningBalance -= tx.amount;
            } else if (tx.type === "MUDANCA_REGRA") {
                if (tx.modalidade) currentMode = tx.modalidade;
                if (tx.rate !== null && tx.rate !== undefined) currentRate = tx.rate;
            }
        });

        // 4. Calcula juros remanescentes do último lançamento até HOJE
        const now = new Date();
        const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        let finalMonths = (nowUTC.getUTCFullYear() - lastCalcDate.getUTCFullYear()) * 12 + (nowUTC.getUTCMonth() - lastCalcDate.getUTCMonth());
        if (nowUTC.getUTCDate() < lastCalcDate.getUTCDate()) {
            finalMonths--;
        }
        finalMonths = Math.max(0, finalMonths);

        if (finalMonths > 0 && runningBalance > 0) {
            const i = currentRate / 100;
            if (currentMode === "REINVESTIMENTO") {
                runningBalance *= Math.pow(1 + i, finalMonths);
            }
        }

        return { totalAplicado, totalAtual: runningBalance };
    };

    // --- Sumários ---
    const globalTotals = investors.reduce((acc, inv) => {
        const { totalAplicado, totalAtual } = calculateTotal(inv);
        return {
            aplicado: acc.aplicado + totalAplicado,
            atual: acc.atual + totalAtual
        };
    }, { aplicado: 0, atual: 0 });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getMonthsPassed = (date: Date | string) => {
        const txDate = new Date(date);
        const now = new Date();
        const diffYears = now.getUTCFullYear() - txDate.getUTCFullYear();
        const diffMonths = (diffYears * 12) + (now.getUTCMonth() - txDate.getUTCMonth());
        return Math.max(0, diffMonths);
    };

    const getDetailedStatement = (investor: Investor) => {
        let runningBalance = 0;
        const sorted = [...investor.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (sorted.length === 0) return [];

        let lastCalcDate = new Date(sorted[0].date);
        let currentMode = investor.type;
        let currentRate = investor.rate ?? 0;

        let accInterest = 0;
        const statement = sorted.map((tx) => {
            const txDate = new Date(tx.date);

            // 1. Calcula juros apenas nos aniversários que passaram
            let monthsPassed = (txDate.getUTCFullYear() - lastCalcDate.getUTCFullYear()) * 12 + (txDate.getUTCMonth() - lastCalcDate.getUTCMonth());
            if (txDate.getUTCDate() < lastCalcDate.getUTCDate()) {
                monthsPassed--;
            }
            monthsPassed = Math.max(0, monthsPassed);

            let interestEarned = 0;
            if (monthsPassed > 0 && runningBalance > 0) {
                const i = currentRate / 100;
                const oldBalance = runningBalance;

                if (currentMode === "REINVESTIMENTO") {
                    // Juros compostos: Capitaliza no saldo
                    runningBalance *= Math.pow(1 + i, monthsPassed);
                    interestEarned = runningBalance - oldBalance;
                } else {
                    // Juros simples (RETIRADA): O rendimento sai, não capitaliza
                    interestEarned = (runningBalance * i * monthsPassed);
                    // runningBalance não muda
                }

                accInterest += interestEarned;
                // Move a base apenas pelos meses cheios
                lastCalcDate.setUTCMonth(lastCalcDate.getUTCMonth() + monthsPassed);
            }

            // 2. Aplica a transação
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

            return {
                ...tx,
                interestEarned,
                accInterest,
                runningBalance,
                monthsInterval: monthsPassed,
                monthlyRetirada: (currentMode === "RETIRADA") ? (runningBalance * (currentRate / 100)) : 0
            };
        });

        // 3. Adiciona rendimentos automáticos até hoje se estiver em modo RETIRADA
        const now = new Date();
        const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

        if (currentMode === "RETIRADA") {
            let monthsToNow = (nowUTC.getUTCFullYear() - lastCalcDate.getUTCFullYear()) * 12 + (nowUTC.getUTCMonth() - lastCalcDate.getUTCMonth());
            if (nowUTC.getUTCDate() < lastCalcDate.getUTCDate()) {
                monthsToNow--;
            }
            monthsToNow = Math.max(0, monthsToNow);

            for (let m = 1; m <= monthsToNow; m++) {
                const monthDate = new Date(lastCalcDate);
                monthDate.setUTCMonth(monthDate.getUTCMonth() + 1);
                const interest = runningBalance * (currentRate / 100);
                accInterest += interest;

                statement.push({
                    id: `auto-yield-${monthDate.getTime()}`,
                    date: monthDate,
                    type: 'RETIRADA AUTOMÁTICA (RENDIMENTO)',
                    amount: interest,
                    interestEarned: interest,
                    accInterest,
                    runningBalance, // Fica estável
                    monthsInterval: 1,
                    prazo: null,
                    parentId: null,
                    modalidade: currentMode,
                    rate: currentRate,
                    monthlyRetirada: interest
                } as any);

                lastCalcDate = monthDate;
            }
        }

        return statement;
    };

    // --- Handlers ---
    const handleOpenInvestorModal = (investor?: Investor) => {
        if (investor) {
            setEditingInvestor(investor);
            setName(investor.name);
            setRate(investor.rate || "");
            setInvType(investor.type || "RETIRADA");
            setStartDate(investor.startDate ? new Date(investor.startDate).toISOString().split("T")[0] : "");

            // Pega o valor da primeira transação de aporte para edição
            const firstAporte = investor.transactions.find(tx => tx.type === "APORTE");
            setInitialAmount(firstAporte ? firstAporte.amount : "");
        } else {
            setEditingInvestor(null);
            setName("");
            setRate("");
            setInvType("RETIRADA");
            setStartDate(new Date().toISOString().split("T")[0]);
            setInitialAmount("");
        }
        setIsModalOpen(true);
    };

    const handleSaveInvestor = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        let res;
        if (editingInvestor) {
            res = await updateInvestor(editingInvestor.id, {
                name,
                rate: Number(rate),
                type: invType,
                startDate: startDate ? new Date(startDate) : undefined,
                initialAmount: Number(initialAmount) || 0
            });
        } else {
            res = await createInvestor({
                name,
                rate: Number(rate),
                type: invType,
                startDate: startDate ? new Date(startDate) : undefined,
                initialAmount: Number(initialAmount) || 0
            });
        }

        if (res.success) {
            window.location.reload();
        } else {
            alert(res.error || "Erro ao salvar investidor");
            setLoading(false);
        }
    };

    const handleOpenTxModal = (investor: Investor) => {
        setActiveInvestorForTx(investor);
        setTxType("APORTE");
        setTxModalidade(investor.type || "RETIRADA");
        setTxAmount("");
        setTxDate(new Date().toISOString().split("T")[0]);
        setTxRateValue(investor.rate || "");
        setIsTransactionModalOpen(true);
    };

    const handleOpenResgateModal = (investor?: Investor) => {
        setResgateInvestorId(investor?.id || "");
        setResgateAporteId("");
        setResgateAmount("");
        setResgateDate(new Date().toISOString().split("T")[0]);
        setIsResgateModalOpen(true);
    };

    const handleSaveResgate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resgateInvestorId || !resgateAmount) return;
        setLoading(true);
        const res = await addTransaction(resgateInvestorId, {
            type: "RETIRADA",
            amount: Number(resgateAmount),
            date: new Date(resgateDate),
            parentId: resgateAporteId || undefined
        });
        if (res.success) {
            window.location.reload();
        } else {
            alert(res.error);
            setLoading(false);
        }
    };

    const handleDeleteTx = async (txId: string) => {
        if (confirm("Tem certeza que deseja excluir esta movimentação?")) {
            setLoading(true);
            const res = await deleteTransaction(txId);
            if (res.success) {
                window.location.reload();
            } else {
                alert(res.error);
                setLoading(false);
            }
        }
    };

    const handleDeleteInvestor = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este investidor? Todos os lançamentos dele serão perdidos.")) {
            setLoading(true);
            const res = await deleteInvestor(id);
            if (res.success) {
                window.location.reload();
            } else {
                alert(res.error);
                setLoading(false);
            }
        }
    };

    const handleUpdateTxDate = async (txId: string) => {
        if (!editingDateValue) return;
        setLoading(true);
        const res = await updateTransactionDate(txId, new Date(editingDateValue));
        if (res.success) {
            window.location.reload();
        } else {
            alert(res.error);
            setLoading(false);
        }
        setEditingDateTxId(null);
    };

    const handleSaveTx = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (activeInvestorForTx) {
            const res = await addTransaction(activeInvestorForTx.id, {
                type: txType,
                modalidade: txModalidade,
                amount: Number(txAmount),
                date: new Date(txDate),
                rate: txType === "APORTE" ? Number(txRateValue) : undefined
            });
            if (res.success) {
                window.location.reload();
            } else {
                alert(res.error);
                setLoading(false);
            }
        }
    };

    return (
        <div className="container-full animate-fade-in" style={{ paddingBottom: "4rem" }}>
            {/* Cards de Resumo no Topo */}
            <div className="layout-grid" style={{ marginBottom: "2rem" }}>
                <div className="glass-card">
                    <p style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>Capital Total</p>
                    <div style={{ fontSize: "2rem", fontWeight: 700 }}>{formatCurrency(globalTotals.aplicado)}</div>
                </div>
                <div className="glass-card">
                    <p style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>Valor Atual</p>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent-primary)" }}>{formatCurrency(globalTotals.atual)}</div>
                </div>
                <div className="glass-card">
                    <p style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>Lucro Total</p>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent-secondary)" }}>{formatCurrency(globalTotals.atual - globalTotals.aplicado)}</div>
                </div>
            </div>

            <div className="glass-panel">
                <div className="flex-between" style={{ marginBottom: "2rem" }}>
                    <div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Quadro Societário</h2>
                        <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>Investidores e participações ativas</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        {isAdminOrManager && (
                            <>
                                <button className="btn-secondary" onClick={() => handleOpenResgateModal()} style={{ color: "var(--accent-red)" }}>
                                    Resgate
                                </button>
                                <button className="btn-primary" onClick={() => handleOpenInvestorModal()}>
                                    Novo Investidor
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                <th style={{ padding: "1.25rem 1rem", textAlign: "left", fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Investidor</th>
                                <th style={{ padding: "1.25rem 1rem", textAlign: "left", fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Início</th>
                                <th style={{ padding: "1.25rem 1rem", textAlign: "left", fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Regra</th>
                                <th style={{ padding: "1.25rem 1rem", textAlign: "left", fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Taxa</th>
                                <th style={{ padding: "1.25rem 1rem", textAlign: "right", fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Aplicado</th>
                                <th style={{ padding: "1.25rem 1rem", textAlign: "right", fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Total Atual</th>
                                <th style={{ padding: "1.25rem 1rem", textAlign: "right", fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {investors.map((inv) => {
                                const totals = calculateTotal(inv);
                                const isExpanded = expandedRow === inv.id;

                                return (
                                    <React.Fragment key={inv.id}>
                                        <tr
                                            onClick={() => setExpandedRow(isExpanded ? null : inv.id)}
                                            style={{ borderBottom: "1px solid var(--card-border)", cursor: "pointer", transition: "all var(--transition-fast)" }}
                                            className="hover-row"
                                        >
                                            <td style={{ padding: "1rem", fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>{inv.name}</td>
                                            <td style={{ padding: "1rem", color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                                                {inv.startDate ? new Date(inv.startDate).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "-"}
                                            </td>
                                            <td style={{ padding: "1rem" }}>
                                                <span style={{
                                                    fontSize: "0.6875rem",
                                                    fontWeight: 800,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.025em",
                                                    color: inv.type === "REINVESTIMENTO" ? "var(--accent-secondary)" : "var(--accent-orange)"
                                                }}>
                                                    {inv.type === "REINVESTIMENTO" ? "Reinvestimento" : "Retirada"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "1rem" }}>
                                                <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                                                    {inv.rate ? `${inv.rate}%` : "0%"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "1rem", textAlign: "right", color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600 }}>
                                                {formatCurrency(totals.totalAplicado)}
                                            </td>
                                            <td style={{ padding: "1rem", textAlign: "right", color: "var(--accent-primary)", fontWeight: 800, fontSize: "0.875rem" }}>
                                                {formatCurrency(totals.totalAtual)}
                                            </td>
                                            <td style={{ padding: "1rem", textAlign: "right" }}>
                                                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                    {isAdminOrManager && (
                                                        <button
                                                            className="btn-secondary"
                                                            style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem" }}
                                                            onClick={(e) => { e.stopPropagation(); handleOpenTxModal(inv); }}
                                                        >
                                                            Movimentar
                                                        </button>
                                                    )}
                                                    {isAdminOrManager && (
                                                        <button
                                                            className="btn-secondary"
                                                            style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem" }}
                                                            onClick={(e) => { e.stopPropagation(); handleOpenInvestorModal(inv); }}
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr style={{ backgroundColor: "#0c0c0d" }}>
                                                <td colSpan={7} style={{ padding: "1.5rem 2.5rem" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                                        <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Extrato de Movimentações</h4>
                                                        {isAdminOrManager && (
                                                            <button onClick={() => handleDeleteInvestor(inv.id)} style={{ color: "var(--accent-red)", fontSize: "0.75rem", fontWeight: 600 }}>
                                                                Excluir Investidor
                                                            </button>
                                                        )}
                                                    </div>

                                                    <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                                                <th style={{ padding: "0.75rem 0", textAlign: "left", color: "var(--text-tertiary)", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Data</th>
                                                                <th style={{ padding: "0.75rem 0", textAlign: "left", color: "var(--text-tertiary)", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo</th>
                                                                <th style={{ padding: "0.75rem 0", textAlign: "right", color: "var(--text-tertiary)", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Valor</th>
                                                                <th style={{ padding: "0.75rem 0", textAlign: "right", color: "var(--text-tertiary)", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rendimento</th>
                                                                <th style={{ padding: "0.75rem 0", textAlign: "right", color: "var(--text-tertiary)", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saldo</th>
                                                                {isAdminOrManager && <th style={{ padding: "0.75rem 0", textAlign: "right", color: "var(--text-tertiary)", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ações</th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {getDetailedStatement(inv).map((tx: any) => (
                                                                <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                                                    <td style={{ padding: "0.875rem 0", color: "var(--text-tertiary)" }}>
                                                                        {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}
                                                                    </td>
                                                                    <td style={{ padding: "0.875rem 0" }}>
                                                                        <span style={{
                                                                            color: tx.type === "APORTE" ? "var(--accent-secondary)" :
                                                                                tx.type === "RETIRADA" ? "var(--accent-red)" : "var(--accent-primary)",
                                                                            fontWeight: 800,
                                                                            fontSize: "0.625rem",
                                                                            textTransform: "uppercase"
                                                                        }}>
                                                                            {tx.type}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: "0.875rem 0", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600 }}>{tx.amount > 0 ? formatCurrency(tx.amount) : "-"}</td>
                                                                    <td style={{ padding: "0.875rem 0", textAlign: "right", color: "var(--accent-primary)", fontWeight: 600 }}>{tx.interestEarned > 0 ? `+${formatCurrency(tx.interestEarned)}` : "-"}</td>
                                                                    <td style={{ padding: "0.875rem 0", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(tx.runningBalance)}</td>
                                                                    {isAdminOrManager && (
                                                                        <td style={{ padding: "0.875rem 0", textAlign: "right" }}>
                                                                            <button onClick={() => handleDeleteTx(tx.id)} style={{ color: "var(--accent-red)", opacity: 0.4, fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase" }}>Excluir</button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {investors.length === 0 && (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                            Nenhum investidor cadastrado ainda.
                        </div>
                    )}
                </div>

                {/* Investor Edit Modal */}
                {isModalOpen && (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                        <div className="glass-panel" style={{ width: "100%", maxWidth: "440px" }}>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                                {editingInvestor ? "Editar Investidor" : "Adicionar Investidor"}
                            </h3>
                            <form onSubmit={handleSaveInvestor} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Nome</label>
                                    <input required className="glass-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Raphael Invest" />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Regra de Rendimento</label>
                                    <select className="glass-input" value={invType} onChange={e => setInvType(e.target.value)}>
                                        <option value="RETIRADA">Retirada Mensal (Saca rendimento)</option>
                                        <option value="REINVESTIMENTO">Reinvestimento (Juros sobre juros)</option>
                                    </select>
                                </div>
                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Data Início</label>
                                        <input required type="date" className="glass-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Taxa %</label>
                                        <NumericFormat
                                            required
                                            className="glass-input"
                                            value={rate}
                                            decimalSeparator=","
                                            decimalScale={2}
                                            suffix=" %"
                                            onValueChange={(values: any) => setRate(values.floatValue || "")}
                                        />
                                    </div>
                                </div>
                                {!editingInvestor && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Aporte Inicial (R$)</label>
                                        <NumericFormat
                                            required
                                            className="glass-input"
                                            value={initialAmount}
                                            thousandSeparator="."
                                            decimalSeparator=","
                                            prefix="R$ "
                                            onValueChange={(values: any) => setInitialAmount(values.floatValue || "")}
                                        />
                                    </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar Alterações"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Transaction Add Modal */}
                {isTransactionModalOpen && activeInvestorForTx && (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                        <div className="glass-panel" style={{ width: "100%", maxWidth: "440px", padding: "2.5rem" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Novo Lançamento - {activeInvestorForTx.name}</h3>
                            <form onSubmit={handleSaveTx} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Tipo de Lançamento</label>
                                    <select className="glass-input" value={txType} onChange={e => {
                                        setTxType(e.target.value);
                                        if (e.target.value === "REINVESTIMENTO") {
                                            setTxType("APORTE");
                                            setTxModalidade("REINVESTIMENTO");
                                        } else if (e.target.value === "APORTE_SIMPLES") {
                                            setTxType("APORTE");
                                            setTxModalidade("RETIRADA");
                                        } else if (e.target.value === "RETIRADA") {
                                            setTxType("RETIRADA");
                                        }
                                    }}>
                                        <option value="REINVESTIMENTO">Reinvestir (Aporte de Lucro)</option>
                                        <option value="APORTE_SIMPLES">Aporte Capital (Retirada Mensal)</option>
                                        <option value="RETIRADA">Fazer Resgate (Retirada)</option>
                                        <option value="MUDANCA_REGRA">Alterar Regra (A partir desta data)</option>
                                    </select>
                                </div>

                                {txType === "MUDANCA_REGRA" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Nova Regra a ser aplicada</label>
                                        <select className="glass-input" value={txModalidade} onChange={e => setTxModalidade(e.target.value)}>
                                            <option value="RETIRADA">Mudar para Retirada Mensal</option>
                                            <option value="REINVESTIMENTO">Mudar para Reinvestimento</option>
                                        </select>
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "1.25rem" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Data</label>
                                        <input required type="date" className="glass-input" value={txDate} onChange={e => setTxDate(e.target.value)} />
                                    </div>
                                    {txType !== "MUDANCA_REGRA" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Valor (R$)</label>
                                            <NumericFormat
                                                required
                                                className="glass-input"
                                                value={txAmount}
                                                thousandSeparator="."
                                                decimalSeparator=","
                                                decimalScale={2}
                                                fixedDecimalScale={true}
                                                prefix="R$ "
                                                onValueChange={(values) => {
                                                    setTxAmount(values.floatValue !== undefined ? values.floatValue : "")
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {txType === "APORTE" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Taxa de Rendimento (%)</label>
                                        <NumericFormat
                                            required
                                            className="glass-input"
                                            value={txRateValue}
                                            thousandSeparator="."
                                            decimalSeparator=","
                                            decimalScale={2}
                                            fixedDecimalScale={true}
                                            suffix=" %"
                                            onValueChange={(values: any) => {
                                                setTxRateValue(values.floatValue !== undefined ? values.floatValue : "")
                                            }}
                                            placeholder="1,50 %"
                                        />
                                    </div>
                                )}

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                                    <button type="button" className="btn-secondary" onClick={() => setIsTransactionModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? "..." : "Salvar"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Resgate Modal */}
                {isResgateModalOpen && (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
                        <div className="glass-panel" style={{ width: "100%", maxWidth: "440px", padding: "2.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                                <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-red)" }}>
                                    💸
                                </div>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Realizar Resgate</h3>
                            </div>

                            <form onSubmit={handleSaveResgate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Selecionar Investidor</label>
                                    <select required className="glass-input" value={resgateInvestorId} onChange={e => { setResgateInvestorId(e.target.value); setResgateAporteId(""); }}>
                                        <option value="">Selecione...</option>
                                        {investors.map(inv => (
                                            <option key={inv.id} value={inv.id}>{inv.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {resgateInvestorId && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>De qual aplicação? (Opcional)</label>
                                        <select className="glass-input" value={resgateAporteId} onChange={e => setResgateAporteId(e.target.value)}>
                                            <option value="">Global / Qualquer uma</option>
                                            {investors.find(i => i.id === resgateInvestorId)?.transactions
                                                .filter(tx => tx.type === "APORTE")
                                                .map(tx => (
                                                    <option key={tx.id} value={tx.id}>
                                                        {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })} - {formatCurrency(tx.amount)}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "1.25rem" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Data do Resgate</label>
                                        <input required type="date" className="glass-input" value={resgateDate} onChange={e => setResgateDate(e.target.value)} />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Valor (R$)</label>
                                        <NumericFormat
                                            required
                                            className="glass-input"
                                            value={resgateAmount}
                                            thousandSeparator="."
                                            decimalSeparator=","
                                            decimalScale={2}
                                            fixedDecimalScale={true}
                                            prefix="R$ "
                                            onValueChange={(values) => {
                                                setResgateAmount(values.floatValue !== undefined ? values.floatValue : "")
                                            }}
                                            placeholder="R$ 0,00"
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                                        * O resgate reduzirá o montante principal e consequentemente os rendimentos futuros a partir da data selecionada.
                                    </p>
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "0.5rem" }}>
                                    <button type="button" className="btn-secondary" onClick={() => setIsResgateModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" style={{ backgroundColor: "var(--accent-red)", borderColor: "var(--accent-red)" }} disabled={loading}>
                                        {loading ? "Processando..." : "Confirmar Resgate"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{
                    __html: `
        .hover-row:hover { background-color: var(--glass-bg-hover); }
      `}} />
            </div>
        </div>
    );
};

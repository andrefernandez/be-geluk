"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface RepresentativeData {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface CommissionOperation {
    id: string;
    date: Date | string;
    valorBruto: number;
    valorLiquido: number;
    comissaoRepresentante: number | null;
    representativeId?: string | null;
    representative?: {
        id: string;
        name: string;
        role?: string;
    } | null;
    client: {
        id: string;
        name: string;
        representativeId?: string | null;
        representative?: {
            id: string;
            name: string;
            role?: string;
        } | null;
    };
}

interface RepresentativeCommissionsSectionProps {
    representatives: RepresentativeData[];
    periodOperations: CommissionOperation[];
    allYearOperations: CommissionOperation[];
    selectedPeriodTitle: string;
}

const MONTH_NAMES_SHORT = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function RepresentativeCommissionsSection({
    representatives,
    periodOperations,
    allYearOperations,
    selectedPeriodTitle,
}: RepresentativeCommissionsSectionProps) {
    const [expandedRepId, setExpandedRepId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"monthly" | "ranking">("monthly");

    const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
    };

    // Mapeamento das operações com comissão no período selecionado por representante
    const repPeriodStats = useMemo(() => {
        const statsMap = new Map<string, {
            rep: RepresentativeData;
            totalComissao: number;
            totalVolume: number;
            opsCount: number;
            operations: CommissionOperation[];
        }>();

        // Inicializa com todos os representantes
        representatives.forEach(r => {
            statsMap.set(r.id, {
                rep: r,
                totalComissao: 0,
                totalVolume: 0,
                opsCount: 0,
                operations: []
            });
        });

        // Agrega as operações do período
        periodOperations.forEach(op => {
            const repId = op.representativeId || op.representative?.id || op.client?.representativeId || op.client?.representative?.id;
            if (repId && statsMap.has(repId)) {
                const item = statsMap.get(repId)!;
                const comissao = Number(op.comissaoRepresentante) || 0;
                item.totalVolume += Number(op.valorBruto) || 0;
                if (comissao > 0) {
                    item.totalComissao += comissao;
                    item.opsCount += 1;
                    item.operations.push(op);
                }
            }
        });

        return Array.from(statsMap.values()).sort((a, b) => b.totalComissao - a.totalComissao);
    }, [representatives, periodOperations]);

    // Matriz mensal (Ano todo separado sempre por mês)
    const monthlyMatrix = useMemo(() => {
        const matrixMap = new Map<string, {
            rep: RepresentativeData;
            monthlyTotals: number[];
            totalYear: number;
            totalOpsYear: number;
        }>();

        representatives.forEach(r => {
            matrixMap.set(r.id, {
                rep: r,
                monthlyTotals: new Array(12).fill(0),
                totalYear: 0,
                totalOpsYear: 0
            });
        });

        allYearOperations.forEach(op => {
            const repId = op.representativeId || op.representative?.id || op.client?.representativeId || op.client?.representative?.id;
            const comissao = Number(op.comissaoRepresentante) || 0;
            if (repId && comissao > 0 && matrixMap.has(repId)) {
                const opDate = new Date(op.date);
                const monthIdx = opDate.getUTCMonth();
                if (monthIdx >= 0 && monthIdx < 12) {
                    const row = matrixMap.get(repId)!;
                    row.monthlyTotals[monthIdx] += comissao;
                    row.totalYear += comissao;
                    row.totalOpsYear += 1;
                }
            }
        });

        const rows = Array.from(matrixMap.values());
        
        // Total da empresa por mês
        const companyMonthlyTotals = new Array(12).fill(0);
        let companyYearTotal = 0;

        for (let m = 0; m < 12; m++) {
            const sumMonth = rows.reduce((acc, r) => acc + r.monthlyTotals[m], 0);
            companyMonthlyTotals[m] = sumMonth;
            companyYearTotal += sumMonth;
        }

        return {
            rows: rows.sort((a, b) => b.totalYear - a.totalYear),
            companyMonthlyTotals,
            companyYearTotal
        };
    }, [representatives, allYearOperations]);

    // KPIs do período selecionado
    const totalComissaoPeriodo = repPeriodStats.reduce((acc, r) => acc + r.totalComissao, 0);
    const totalOpsComissaoPeriodo = repPeriodStats.reduce((acc, r) => acc + r.opsCount, 0);
    const topRepPeriodo = repPeriodStats.length > 0 && repPeriodStats[0].totalComissao > 0 ? repPeriodStats[0] : null;

    if (representatives.length === 0) {
        return null;
    }

    return (
        <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Header com título e abas de visualização */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
                <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase" }}>
                        Comissões de Representantes & Parceiros
                    </h2>
                    <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                        {selectedPeriodTitle} • Visão mensal e individual por representante / parceiro
                    </p>
                </div>

                {/* Abas */}
                <div style={{ display: "flex", background: "var(--bg-tertiary)", padding: "0.25rem", borderRadius: "var(--radius-sm)", gap: "0.25rem" }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab("monthly")}
                        style={{
                            padding: "0.4rem 0.8rem",
                            borderRadius: "var(--radius-xs)",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.025em",
                            background: activeTab === "monthly" ? "#000000" : "transparent",
                            color: activeTab === "monthly" ? "#ffffff" : "var(--text-secondary)",
                            border: "none",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)"
                        }}
                    >
                        Visão Mensal (Jan-Dez)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("ranking")}
                        style={{
                            padding: "0.4rem 0.8rem",
                            borderRadius: "var(--radius-xs)",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.025em",
                            background: activeTab === "ranking" ? "#000000" : "transparent",
                            color: activeTab === "ranking" ? "#ffffff" : "var(--text-secondary)",
                            border: "none",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)"
                        }}
                    >
                        Resumo do Período & Operações
                    </button>
                </div>
            </div>

            {/* Cards de Métricas Rápidas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
                <div className="glass-card" style={{ padding: "1.25rem" }}>
                    <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Total Comissões (Período)
                    </h4>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.5rem" }}>
                        {formatCurrency(totalComissaoPeriodo)}
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        {totalOpsComissaoPeriodo} operação(ões) comissionada(s)
                    </p>
                </div>

                <div className="glass-card" style={{ padding: "1.25rem" }}>
                    <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Total Comissões no Ano
                    </h4>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-primary)", marginTop: "0.5rem" }}>
                        {formatCurrency(monthlyMatrix.companyYearTotal)}
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Acumulado de 2026
                    </p>
                </div>

                <div className="glass-card" style={{ padding: "1.25rem" }}>
                    <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Maior Comissão (Período)
                    </h4>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: topRepPeriodo ? "var(--text-primary)" : "var(--text-tertiary)", marginTop: "0.5rem" }}>
                        {topRepPeriodo ? topRepPeriodo.rep.name : "Nenhum"}
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        {topRepPeriodo ? formatCurrency(topRepPeriodo.totalComissao) : "Sem comissões"}
                    </p>
                </div>
            </div>

            {/* ABA 1: Matriz Mensal (Separado sempre por mês) */}
            {activeTab === "monthly" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>
                            Distribuição Mensal de Comissões por Representante
                        </h3>
                    </div>

                    {/* Tabela Desktop com scroll horizontal */}
                    <div className="desktop-only" style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", textAlign: "right" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                    <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "left", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", minWidth: "180px" }}>
                                        Representante / Parceiro
                                    </th>
                                    {MONTH_NAMES_SHORT.map((m) => (
                                        <th key={m} style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>
                                            {m}
                                        </th>
                                    ))}
                                    <th style={{ padding: "0.75rem 0.75rem", fontSize: "0.6875rem", color: "var(--accent-primary)", fontWeight: 700, textTransform: "uppercase", borderLeft: "1px dashed var(--card-border)" }}>
                                        Total Ano
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyMatrix.rows.map((row) => (
                                    <tr key={row.rep.id} style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.04)" }}>
                                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                                <strong style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>{row.rep.name}</strong>
                                                <span style={{
                                                    fontSize: "0.5625rem",
                                                    fontWeight: 700,
                                                    textTransform: "uppercase",
                                                    padding: "0.1rem 0.35rem",
                                                    borderRadius: "var(--radius-xs)",
                                                    background: row.rep.role === "PARCEIRO" ? "rgba(147, 51, 234, 0.08)" : "var(--bg-tertiary)",
                                                    color: row.rep.role === "PARCEIRO" ? "#7e22ce" : "var(--text-tertiary)",
                                                    border: row.rep.role === "PARCEIRO" ? "1px solid rgba(147, 51, 234, 0.2)" : "1px solid var(--card-border)",
                                                    width: "fit-content"
                                                }}>
                                                    {row.rep.role || "COMERCIAL"}
                                                </span>
                                            </div>
                                        </td>
                                        {row.monthlyTotals.map((val, mIdx) => (
                                            <td key={mIdx} style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", color: val > 0 ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: val > 0 ? 600 : 400 }}>
                                                {val > 0 ? formatCurrency(val) : "-"}
                                            </td>
                                        ))}
                                        <td style={{ padding: "0.75rem 0.75rem", fontSize: "0.8125rem", fontWeight: 700, color: row.totalYear > 0 ? "var(--accent-primary)" : "var(--text-tertiary)", borderLeft: "1px dashed var(--card-border)" }}>
                                            {formatCurrency(row.totalYear)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: "2px solid var(--card-border)", fontWeight: 700 }}>
                                    <td style={{ padding: "0.75rem 0.5rem", textAlign: "left", color: "var(--text-primary)", fontSize: "0.8125rem" }}>
                                        Total Geral
                                    </td>
                                    {monthlyMatrix.companyMonthlyTotals.map((sumVal, mIdx) => (
                                        <td key={`tot-${mIdx}`} style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", color: sumVal > 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                                            {sumVal > 0 ? formatCurrency(sumVal) : "-"}
                                        </td>
                                    ))}
                                    <td style={{ padding: "0.75rem 0.75rem", fontSize: "0.875rem", color: "var(--accent-primary)", borderLeft: "1px dashed var(--card-border)", fontWeight: 800 }}>
                                        {formatCurrency(monthlyMatrix.companyYearTotal)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Visualização Mobile (Cards Mês a Mês por Representante) */}
                    <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                        {monthlyMatrix.rows.map(row => (
                            <div key={`mob-mat-${row.rep.id}`} className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>{row.rep.name}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{row.rep.role}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Total Ano</div>
                                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent-primary)" }}>{formatCurrency(row.totalYear)}</div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                                    {row.monthlyTotals.map((val, mIdx) => (
                                        <div key={mIdx} style={{ padding: "0.4rem 0.5rem", backgroundColor: val > 0 ? "var(--bg-secondary)" : "transparent", borderRadius: "var(--radius-xs)", border: "1px solid var(--card-border)" }}>
                                            <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", display: "block" }}>{MONTH_NAMES_SHORT[mIdx]}</span>
                                            <span style={{ fontSize: "0.75rem", fontWeight: val > 0 ? 600 : 400, color: val > 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                                                {val > 0 ? formatCurrency(val) : "-"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ABA 2: Resumo do Período & Operações Detalhadas */}
            {activeTab === "ranking" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>
                            Comissões do Período Selecionado por Representante
                        </h3>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {repPeriodStats.map((item, idx) => {
                            const isExpanded = expandedRepId === item.rep.id;
                            const hasOps = item.operations.length > 0;

                            return (
                                <div key={item.rep.id} className="glass-card" style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                                            <div style={{
                                                width: "36px",
                                                height: "36px",
                                                borderRadius: "var(--radius-sm)",
                                                backgroundColor: "var(--bg-tertiary)",
                                                border: "1px solid var(--card-border)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 800,
                                                fontSize: "0.8125rem",
                                                color: "var(--text-primary)"
                                            }}>
                                                {idx + 1}º
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                                    {item.rep.name}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                                                    <span style={{
                                                        fontSize: "0.5625rem",
                                                        padding: "0.1rem 0.35rem",
                                                        borderRadius: "var(--radius-xs)",
                                                        backgroundColor: item.rep.role === "PARCEIRO" ? "rgba(147, 51, 234, 0.08)" : "var(--bg-tertiary)",
                                                        color: item.rep.role === "PARCEIRO" ? "#7e22ce" : "var(--text-tertiary)",
                                                        border: item.rep.role === "PARCEIRO" ? "1px solid rgba(147, 51, 234, 0.2)" : "1px solid var(--card-border)",
                                                        fontWeight: 700,
                                                        textTransform: "uppercase"
                                                    }}>
                                                        {item.rep.role || "COMERCIAL"}
                                                    </span>
                                                    <span>• {item.rep.email}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                                            <div>
                                                <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", fontWeight: 700 }}>
                                                    Volume Clientes
                                                </span>
                                                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                                    {formatCurrency(item.totalVolume)}
                                                </span>
                                            </div>

                                            <div>
                                                <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", fontWeight: 700 }}>
                                                    Operações Comiss.
                                                </span>
                                                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                                    {item.opsCount} ops
                                                </span>
                                            </div>

                                            <div style={{ textAlign: "right" }}>
                                                <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", display: "block", fontWeight: 700 }}>
                                                    Comissão Total
                                                </span>
                                                <span style={{ fontSize: "1.125rem", fontWeight: 800, color: item.totalComissao > 0 ? "var(--accent-primary)" : "var(--text-tertiary)" }}>
                                                    {formatCurrency(item.totalComissao)}
                                                </span>
                                            </div>

                                            {hasOps && (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedRepId(isExpanded ? null : item.rep.id)}
                                                    style={{
                                                        background: "var(--bg-secondary)",
                                                        border: "1px solid var(--card-border)",
                                                        color: "var(--text-secondary)",
                                                        borderRadius: "var(--radius-xs)",
                                                        padding: "0.35rem 0.6rem",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.25rem",
                                                        fontSize: "0.6875rem",
                                                        fontWeight: 700,
                                                        textTransform: "uppercase"
                                                    }}
                                                >
                                                    {isExpanded ? "Ocultar" : "Ver Operações"}
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detalhamento de Operações Expansível */}
                                    {isExpanded && hasOps && (
                                        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--card-border)" }}>
                                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                                                Operações comissionadas no período:
                                            </div>
                                            <div style={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                                            <th style={{ padding: "0.5rem", textAlign: "left", fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Data</th>
                                                            <th style={{ padding: "0.5rem", textAlign: "left", fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Cedente</th>
                                                            <th style={{ padding: "0.5rem", textAlign: "right", fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Valor Bruto</th>
                                                            <th style={{ padding: "0.5rem", textAlign: "right", fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Comissão</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {item.operations.map(op => (
                                                            <tr key={op.id} style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.04)" }}>
                                                                <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>
                                                                    {new Date(op.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                                                </td>
                                                                <td style={{ padding: "0.5rem", fontWeight: 600 }}>
                                                                    <Link href={`/clientes/${op.client.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                                                                        {op.client.name}
                                                                    </Link>
                                                                </td>
                                                                <td style={{ padding: "0.5rem", textAlign: "right", color: "var(--text-secondary)" }}>
                                                                    {formatCurrency(op.valorBruto)}
                                                                </td>
                                                                <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>
                                                                    {formatCurrency(op.comissaoRepresentante)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {repPeriodStats.every(r => r.totalComissao === 0) && (
                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                                Nenhuma comissão registrada para os representantes no período selecionado.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

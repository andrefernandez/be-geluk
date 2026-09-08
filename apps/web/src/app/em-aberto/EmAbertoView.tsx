"use client";

import { useState, useMemo } from "react";
import { toggleOperationPaid } from "../operacoes/actions";

interface EmAbertoViewProps {
    operations: any[];
    partners: any[];
    currentUserRole: string;
}

export default function EmAbertoView({
    operations,
    partners,
    currentUserRole
}: EmAbertoViewProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [fundingFilter, setFundingFilter] = useState<"ALL" | "REDESCONTO" | "PROPRIO">("ALL");
    const [partnerFilter, setPartnerFilter] = useState<string>("ALL");
    const [sortBy, setSortBy] = useState<"DATE_ASC" | "DATE_DESC" | "VALUE_DESC">("DATE_ASC");

    // Modal de Liquidação / Pagamento
    const [liquidationModalOpen, setLiquidationModalOpen] = useState(false);
    const [selectedOpForLiquidation, setSelectedOpForLiquidation] = useState<any | null>(null);
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
    };

    // Filtros e ordenação
    const filteredOperations = useMemo(() => {
        return operations.filter(op => {
            const matchesSearch = searchTerm ? (
                op.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                op.partner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                op.sacados?.some((s: any) => s.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || s.cnpj?.includes(searchTerm))
            ) : true;

            const matchesFunding = fundingFilter === "ALL" ? true :
                fundingFilter === "REDESCONTO" ? op.isRedesconto === true :
                !op.isRedesconto;

            const matchesPartner = partnerFilter === "ALL" ? true : op.partnerId === partnerFilter;

            return matchesSearch && matchesFunding && matchesPartner;
        }).sort((a, b) => {
            if (sortBy === "DATE_ASC") {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            } else if (sortBy === "DATE_DESC") {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            } else {
                return (Number(b.valorBruto) || 0) - (Number(a.valorBruto) || 0);
            }
        });
    }, [operations, searchTerm, fundingFilter, partnerFilter, sortBy]);

    // Métricas Resumo
    const metrics = useMemo(() => {
        let totalBruto = 0;
        let totalLiquido = 0;
        let totalRedesconto = 0;
        let totalProprio = 0;
        let totalDiasPonderado = 0;

        filteredOperations.forEach(op => {
            const bruto = Number(op.valorBruto) || 0;
            const liq = Number(op.valorLiquido) || 0;
            const dias = Number(op.dias) || 0;

            totalBruto += bruto;
            totalLiquido += liq;
            totalDiasPonderado += (bruto * dias);

            if (op.isRedesconto) {
                totalRedesconto += bruto;
            } else {
                totalProprio += bruto;
            }
        });

        const prazoMedio = totalBruto > 0 ? totalDiasPonderado / totalBruto : 0;

        return {
            totalBruto,
            totalLiquido,
            totalRedesconto,
            totalProprio,
            prazoMedio,
            count: filteredOperations.length
        };
    }, [filteredOperations]);

    const handleOpenLiquidationModal = (op: any) => {
        setSelectedOpForLiquidation(op);
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setLiquidationModalOpen(true);
    };

    const handleConfirmLiquidation = async () => {
        if (!selectedOpForLiquidation) return;
        setLoading(true);
        const res = await toggleOperationPaid(selectedOpForLiquidation.id, true, paymentDate);
        setLoading(false);
        if (res.success) {
            setLiquidationModalOpen(false);
            window.location.reload();
        } else {
            alert(res.error || "Erro ao liquidar operação.");
        }
    };

    return (
        <div className="responsive-p" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* KPI Cards de Operações em Aberto */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
                <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem", borderLeft: "4px solid #f59e0b" }}>
                    <span style={{ fontSize: "0.75rem", color: "#f59e0b", textTransform: "uppercase", fontWeight: 700 }}>Total Bruto em Aberto</span>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(metrics.totalBruto)}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{metrics.count} operações pendentes</span>
                </div>

                <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Total Líquido Desembolsado</span>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-primary)" }}>{formatCurrency(metrics.totalLiquido)}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Capital efetivamente em circulação</span>
                </div>

                <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#a78bfa", textTransform: "uppercase", fontWeight: 700 }}>Em Aberto com Re-desconto</span>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c4b5fd" }}>{formatCurrency(metrics.totalRedesconto)}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {metrics.totalBruto > 0 ? `${((metrics.totalRedesconto / metrics.totalBruto) * 100).toFixed(1)}% do montante aberto` : "0%"}
                    </span>
                </div>

                <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Em Aberto com Capital Próprio</span>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(metrics.totalProprio)}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {metrics.totalBruto > 0 ? `${((metrics.totalProprio / metrics.totalBruto) * 100).toFixed(1)}% do montante aberto` : "0%"}
                    </span>
                </div>

                <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Prazo Médio das Operações</span>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{metrics.prazoMedio.toFixed(1)} <span style={{ fontSize: "0.875rem", fontWeight: 400 }}>dias</span></span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Ponderado pelo valor bruto</span>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1, maxWidth: "800px" }}>
                    <input
                        type="text"
                        className="glass-input"
                        placeholder="Buscar por cedente, sacado, parceiro..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 1, minWidth: "220px" }}
                    />

                    <select
                        className="glass-input"
                        value={fundingFilter}
                        onChange={(e: any) => setFundingFilter(e.target.value)}
                        style={{ width: "auto" }}
                    >
                        <option value="ALL">Todos os Tipos de Capital</option>
                        <option value="REDESCONTO">🟣 Apenas Re-desconto (FIDC/Banco)</option>
                        <option value="PROPRIO">⚪ Apenas Capital Próprio</option>
                    </select>

                    {fundingFilter !== "PROPRIO" && (
                        <select
                            className="glass-input"
                            value={partnerFilter}
                            onChange={e => setPartnerFilter(e.target.value)}
                            style={{ width: "auto" }}
                        >
                            <option value="ALL">Todos os Parceiros</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}

                    <select
                        className="glass-input"
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        style={{ width: "auto" }}
                    >
                        <option value="DATE_ASC">Mais Antigas Primeiro (Urgência)</option>
                        <option value="DATE_DESC">Mais Recentes Primeiro</option>
                        <option value="VALUE_DESC">Maior Valor Bruto Primeiro</option>
                    </select>
                </div>

                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Exibindo: <strong>{filteredOperations.length}</strong> operações em aberto
                </div>
            </div>

            {/* Tabela de Operações em Aberto */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border)", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                            <th style={{ padding: "0.875rem 1rem" }}>Data Operação</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Cedente</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Sacados / Títulos</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Funding</th>
                            <th style={{ padding: "0.875rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>Bruto (R$)</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Líquido (R$)</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Prazo</th>
                            <th style={{ padding: "0.875rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>Etapa</th>
                            <th style={{ padding: "0.875rem 1rem", textAlign: "center" }}>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOperations.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                                    {operations.length === 0 
                                        ? "🎉 Parabéns! Não há nenhuma operação em aberto no momento. Todas as operações estão 100% liquidadas."
                                        : "Nenhuma operação em aberto encontrada com os filtros selecionados."}
                                </td>
                            </tr>
                        ) : (
                            filteredOperations.map(op => {
                                const bruto = Number(op.valorBruto) || 0;
                                const liq = Number(op.valorLiquido) || 0;
                                const sacadosCount = op.sacados?.length || 0;

                                return (
                                    <tr key={op.id} style={{ borderBottom: "1px solid var(--glass-border)", fontSize: "0.875rem" }} className="hover-row">
                                        <td style={{ padding: "0.875rem 1rem", color: "var(--text-secondary)" }}>
                                            {new Date(op.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>
                                            {op.client?.name}
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem" }}>
                                            {sacadosCount > 0 ? (
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                                                        {op.sacados[0]?.nome}
                                                    </span>
                                                    {sacadosCount > 1 && (
                                                        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                                                            + {sacadosCount - 1} outro(s) sacado(s)
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>Não especificado</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem" }}>
                                            {op.isRedesconto ? (
                                                <span style={{
                                                    fontSize: "0.75rem",
                                                    backgroundColor: "rgba(139, 92, 246, 0.15)",
                                                    color: "#c4b5fd",
                                                    padding: "0.2rem 0.5rem",
                                                    borderRadius: "9999px",
                                                    fontWeight: 600,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "0.25rem"
                                                }}>
                                                    🟣 {op.partner?.name || "Re-desconto"}
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: "0.75rem",
                                                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                    color: "var(--text-secondary)",
                                                    padding: "0.2rem 0.5rem",
                                                    borderRadius: "9999px",
                                                    fontWeight: 500
                                                }}>
                                                    ⚪ Próprio
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem", borderLeft: "1px dashed var(--glass-border)", fontWeight: 700, color: "var(--text-primary)" }}>
                                            {formatCurrency(bruto)}
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--accent-primary)" }}>
                                            {formatCurrency(liq)}
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem", color: "var(--text-secondary)" }}>
                                            {op.dias} dias
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>
                                            <span style={{
                                                fontSize: "0.75rem",
                                                padding: "0.2rem 0.5rem",
                                                borderRadius: "9999px",
                                                fontWeight: 600,
                                                backgroundColor: op.status === "CONCLUIDA" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                                color: op.status === "CONCLUIDA" ? "#10b981" : "#f59e0b"
                                            }}>
                                                {op.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "0.875rem 1rem", textAlign: "center" }}>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenLiquidationModal(op)}
                                                style={{
                                                    padding: "0.4rem 0.9rem",
                                                    borderRadius: "var(--radius-sm)",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 700,
                                                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                                                    color: "var(--accent-primary)",
                                                    border: "1px solid rgba(16, 185, 129, 0.4)",
                                                    cursor: "pointer",
                                                    transition: "all var(--transition-fast)",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "0.3rem"
                                                }}
                                                title="Marcar como Liquidada/Paga pelo cliente"
                                            >
                                                ✔ Liquidar Operação
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {filteredOperations.length > 0 && (
                        <tfoot>
                            <tr style={{ borderTop: "2px solid var(--glass-border)", fontWeight: 700 }}>
                                <td style={{ padding: "0.875rem 1rem" }} colSpan={4}>Total em Aberto</td>
                                <td style={{ padding: "0.875rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(metrics.totalBruto)}</td>
                                <td style={{ padding: "0.875rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(metrics.totalLiquido)}</td>
                                <td style={{ padding: "0.875rem 1rem" }}>{metrics.prazoMedio.toFixed(1)} d</td>
                                <td style={{ padding: "0.875rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>-</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* MODAL DE CONFIRMAÇÃO DE LIQUIDAÇÃO */}
            {liquidationModalOpen && selectedOpForLiquidation && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0,0,0,0.85)",
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 100
                }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "480px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }} className="text-gradient">
                                Confirmar Liquidação da Operação
                            </h3>
                            <button
                                type="button"
                                onClick={() => setLiquidationModalOpen(false)}
                                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            Você está marcando a operação do cedente <strong>{selectedOpForLiquidation.client?.name}</strong> no valor de <strong>{formatCurrency(selectedOpForLiquidation.valorBruto)}</strong> como <strong>PAGA / LIQUIDADA</strong>.
                            {selectedOpForLiquidation.isRedesconto && selectedOpForLiquidation.partner && (
                                <p style={{ marginTop: "0.5rem", color: "#c4b5fd" }}>
                                    🟣 Como esta operação foi re-descontada com <strong>{selectedOpForLiquidation.partner.name}</strong>, o limite tomado deste parceiro será automaticamente liberado.
                                </p>
                            )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                Data do Pagamento pelo Cliente:
                            </label>
                            <input
                                type="date"
                                className="glass-input"
                                value={paymentDate}
                                onChange={e => setPaymentDate(e.target.value)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                            <button type="button" className="btn-secondary" onClick={() => setLiquidationModalOpen(false)}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleConfirmLiquidation}
                                disabled={loading}
                            >
                                {loading ? "Processando..." : "Confirmar Liquidação"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

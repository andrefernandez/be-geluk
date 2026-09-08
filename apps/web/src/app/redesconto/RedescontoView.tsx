"use client";

import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid, 
    Legend 
} from "recharts";
import { createPartner, updatePartner, deletePartner, togglePartnerStatus } from "./actions";
import { toggleOperationPaid } from "../operacoes/actions";

interface RedescontoViewProps {
    operations: any[];
    partners: any[];
    openOpsByPartner: Record<string, { totalBruto: number; count: number }>;
    monthlyHistory: {
        monthKey: string;
        label: string;
        volume: number;
        receitaGeluk: number;
        custoParceiro: number;
        ganhoGeluk: number;
    }[];
    currentUserRole: string;
}

export default function RedescontoView({
    operations,
    partners,
    openOpsByPartner,
    monthlyHistory,
    currentUserRole
}: RedescontoViewProps) {
    const [activeTab, setActiveTab] = useState<"dashboard" | "operacoes" | "parceiros">("dashboard");
    const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal de Parceiro
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<any | null>(null);
    const [partnerLoading, setPartnerLoading] = useState(false);
    const [partnerError, setPartnerError] = useState("");
    const [partnerFormData, setPartnerFormData] = useState({
        name: "",
        type: "FIDC",
        rate: "",
        limit: "",
        contact: "",
        notes: "",
        active: true
    });

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
    };

    const formatPercent = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return "0,00%";
        return `${val.toFixed(2)}%`;
    };

    // Cálculos das Operações do Período
    const filteredOps = useMemo(() => {
        return operations.filter(op => {
            const matchesPartner = selectedPartnerFilter === "ALL" ? true : op.partnerId === selectedPartnerFilter;
            const matchesSearch = searchTerm 
                ? (op.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   op.partner?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                : true;
            return matchesPartner && matchesSearch;
        });
    }, [operations, selectedPartnerFilter, searchTerm]);

    const metrics = useMemo(() => {
        let totalBruto = 0;
        let totalReceitaGeluk = 0;
        let totalCustoParceiro = 0;
        let totalGanhoGeluk = 0;

        filteredOps.forEach(op => {
            const bruto = Number(op.valorBruto) || 0;
            const fator = Number(op.fator) || 0;
            const adValorem = Number(op.adValorem) || 0;
            const tarifas = Number(op.tarifas) || 0;
            const rec = fator + adValorem + tarifas;
            const custo = Number(op.custoParceiro) || 0;
            const ganho = rec - custo;

            totalBruto += bruto;
            totalReceitaGeluk += rec;
            totalCustoParceiro += custo;
            totalGanhoGeluk += ganho;
        });

        const spreadMedio = totalBruto > 0 ? (totalGanhoGeluk / totalBruto) * 100 : 0;
        const margemSobreReceita = totalReceitaGeluk > 0 ? (totalGanhoGeluk / totalReceitaGeluk) * 100 : 0;

        return {
            totalBruto,
            totalReceitaGeluk,
            totalCustoParceiro,
            totalGanhoGeluk,
            spreadMedio,
            margemSobreReceita,
            count: filteredOps.length
        };
    }, [filteredOps]);

    // Limites Totais Globais
    const globalLimits = useMemo(() => {
        let totalLimite = 0;
        let totalTomadoAtivo = 0;

        partners.forEach(p => {
            if (p.active) {
                totalLimite += Number(p.limit) || 0;
                const openData = openOpsByPartner[p.id];
                if (openData) {
                    totalTomadoAtivo += openData.totalBruto;
                }
            }
        });

        const saldoDisponivel = Math.max(0, totalLimite - totalTomadoAtivo);
        const percentUtilizado = totalLimite > 0 ? (totalTomadoAtivo / totalLimite) * 100 : 0;

        return {
            totalLimite,
            totalTomadoAtivo,
            saldoDisponivel,
            percentUtilizado
        };
    }, [partners, openOpsByPartner]);

    // Handlers Parceiro
    const handleOpenPartnerModal = (partner?: any) => {
        setPartnerError("");
        if (partner) {
            setEditingPartner(partner);
            setPartnerFormData({
                name: partner.name,
                type: partner.type || "FIDC",
                rate: String(partner.rate),
                limit: String(partner.limit),
                contact: partner.contact || "",
                notes: partner.notes || "",
                active: partner.active ?? true
            });
        } else {
            setEditingPartner(null);
            setPartnerFormData({
                name: "",
                type: "FIDC",
                rate: "2.5",
                limit: "",
                contact: "",
                notes: "",
                active: true
            });
        }
        setIsPartnerModalOpen(true);
    };

    const handleSavePartner = async (e: React.FormEvent) => {
        e.preventDefault();
        setPartnerLoading(true);
        setPartnerError("");

        const payload = {
            name: partnerFormData.name,
            type: partnerFormData.type,
            rate: parseFloat(partnerFormData.rate) || 0,
            limit: parseFloat(partnerFormData.limit) || 0,
            contact: partnerFormData.contact,
            notes: partnerFormData.notes,
            active: partnerFormData.active
        };

        let res;
        if (editingPartner) {
            res = await updatePartner(editingPartner.id, payload);
        } else {
            res = await createPartner(payload);
        }

        setPartnerLoading(false);
        if (res.success) {
            setIsPartnerModalOpen(false);
            window.location.reload();
        } else {
            setPartnerError(res.error || "Erro ao salvar parceiro.");
        }
    };

    const handleDeletePartner = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir o parceiro "${name}"?`)) {
            const res = await deletePartner(id);
            if (!res.success) {
                alert(res.error || "Erro ao excluir parceiro.");
            } else {
                window.location.reload();
            }
        }
    };

    return (
        <div className="responsive-p" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Top Navigation Tabs */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        style={{
                            padding: "0.6rem 1.25rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                            backgroundColor: activeTab === "dashboard" ? "rgba(139, 92, 246, 0.2)" : "transparent",
                            color: activeTab === "dashboard" ? "#c4b5fd" : "var(--text-secondary)",
                            border: `1px solid ${activeTab === "dashboard" ? "rgba(139, 92, 246, 0.5)" : "var(--glass-border)"}`
                        }}
                    >
                        📊 Dashboard & Limites
                    </button>
                    <button
                        onClick={() => setActiveTab("operacoes")}
                        style={{
                            padding: "0.6rem 1.25rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                            backgroundColor: activeTab === "operacoes" ? "rgba(139, 92, 246, 0.2)" : "transparent",
                            color: activeTab === "operacoes" ? "#c4b5fd" : "var(--text-secondary)",
                            border: `1px solid ${activeTab === "operacoes" ? "rgba(139, 92, 246, 0.5)" : "var(--glass-border)"}`
                        }}
                    >
                        📋 Operações Re-descontadas ({operations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("parceiros")}
                        style={{
                            padding: "0.6rem 1.25rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                            backgroundColor: activeTab === "parceiros" ? "rgba(139, 92, 246, 0.2)" : "transparent",
                            color: activeTab === "parceiros" ? "#c4b5fd" : "var(--text-secondary)",
                            border: `1px solid ${activeTab === "parceiros" ? "rgba(139, 92, 246, 0.5)" : "var(--glass-border)"}`
                        }}
                    >
                        🏦 Parceiros de Funding ({partners.length})
                    </button>
                </div>

                {isAdminOrManager && (
                    <button
                        className="btn-primary"
                        onClick={() => handleOpenPartnerModal()}
                        style={{
                            padding: "0.6rem 1.25rem",
                            fontSize: "0.875rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                    >
                        + Novo Parceiro
                    </button>
                )}
            </div>

            {/* TAB 1: DASHBOARD & LIMITES */}
            {activeTab === "dashboard" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    
                    {/* KPI Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Volume Re-descontado</span>
                            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(metrics.totalBruto)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{metrics.count} operações no período</span>
                        </div>

                        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Receita Geluk (Cliente)</span>
                            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(metrics.totalReceitaGeluk)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Fator + Tarifas + AdValorem</span>
                        </div>

                        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--accent-red)", textTransform: "uppercase", fontWeight: 700 }}>Custo dos Parceiros</span>
                            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-red)" }}>{formatCurrency(metrics.totalCustoParceiro)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Juros/Taxa cobrada pelo funding</span>
                        </div>

                        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem", borderLeft: "4px solid var(--accent-primary)" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)", textTransform: "uppercase", fontWeight: 700 }}>Ganho Líquido Geluk (Lucro)</span>
                            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-primary)" }}>{formatCurrency(metrics.totalGanhoGeluk)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: 600 }}>Spread: {formatPercent(metrics.spreadMedio)}</span>
                        </div>

                        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#a78bfa", textTransform: "uppercase", fontWeight: 700 }}>Limite Tomado em Aberto</span>
                            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c4b5fd" }}>{formatCurrency(globalLimits.totalTomadoAtivo)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{formatPercent(globalLimits.percentUtilizado)} do limite global</span>
                        </div>

                        <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Saldo Disponível Global</span>
                            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(globalLimits.saldoDisponivel)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total contratado: {formatCurrency(globalLimits.totalLimite)}</span>
                        </div>
                    </div>

                    {/* Visão de Limites por Parceiro (Cards com Gauge) */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                🏦 Limite e Exposição por Parceiro
                            </h2>
                            <span style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
                                Limite tomado considera operações em aberto ainda não liquidadas
                            </span>
                        </div>

                        {partners.length === 0 ? (
                            <div className="glass-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                <p style={{ fontSize: "1rem", marginBottom: "1rem" }}>Nenhum parceiro de funding cadastrado ainda.</p>
                                {isAdminOrManager && (
                                    <button className="btn-primary" onClick={() => handleOpenPartnerModal()}>
                                        Cadastrar Primeiro Parceiro
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                                {partners.map(partner => {
                                    const openData = openOpsByPartner[partner.id] || { totalBruto: 0, count: 0 };
                                    const limiteTotal = Number(partner.limit) || 0;
                                    const tomado = openData.totalBruto;
                                    const saldo = Math.max(0, limiteTotal - tomado);
                                    const pct = limiteTotal > 0 ? (tomado / limiteTotal) * 100 : 0;
                                    
                                    // Cor da barra de progresso baseada na ocupação
                                    const barColor = pct > 90 ? "#ef4444" : pct > 75 ? "#f59e0b" : "#10b981";

                                    // Operações do período com este parceiro
                                    const periodOps = operations.filter(op => op.partnerId === partner.id);
                                    const periodBruto = periodOps.reduce((acc, op) => acc + (Number(op.valorBruto) || 0), 0);
                                    const periodGanho = periodOps.reduce((acc, op) => {
                                        const rec = (Number(op.fator) || 0) + (Number(op.adValorem) || 0) + (Number(op.tarifas) || 0);
                                        const custo = Number(op.custoParceiro) || 0;
                                        return acc + (rec - custo);
                                    }, 0);

                                    return (
                                        <div key={partner.id} className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{partner.name}</h3>
                                                        <span style={{ fontSize: "0.7rem", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#c4b5fd", padding: "0.15rem 0.45rem", borderRadius: "9999px", fontWeight: 600 }}>
                                                            {partner.type}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem", display: "block" }}>
                                                        Taxa Contratada: <strong>{partner.rate}% a.m.</strong>
                                                    </span>
                                                </div>
                                                {isAdminOrManager && (
                                                    <button
                                                        onClick={() => handleOpenPartnerModal(partner)}
                                                        style={{
                                                            background: "transparent",
                                                            border: "1px solid var(--glass-border)",
                                                            borderRadius: "var(--radius-sm)",
                                                            padding: "0.3rem 0.6rem",
                                                            fontSize: "0.75rem",
                                                            color: "var(--text-secondary)",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                            </div>

                                            {/* Barra de Progresso de Limite */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                                                    <span style={{ color: "var(--text-secondary)" }}>Limite Tomado: <strong>{formatCurrency(tomado)}</strong></span>
                                                    <span style={{ fontWeight: 700, color: barColor }}>{pct.toFixed(1)}%</span>
                                                </div>
                                                <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "9999px", overflow: "hidden" }}>
                                                    <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", backgroundColor: barColor, borderRadius: "9999px", transition: "width 0.5s ease" }} />
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                                    <span>Saldo Livre: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(saldo)}</strong></span>
                                                    <span>Limite Total: <strong>{formatCurrency(limiteTotal)}</strong></span>
                                                </div>
                                            </div>

                                            {/* Resumo no período */}
                                            <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem" }}>
                                                <div>
                                                    <span style={{ color: "var(--text-tertiary)", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>Operado no Período</span>
                                                    <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(periodBruto)}</strong>
                                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block" }}>({periodOps.length} ops)</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: "var(--text-tertiary)", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>Ganho Geluk Gerado</span>
                                                    <strong style={{ color: periodGanho >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>{formatCurrency(periodGanho)}</strong>
                                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block" }}>
                                                        Spread: {periodBruto > 0 ? formatPercent((periodGanho / periodBruto) * 100) : "0,00%"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Gráfico Mensal de Desempenho */}
                    {monthlyHistory.length > 0 && (
                        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                    📈 Evolução dos Ganhos de Re-desconto por Mês
                                </h2>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                    Receita Geluk vs Custo Parceiro vs Ganho Líquido
                                </span>
                            </div>

                            <div style={{ width: "100%", height: "300px" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="label" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} />
                                        <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: "rgba(18, 18, 20, 0.95)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} 
                                            formatter={(value: any) => formatCurrency(Number(value))}
                                        />
                                        <Legend />
                                        <Bar dataKey="receitaGeluk" name="Receita Bruta Geluk" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="custoParceiro" name="Custo Parceiro" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="ganhoGeluk" name="Ganho Líquido Geluk" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: OPERAÇÕES RE-DESCONTADAS */}
            {activeTab === "operacoes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    
                    {/* Filtros da Tabela */}
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: 1, maxWidth: "600px" }}>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Buscar por cedente ou parceiro..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ flex: 1, minWidth: "220px" }}
                            />
                            <select
                                className="glass-input"
                                value={selectedPartnerFilter}
                                onChange={e => setSelectedPartnerFilter(e.target.value)}
                                style={{ width: "auto" }}
                            >
                                <option value="ALL">Todos os Parceiros</option>
                                {partners.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                            Total: <strong>{filteredOps.length}</strong> operações ({formatCurrency(metrics.totalBruto)})
                        </div>
                    </div>

                    {/* Tabela de Operações */}
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--glass-border)", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                                    <th style={{ padding: "0.75rem 1rem" }}>Data</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Cedente</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Parceiro</th>
                                    <th style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>Bruto (R$)</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Prazo</th>
                                    <th style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>Receita Geluk</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Taxa Parc.</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Custo Parc.</th>
                                    <th style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)", borderLeft: "1px dashed var(--glass-border)" }}>Ganho Líquido</th>
                                    <th style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>Spread (%)</th>
                                    <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOps.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                                            Nenhuma operação de re-desconto encontrada para o período e filtros selecionados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOps.map(op => {
                                        const bruto = Number(op.valorBruto) || 0;
                                        const rec = (Number(op.fator) || 0) + (Number(op.adValorem) || 0) + (Number(op.tarifas) || 0);
                                        const custo = Number(op.custoParceiro) || 0;
                                        const ganho = rec - custo;
                                        const spread = bruto > 0 ? (ganho / bruto) * 100 : 0;

                                        return (
                                            <tr key={op.id} style={{ borderBottom: "1px solid var(--glass-border)", fontSize: "0.875rem" }}>
                                                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                                                    {new Date(op.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>
                                                    {op.client?.name}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem" }}>
                                                    <span style={{ fontSize: "0.75rem", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#c4b5fd", padding: "0.2rem 0.5rem", borderRadius: "9999px", fontWeight: 600 }}>
                                                        {op.partner?.name || "---"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", fontWeight: 600 }}>
                                                    {formatCurrency(bruto)}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                                                    {op.dias} dias
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>
                                                    {formatCurrency(rec)}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                                                    {op.taxaParceiro ? `${op.taxaParceiro}%` : "---"}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", color: "var(--accent-red)", fontWeight: 500 }}>
                                                    {formatCurrency(custo)}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: ganho >= 0 ? "var(--accent-primary)" : "var(--accent-red)", fontWeight: 700 }}>
                                                    {formatCurrency(ganho)}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", color: ganho >= 0 ? "var(--accent-primary)" : "var(--accent-red)", fontWeight: 600 }}>
                                                    {formatPercent(spread)}
                                                </td>
                                                <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            await toggleOperationPaid(op.id, !op.paga);
                                                            window.location.reload();
                                                        }}
                                                        style={{
                                                            padding: "0.25rem 0.6rem",
                                                            borderRadius: "9999px",
                                                            fontSize: "0.75rem",
                                                            fontWeight: 700,
                                                            backgroundColor: op.paga ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                                            color: op.paga ? "var(--accent-primary)" : "#f59e0b",
                                                            border: `1px solid ${op.paga ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                                                            cursor: "pointer"
                                                        }}
                                                        title={op.paga ? "Liquidada! Clique para alternar para Em Aberto" : "Em Aberto! Clique para marcar como Liquidada"}
                                                    >
                                                        {op.paga ? "✔ Paga" : "⏳ Em Aberto"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {filteredOps.length > 0 && (
                                <tfoot>
                                    <tr style={{ borderTop: "2px solid var(--glass-border)", fontWeight: 700 }}>
                                        <td style={{ padding: "0.75rem 1rem" }} colSpan={3}>Totais do Período</td>
                                        <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(metrics.totalBruto)}</td>
                                        <td style={{ padding: "0.75rem 1rem" }}>-</td>
                                        <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(metrics.totalReceitaGeluk)}</td>
                                        <td style={{ padding: "0.75rem 1rem" }}>-</td>
                                        <td style={{ padding: "0.75rem 1rem", color: "var(--accent-red)" }}>{formatCurrency(metrics.totalCustoParceiro)}</td>
                                        <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--accent-primary)" }}>{formatCurrency(metrics.totalGanhoGeluk)}</td>
                                        <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatPercent(metrics.spreadMedio)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: CADASTRO DE PARCEIROS */}
            {activeTab === "parceiros" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                Cadastro de Bancos, FIDCs e Securitizadoras
                            </h2>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                                Gerencie as instituições parceiras que fornecem crédito e funding para a operação
                            </p>
                        </div>
                        {isAdminOrManager && (
                            <button className="btn-primary" onClick={() => handleOpenPartnerModal()}>
                                + Novo Parceiro
                            </button>
                        )}
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--glass-border)", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                                    <th style={{ padding: "0.75rem 1rem" }}>Instituição</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Tipo</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Taxa de Custo</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Limite Contratado</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Limite Tomado (Ativo)</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Saldo Disponível</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Contato</th>
                                    <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                                    {isAdminOrManager && <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {partners.map(partner => {
                                    const openData = openOpsByPartner[partner.id] || { totalBruto: 0, count: 0 };
                                    const limiteTotal = Number(partner.limit) || 0;
                                    const tomado = openData.totalBruto;
                                    const saldo = Math.max(0, limiteTotal - tomado);

                                    return (
                                        <tr key={partner.id} style={{ borderBottom: "1px solid var(--glass-border)", fontSize: "0.875rem" }}>
                                            <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                                                {partner.name}
                                            </td>
                                            <td style={{ padding: "0.75rem 1rem" }}>
                                                <span style={{ fontSize: "0.75rem", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#c4b5fd", padding: "0.2rem 0.5rem", borderRadius: "9999px", fontWeight: 600 }}>
                                                    {partner.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                                                {partner.rate}% a.m.
                                            </td>
                                            <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                                                {formatCurrency(limiteTotal)}
                                            </td>
                                            <td style={{ padding: "0.75rem 1rem", color: "#c4b5fd", fontWeight: 600 }}>
                                                {formatCurrency(tomado)}
                                            </td>
                                            <td style={{ padding: "0.75rem 1rem", color: saldo > 0 ? "var(--accent-primary)" : "var(--accent-red)", fontWeight: 600 }}>
                                                {formatCurrency(saldo)}
                                            </td>
                                            <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                                                {partner.contact || "---"}
                                            </td>
                                            <td style={{ padding: "0.75rem 1rem" }}>
                                                <span style={{
                                                    fontSize: "0.75rem",
                                                    padding: "0.2rem 0.5rem",
                                                    borderRadius: "9999px",
                                                    fontWeight: 600,
                                                    backgroundColor: partner.active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                    color: partner.active ? "var(--accent-primary)" : "var(--accent-red)"
                                                }}>
                                                    {partner.active ? "Ativo" : "Inativo"}
                                                </span>
                                            </td>
                                            {isAdminOrManager && (
                                                <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                                                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                        <button
                                                            onClick={() => handleOpenPartnerModal(partner)}
                                                            style={{
                                                                padding: "0.25rem 0.5rem",
                                                                fontSize: "0.75rem",
                                                                backgroundColor: "rgba(139, 92, 246, 0.1)",
                                                                color: "#c4b5fd",
                                                                border: "1px solid rgba(139, 92, 246, 0.3)",
                                                                borderRadius: "var(--radius-sm)",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePartner(partner.id, partner.name)}
                                                            style={{
                                                                padding: "0.25rem 0.5rem",
                                                                fontSize: "0.75rem",
                                                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                                                color: "var(--accent-red)",
                                                                border: "1px solid var(--accent-red)",
                                                                borderRadius: "var(--radius-sm)",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL DE CADASTRO / EDIÇÃO DE PARCEIRO */}
            {isPartnerModalOpen && (
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
                    <div className="glass-card" style={{ width: "100%", maxWidth: "550px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }} className="text-gradient">
                                {editingPartner ? "Editar Parceiro de Funding" : "Novo Parceiro de Funding"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsPartnerModalOpen(false)}
                                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}
                            >
                                ✕
                            </button>
                        </div>

                        {partnerError && (
                            <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)", color: "var(--accent-red)", fontSize: "0.875rem" }}>
                                {partnerError}
                            </div>
                        )}

                        <form onSubmit={handleSavePartner} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                    Nome da Instituição (Banco / FIDC / Securitizadora) *
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="glass-input"
                                    placeholder="Ex: FIDC Empírica, Banco Master, Gaia..."
                                    value={partnerFormData.name}
                                    onChange={e => setPartnerFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                    <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                        Tipo de Instituição *
                                    </label>
                                    <select
                                        className="glass-input"
                                        value={partnerFormData.type}
                                        onChange={e => setPartnerFormData(prev => ({ ...prev, type: e.target.value }))}
                                    >
                                        <option value="FIDC">FIDC</option>
                                        <option value="BANCO">Banco</option>
                                        <option value="SECURITIZADORA">Securitizadora</option>
                                        <option value="FACTORING">Factoring Parceira</option>
                                        <option value="OUTRO">Outro</option>
                                    </select>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                    <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                        Taxa Cobrada (% ao mês) *
                                    </label>
                                    <NumericFormat
                                        required
                                        className="glass-input"
                                        value={partnerFormData.rate}
                                        thousandSeparator="."
                                        decimalSeparator=","
                                        decimalScale={4}
                                        placeholder="Ex: 2,5"
                                        onValueChange={(v: any) => setPartnerFormData(prev => ({ ...prev, rate: v.floatValue !== undefined ? String(v.floatValue) : "" }))}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                    Limite Disponibilizado para Operar (R$) *
                                </label>
                                <NumericFormat
                                    required
                                    className="glass-input"
                                    value={partnerFormData.limit}
                                    thousandSeparator="."
                                    decimalSeparator=","
                                    decimalScale={2}
                                    fixedDecimalScale={true}
                                    prefix="R$ "
                                    placeholder="R$ 1.000.000,00"
                                    onValueChange={(v: any) => setPartnerFormData(prev => ({ ...prev, limit: v.floatValue !== undefined ? String(v.floatValue) : "" }))}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                    Contato Comercial / Suporte (Opcional)
                                </label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Nome, E-mail ou Telefone do operador"
                                    value={partnerFormData.contact}
                                    onChange={e => setPartnerFormData(prev => ({ ...prev, contact: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                    Observações / Regras Contratuais
                                </label>
                                <textarea
                                    className="glass-input"
                                    rows={2}
                                    placeholder="Notas adicionais sobre garantias, tarifas de cessão..."
                                    value={partnerFormData.notes}
                                    onChange={e => setPartnerFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <input
                                    type="checkbox"
                                    id="partnerActive"
                                    checked={partnerFormData.active}
                                    onChange={e => setPartnerFormData(prev => ({ ...prev, active: e.target.checked }))}
                                    style={{ width: "16px", height: "16px", accentColor: "var(--accent-primary)", cursor: "pointer" }}
                                />
                                <label htmlFor="partnerActive" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                                    Parceiro Ativo para Novas Operações
                                </label>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsPartnerModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" disabled={partnerLoading}>
                                    {partnerLoading ? "Salvando..." : (editingPartner ? "Atualizar Parceiro" : "Cadastrar Parceiro")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

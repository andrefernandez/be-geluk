"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, DollarSign, TrendingUp, Percent, Clock, FileText, Users, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line, Cell } from "recharts";

type SacadoData = {
    id: string;
    nome: string;
    cnpj?: string | null;
    valor: number;
};

type OperationData = {
    id: string;
    date: string;
    valorBruto: number;
    fator: number;
    percentual: number;
    dias: number;
    tarifas: number;
    adValorem: number;
    percentualAdValorem?: number | null;
    iof?: number | null;
    iofAdicional?: number | null;
    valorLiquido: number;
    status: string;
    sacados: SacadoData[];
};

type ClientData = {
    id: string;
    name: string;
    cnpj?: string | null;
    status: string;
    createdAt: string;
    taxaFator?: number | null;
    taxaAdValorem?: number | null;
    taxaTarifa?: number | null;
    taxaIof?: number | null;
    taxaIofAdicional?: number | null;
    representative?: {
        name: string;
        email: string;
    } | null;
    operations: OperationData[];
};

export default function ClientDetailsDashboard({ client, currentUserRole }: { client: ClientData; currentUserRole: string }) {
    const [activeTab, setActiveTab] = useState<"operations" | "sacados" | "rates">("operations");
    const [opSearch, setOpSearch] = useState("");
    const [sacadoSearch, setSacadoSearch] = useState("");

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
    };

    const formatPercent = (val: number) => {
        return `${val.toFixed(2)}%`;
    };

    // --- Metrics calculations ---
    const ops = client.operations || [];
    const totalOps = ops.length;

    // 1. Total Volume
    const totalVolume = ops.reduce((sum, o) => sum + (o.valorBruto || 0), 0);

    // 2. Prazo Médio (Weighted by valorBruto)
    const weightedDays = ops.reduce((sum, o) => sum + (o.dias || 0) * (o.valorBruto || 0), 0);
    const averageTerm = totalVolume > 0 ? Math.round(weightedDays / totalVolume) : 0;

    // 3. Fator Médio (Weighted by valorBruto)
    const weightedFator = ops.reduce((sum, o) => sum + (o.percentual || 0) * (o.valorBruto || 0), 0);
    const averageFator = totalVolume > 0 ? weightedFator / totalVolume : 0;

    // 4. Ad Valorem Médio (Weighted by valorBruto)
    const weightedAdValorem = ops.reduce((sum, o) => sum + (o.percentualAdValorem || 0) * (o.valorBruto || 0), 0);
    const averageAdValorem = totalVolume > 0 ? weightedAdValorem / totalVolume : 0;

    // 5. Total Tarifas
    const totalTarifas = ops.reduce((sum, o) => sum + (o.tarifas || 0), 0);

    // 6. Receita Gerada (Fator + Tarifas + Ad Valorem + IOF + IOF Adicional)
    const totalRevenue = ops.reduce((sum, o) => {
        const revenue = (o.fator || 0) + (o.tarifas || 0) + (o.adValorem || 0) + (o.iof || 0) + (o.iofAdicional || 0);
        return sum + revenue;
    }, 0);

    // Rentabilidade média histórica do Cedente
    const avgProfitability = totalVolume > 0 ? (totalRevenue / totalVolume) * 100 : 0;

    // Ticket médio por Operação
    const averageTicket = totalOps > 0 ? totalVolume / totalOps : 0;

    // --- Sacados Aggregation ---
    const sacadosMap: { [key: string]: { nome: string; cnpj: string; totalOperado: number; numTitles: number } } = {};
    let totalTitlesCount = 0;

    ops.forEach(o => {
        const oSacados = o.sacados || [];
        oSacados.forEach(s => {
            const key = s.cnpj ? s.cnpj.replace(/\D/g, "") : s.nome.toLowerCase().trim();
            if (!sacadosMap[key]) {
                sacadosMap[key] = {
                    nome: s.nome,
                    cnpj: s.cnpj || "---",
                    totalOperado: 0,
                    numTitles: 0
                };
            }
            sacadosMap[key].totalOperado += s.valor || 0;
            sacadosMap[key].numTitles += 1;
            totalTitlesCount += 1;
        });
    });

    const sacadosList = Object.values(sacadosMap).sort((a, b) => b.totalOperado - a.totalOperado);

    // --- Time-series charts calculations ---
    const monthlyMap: { [key: string]: { rawDate: Date; volume: number; receita: number } } = {};
    ops.forEach(o => {
        const d = new Date(o.date);
        const mStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        if (!monthlyMap[mStr]) {
            monthlyMap[mStr] = {
                rawDate: new Date(d.getUTCFullYear(), d.getUTCMonth(), 1),
                volume: 0,
                receita: 0
            };
        }
        monthlyMap[mStr].volume += o.valorBruto || 0;
        monthlyMap[mStr].receita += (o.fator || 0) + (o.tarifas || 0) + (o.adValorem || 0) + (o.iof || 0) + (o.iofAdicional || 0);
    });

    const monthlyChartData = Object.keys(monthlyMap)
        .sort()
        .map(key => {
            const m = monthlyMap[key];
            const monthLabel = m.rawDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
            return {
                month: monthLabel,
                volume: Math.round(m.volume * 100) / 100,
                receita: Math.round(m.receita * 100) / 100
            };
        });

    // --- Top Sacados chart data (max 5) ---
    const topSacadosChartData = sacadosList.slice(0, 5).map(s => ({
        name: s.nome.length > 20 ? s.nome.substring(0, 18) + ".." : s.nome,
        volume: Math.round(s.totalOperado * 100) / 100
    }));

    // --- Filtering lists ---
    const filteredOps = ops.filter(o => 
        o.id.toLowerCase().includes(opSearch.toLowerCase()) ||
        new Date(o.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }).includes(opSearch) ||
        o.valorBruto.toString().includes(opSearch) ||
        o.status.toLowerCase().includes(opSearch.toLowerCase())
    );

    const filteredSacados = sacadosList.filter(s => 
        s.nome.toLowerCase().includes(sacadoSearch.toLowerCase()) ||
        s.cnpj.includes(sacadoSearch)
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Header section */}
            <header className="responsive-header-flex" style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <Link href="/clientes" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                        <ArrowLeft size={16} /> Voltar para Cedentes
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{client.name}</h1>
                        <span style={{
                            padding: "0.25rem 0.625rem",
                            borderRadius: "99px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backgroundColor: client.status === "ATIVO" ? "rgba(16, 185, 129, 0.15)" : "rgba(107, 114, 128, 0.15)",
                            color: client.status === "ATIVO" ? "var(--accent-primary)" : "var(--text-tertiary)",
                            border: `1px solid ${client.status === "ATIVO" ? "var(--accent-primary)" : "var(--card-border)"}`,
                            textTransform: "uppercase"
                        }}>
                            {client.status}
                        </span>
                    </div>
                    <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                        CNPJ: {client.cnpj || "Não cadastrado"} • Cadastro em {new Date(client.createdAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </p>
                </div>

                <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                        <Briefcase size={16} color="var(--text-secondary)" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 700 }}>Representante Comercial</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{client.representative?.name || "Não definido"}</span>
                    </div>
                </div>
            </header>

            {/* Mini Dashboard Metrics Grid */}
            <div className="layout-grid">
                {/* Metric 1: Total Volume */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "130px" }}>
                    <div className="flex-between">
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Volume Operado</span>
                        <DollarSign size={18} color="var(--accent-primary)" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem" }}>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800 }}>{formatCurrency(totalVolume)}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>{totalOps} operação(ões) registrada(s)</span>
                    </div>
                </div>

                {/* Metric 2: Prazo Médio */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "130px" }}>
                    <div className="flex-between">
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Prazo Médio</span>
                        <Clock size={18} color="var(--accent-orange)" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem" }}>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800 }}>{averageTerm} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-secondary)" }}>dias</span></span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>Prazo médio ponderado da carteira</span>
                    </div>
                </div>

                {/* Metric 3: Fator Médio */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "130px" }}>
                    <div className="flex-between">
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Taxa de Fator Média</span>
                        <Percent size={18} color="var(--accent-secondary)" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem" }}>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800 }}>{formatPercent(averageFator)} <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-tertiary)" }}>a.m.</span></span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>Taxa de fator ponderada</span>
                    </div>
                </div>

                {/* Metric 4: Receita Gerada */}
                <div className="glass-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "130px" }}>
                    <div className="flex-between">
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Receita Gerada</span>
                        <TrendingUp size={18} color="var(--accent-primary)" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem" }}>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-primary)" }}>{formatCurrency(totalRevenue)}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>Rentabilidade real de {formatPercent(avgProfitability)}</span>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="responsive-grid-1-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
                {/* Chart 1: Historical Monthly Volume & Revenue */}
                <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", color: "var(--text-secondary)" }}>
                        Histórico Mensal de Operações
                    </h3>
                    {monthlyChartData.length === 0 ? (
                        <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontStyle: "italic", fontSize: "0.875rem" }}>
                            Dados insuficientes para gerar o gráfico histórico.
                        </div>
                    ) : (
                        <div style={{ width: "100%", height: 300, marginTop: "1rem" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={monthlyChartData}>
                                    <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)" }}
                                        formatter={(value: any, name?: any) => [formatCurrency(value), name === "volume" ? "Volume Operado" : "Receita"]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "0.8125rem", paddingTop: "0.5rem" }} />
                                    <Bar yAxisId="left" dataKey="volume" name="Volume Operado" fill="var(--accent-secondary)" radius={[3, 3, 0, 0]} maxBarSize={30} />
                                    <Line yAxisId="right" type="monotone" dataKey="receita" name="Receita Gerada" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--accent-primary)", strokeWidth: 0 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Chart 2: Top Sacados */}
                <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", color: "var(--text-secondary)" }}>
                        Concentração por Sacado (Top 5)
                    </h3>
                    {topSacadosChartData.length === 0 ? (
                        <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontStyle: "italic", fontSize: "0.875rem" }}>
                            Nenhum sacado registrado.
                        </div>
                    ) : (
                        <div style={{ width: "100%", height: 300, marginTop: "1rem" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topSacadosChartData} layout="vertical" margin={{ left: 5, right: 10, top: 5, bottom: 5 }}>
                                    <XAxis type="number" stroke="var(--text-tertiary)" fontSize={10} tickFormatter={(val) => `R$ ${val / 1000}k`} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="var(--text-tertiary)" fontSize={10} width={90} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)" }}
                                        formatter={(value: any) => [formatCurrency(value), "Total Operado"]}
                                    />
                                    <Bar dataKey="volume" fill="var(--accent-secondary)" radius={[0, 3, 3, 0]} maxBarSize={16}>
                                        {topSacadosChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? "var(--accent-primary)" : "var(--accent-secondary)"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Additional details tables with tabs */}
            <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Tabs selection */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--card-border)", gap: "2rem", marginBottom: "0.5rem" }}>
                    <button 
                        onClick={() => setActiveTab("operations")}
                        style={{
                            padding: "0.75rem 0",
                            fontSize: "0.875rem",
                            fontWeight: activeTab === "operations" ? 800 : 500,
                            color: activeTab === "operations" ? "var(--text-primary)" : "var(--text-tertiary)",
                            borderBottom: activeTab === "operations" ? "2px solid var(--text-primary)" : "none",
                            borderRadius: 0,
                            marginBottom: "-1px"
                        }}
                    >
                        Histórico de Operações ({totalOps})
                    </button>
                    <button 
                        onClick={() => setActiveTab("sacados")}
                        style={{
                            padding: "0.75rem 0",
                            fontSize: "0.875rem",
                            fontWeight: activeTab === "sacados" ? 800 : 500,
                            color: activeTab === "sacados" ? "var(--text-primary)" : "var(--text-tertiary)",
                            borderBottom: activeTab === "sacados" ? "2px solid var(--text-primary)" : "none",
                            borderRadius: 0,
                            marginBottom: "-1px"
                        }}
                    >
                        Resumo de Sacados ({sacadosList.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("rates")}
                        style={{
                            padding: "0.75rem 0",
                            fontSize: "0.875rem",
                            fontWeight: activeTab === "rates" ? 800 : 500,
                            color: activeTab === "rates" ? "var(--text-primary)" : "var(--text-tertiary)",
                            borderBottom: activeTab === "rates" ? "2px solid var(--text-primary)" : "none",
                            borderRadius: 0,
                            marginBottom: "-1px"
                        }}
                    >
                        Taxas Cadastradas
                    </button>
                </div>

                {/* Tab content 1: Operations List */}
                {activeTab === "operations" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
                            <div style={{ maxWidth: "320px", width: "100%" }}>
                                <input 
                                    type="text" 
                                    className="glass-input" 
                                    placeholder="Buscar operação..." 
                                    value={opSearch}
                                    onChange={(e) => setOpSearch(e.target.value)}
                                />
                            </div>
                            <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                                <span>Ticket Médio: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(averageTicket)}</strong></span>
                                <span>Total Líquido: <strong style={{ color: "var(--accent-primary)" }}>{formatCurrency(ops.reduce((sum, o) => sum + (o.valorLiquido || 0), 0))}</strong></span>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem" }}>Data</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem" }}>Cód. Operação</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "right" }}>Bruto</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "center" }}>Dias (Prazo)</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "right" }}>Fator (%)</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "right" }}>Tarifas</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "right" }}>Ad Valorem</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "right" }}>Líquido</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOps.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontStyle: "italic", fontSize: "0.875rem" }}>
                                                Nenhuma operação localizada.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOps.map((op) => {
                                            const profitRate = op.valorBruto > 0 ? (((op.fator + op.tarifas + op.adValorem + (op.iof || 0) + (op.iofAdicional || 0)) / op.valorBruto) * 100) : 0;
                                            return (
                                                <tr key={op.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)" }} className="hover-row">
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>
                                                        {new Date(op.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                                                        <Link href={`/operacoes`} className="client-link" style={{ fontSize: "0.875rem" }}>
                                                            {op.id.substring(0, 8)}...
                                                        </Link>
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 600 }}>
                                                        {formatCurrency(op.valorBruto)}
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "center" }}>
                                                        {op.dias}
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "right" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                                            <span>{formatPercent(op.percentual)} a.m.</span>
                                                            <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>{formatCurrency(op.fator)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "right", color: "var(--text-secondary)" }}>
                                                        {formatCurrency(op.tarifas)}
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "right" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                                            <span>{op.percentualAdValorem != null ? `${op.percentualAdValorem}%` : "---"}</span>
                                                            <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>{formatCurrency(op.adValorem)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 700, color: "var(--accent-primary)" }}>
                                                        {formatCurrency(op.valorLiquido)}
                                                    </td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>
                                                        <span style={{
                                                            padding: "0.15rem 0.5rem",
                                                            borderRadius: "99px",
                                                            fontSize: "0.6875rem",
                                                            fontWeight: 700,
                                                            backgroundColor: op.status === "CONCLUIDA" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                                            color: op.status === "CONCLUIDA" ? "var(--accent-primary)" : "var(--accent-orange)",
                                                            textTransform: "uppercase"
                                                        }}>
                                                            {op.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab content 2: Sacados List */}
                {activeTab === "sacados" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
                            <div style={{ maxWidth: "320px", width: "100%" }}>
                                <input 
                                    type="text" 
                                    className="glass-input" 
                                    placeholder="Buscar sacado por nome ou CNPJ..." 
                                    value={sacadoSearch}
                                    onChange={(e) => setSacadoSearch(e.target.value)}
                                />
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                                Total de Sacados Únicos: <strong style={{ color: "var(--text-primary)" }}>{sacadosList.length}</strong> • Total de Títulos: <strong style={{ color: "var(--text-primary)" }}>{totalTitlesCount}</strong>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem" }}>Razão Social / Nome do Sacado</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem" }}>CNPJ / CPF</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "right" }}>Volume Operado</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "center" }}>Nº de Títulos (NFs)</th>
                                        <th style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.8125rem", textAlign: "right" }}>% da Carteira do Cedente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSacados.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontStyle: "italic", fontSize: "0.875rem" }}>
                                                Nenhum sacado localizado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSacados.map((s, idx) => {
                                            const share = totalVolume > 0 ? (s.totalOperado / totalVolume) * 100 : 0;
                                            return (
                                                <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)" }} className="hover-row">
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", fontWeight: 600 }}>{s.nome}</td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>{s.cnpj}</td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 700 }}>{formatCurrency(s.totalOperado)}</td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "center", color: "var(--text-secondary)" }}>{s.numTitles} titulo(s)</td>
                                                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", textAlign: "right" }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                                                            <span>{formatPercent(share)}</span>
                                                            <div style={{ width: "60px", height: "6px", backgroundColor: "var(--bg-tertiary)", borderRadius: "3px", overflow: "hidden", display: "inline-flex" }}>
                                                                <div style={{ width: `${share}%`, height: "100%", backgroundColor: idx === 0 ? "var(--accent-primary)" : "var(--accent-secondary)" }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab content 3: Client Rates */}
                {activeTab === "rates" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
                            {/* Factor rate */}
                            <div className="glass-card" style={{ padding: "1.25rem", background: "var(--bg-secondary)" }}>
                                <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 700 }}>Taxa de Fator (Contratual)</span>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginTop: "0.5rem" }}>
                                    <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>{client.taxaFator != null ? `${client.taxaFator}%` : "8.5%"}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>a.m.</span>
                                </div>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>Taxa padrão de desconto cobrada sobre a operação.</p>
                            </div>

                            {/* Ad Valorem rate */}
                            <div className="glass-card" style={{ padding: "1.25rem", background: "var(--bg-secondary)" }}>
                                <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 700 }}>Taxa Ad Valorem</span>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginTop: "0.5rem" }}>
                                    <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>{client.taxaAdValorem != null ? `${client.taxaAdValorem}%` : "0.0%"}</span>
                                </div>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>Percentual fixo cobrado sobre o valor bruto das duplicatas/NFs.</p>
                            </div>

                            {/* Tariff fixed rate */}
                            <div className="glass-card" style={{ padding: "1.25rem", background: "var(--bg-secondary)" }}>
                                <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 700 }}>Tarifa por Título (Flat)</span>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginTop: "0.5rem" }}>
                                    <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>{client.taxaTarifa != null ? formatCurrency(client.taxaTarifa) : "R$ 0,00"}</span>
                                </div>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>Tarifa de cobrança flat aplicada sobre cada nota fiscal ou boleto.</p>
                            </div>

                            {/* IOF rates */}
                            <div className="glass-card" style={{ padding: "1.25rem", background: "var(--bg-secondary)" }}>
                                <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 700 }}>IOF Geral / Adicional</span>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.5rem" }}>
                                    <span style={{ fontSize: "1rem", fontWeight: 800 }}>IOF Diário: <strong style={{ fontWeight: 800, color: "var(--text-primary)" }}>{client.taxaIof != null ? `${client.taxaIof}%` : "0.0041%"}</strong></span>
                                    <span style={{ fontSize: "1rem", fontWeight: 800 }}>IOF Adicional: <strong style={{ fontWeight: 800, color: "var(--text-primary)" }}>{client.taxaIofAdicional != null ? `${client.taxaIofAdicional}%` : "0.38%"}</strong></span>
                                </div>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.5rem" }}>Alíquotas do imposto sobre operações financeiras vigentes.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hover-row:hover { background-color: var(--glass-bg-hover); }
            `}} />
        </div>
    );
}

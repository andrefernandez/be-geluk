import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import MonthFilter from "@/components/MonthFilter";

export default async function ProjecaoPage({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if ((session?.user as any)?.role === "COMERCIAL") {
        redirect("/clientes");
    }

    const resolvedParams = await searchParams;
    const scenario = resolvedParams.scenario || "conservador";

    // 2026 boundaries
    const startOfYear = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));

    // Fetch all completed operations & costs of 2026
    const operations = await prisma.operation.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear }
        },
        include: { client: true }
    });

    const costs = await prisma.cost.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear }
        }
    });

    // Current Date details to separate realized vs projected
    const now = new Date();
    // For projection, we assume completed months are those strictly before the current month of 2026
    const currentMonthIdx = now.getUTCFullYear() === 2026 ? now.getUTCMonth() : 7; // fallback to Aug (7) if not 2026

    const completedMonths: any[] = [];
    for (let m = 0; m < currentMonthIdx; m++) {
        const opsInMonth = operations.filter(o => new Date(o.date).getUTCMonth() === m);
        const costsInMonth = costs.filter(c => new Date(c.date).getUTCMonth() === m);

        const totalOperado = opsInMonth.reduce((sum, o) => sum + o.valorBruto, 0);
        const receita = opsInMonth.reduce((sum, o) => sum + (o.fator + o.tarifas + o.adValorem + (o.iof || 0) + (o.iofAdicional || 0)), 0);
        const custo = costsInMonth.reduce((sum, c) => sum + c.amount, 0);
        const lucroLiquido = receita - custo;

        completedMonths.push({ m, totalOperado, receita, custo, lucroLiquido });
    }

    // Calculate averages of completed months to project the future
    const numCompleted = completedMonths.length || 1;
    const avgOperado = completedMonths.reduce((sum, x) => sum + x.totalOperado, 0) / numCompleted;
    const avgReceita = completedMonths.reduce((sum, x) => sum + x.receita, 0) / numCompleted;
    const avgCusto = completedMonths.reduce((sum, x) => sum + x.custo, 0) / numCompleted;

    // Define growth rate parameters based on the scenario
    let monthlyGrowth = 0;
    let costGrowth = 0;

    if (scenario === "moderado") {
        monthlyGrowth = 0.05; // 5% growth
        costGrowth = 0.01;    // 1% cost growth
    } else if (scenario === "otimista") {
        monthlyGrowth = 0.10; // 10% growth
        costGrowth = 0.02;    // 2% cost growth
    }

    const projectedMonths: any[] = [];
    for (let m = currentMonthIdx; m < 12; m++) {
        const steps = m - currentMonthIdx + 1;
        const factor = Math.pow(1 + monthlyGrowth, steps);
        const costFactor = Math.pow(1 + costGrowth, steps);

        const totalOperado = avgOperado * factor;
        const receita = avgReceita * factor;
        const custo = avgCusto * costFactor;
        const lucroLiquido = receita - custo;

        projectedMonths.push({ m, totalOperado, receita, custo, lucroLiquido });
    }

    // Build the 12 months array
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const fullYear = [];

    for (let m = 0; m < 12; m++) {
        const isProjected = m >= currentMonthIdx;
        if (isProjected) {
            const p = projectedMonths.find(x => x.m === m);
            fullYear.push({
                name: monthNames[m],
                status: "PROJETADO",
                totalOperado: p.totalOperado,
                receita: p.receita,
                custo: p.custo,
                lucroLiquido: p.lucroLiquido,
                rentabilidade: p.totalOperado > 0 ? (p.lucroLiquido / p.totalOperado) * 100 : 0
            });
        } else {
            const c = completedMonths.find(x => x.m === m);
            fullYear.push({
                name: monthNames[m],
                status: "REALIZADO",
                totalOperado: c.totalOperado,
                receita: c.receita,
                custo: c.custo,
                lucroLiquido: c.lucroLiquido,
                rentabilidade: c.totalOperado > 0 ? (c.lucroLiquido / c.totalOperado) * 100 : 0
            });
        }
    }

    // Projections Summary
    const totalVolumeAno = fullYear.reduce((sum, x) => sum + x.totalOperado, 0);
    const totalReceitaAno = fullYear.reduce((sum, x) => sum + x.receita, 0);
    const totalCustoAno = fullYear.reduce((sum, x) => sum + x.custo, 0);
    const totalLucroAno = fullYear.reduce((sum, x) => sum + x.lucroLiquido, 0);
    const rentabilidadeMediaAno = totalVolumeAno > 0 ? (totalLucroAno / totalVolumeAno) * 100 : 0;

    const totalVolumeRealizado = completedMonths.reduce((sum, x) => sum + x.totalOperado, 0);
    const totalLucroRealizado = completedMonths.reduce((sum, x) => sum + x.lucroLiquido, 0);

    // Client Rankings
    const clientPerformanceMap: Record<string, {
        id: string;
        name: string;
        totalVolume: number;
        totalRevenue: number;
        totalTarifas: number;
        numOps: number;
    }> = {};

    operations.forEach(o => {
        const cId = o.clientId;
        const cName = o.client.name;
        const revenue = o.fator + o.tarifas + o.adValorem + (o.iof || 0) + (o.iofAdicional || 0);

        if (!clientPerformanceMap[cId]) {
            clientPerformanceMap[cId] = {
                id: cId,
                name: cName,
                totalVolume: 0,
                totalRevenue: 0,
                totalTarifas: 0,
                numOps: 0
            };
        }

        clientPerformanceMap[cId].totalVolume += o.valorBruto;
        clientPerformanceMap[cId].totalRevenue += revenue;
        clientPerformanceMap[cId].totalTarifas += o.tarifas;
        clientPerformanceMap[cId].numOps += 1;
    });

    const clientPerformanceList = Object.values(clientPerformanceMap).map(c => {
        return {
            ...c,
            rentabilidadePercent: c.totalVolume > 0 ? (c.totalRevenue / c.totalVolume) * 100 : 0,
            tarifaMedia: c.numOps > 0 ? c.totalTarifas / c.numOps : 0
        };
    });

    // Rank by Revenue
    const revenueRanking = [...clientPerformanceList].sort((a, b) => b.totalRevenue - a.totalRevenue);
    // Rank by Tarifas Flat
    const tarifasRanking = [...clientPerformanceList].sort((a, b) => b.totalTarifas - a.totalTarifas);

    // Formatters
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };
    const formatPercent = (val: number) => `${val.toFixed(2)}%`;

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            
            {/* Page Header */}
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>Projeções de Crescimento</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Simulação financeira para o encerramento do ano de 2026 e análise de cedentes</p>
                </div>
                
                {/* Scenario Selector */}
                <div style={{ display: "flex", background: "var(--bg-tertiary)", padding: "0.25rem", borderRadius: "var(--radius-sm)", gap: "0.25rem" }}>
                    {[
                        { id: "conservador", label: "Conservador (Histórico)" },
                        { id: "moderado", label: "Moderado (+5%/mês)" },
                        { id: "otimista", label: "Otimista (+10%/mês)" }
                    ].map(s => {
                        const isSelected = scenario === s.id;
                        return (
                            <Link
                                key={s.id}
                                href={`/projecao?scenario=${s.id}`}
                                style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "var(--radius-xs)",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.025em",
                                    background: isSelected ? "#000000" : "transparent",
                                    color: isSelected ? "#ffffff" : "var(--text-secondary)",
                                    transition: "all var(--transition-fast)"
                                }}
                            >
                                {s.label}
                            </Link>
                        );
                    })}
                </div>
            </header>

            {/* Top Stats Cards */}
            <section className="layout-grid">
                <div className="glass-panel">
                    <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Volume Total Projetado (2026)</h3>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.5rem" }}>{formatCurrency(totalVolumeAno)}</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Realizado: {formatCurrency(totalVolumeRealizado)}
                    </p>
                </div>
                <div className="glass-panel">
                    <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Lucro Líquido Projetado (2026)</h3>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-primary)", marginTop: "0.5rem" }}>{formatCurrency(totalLucroAno)}</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Realizado: {formatCurrency(totalLucroRealizado)}
                    </p>
                </div>
                <div className="glass-panel">
                    <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Rentabilidade Média (2026)</h3>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-secondary)", marginTop: "0.5rem" }}>{formatPercent(rentabilidadeMediaAno)}</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Eficiência sobre capital operado
                    </p>
                </div>
            </section>

            {/* Split Screen Layout */}
            <div className="responsive-grid-1-2" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "2.5rem" }}>
                
                {/* Left Side: Monthly Projections Table */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 800 }}>Previsão Mensal Detalhada (2026)</h2>
                        <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>Tabela de desempenho combinando meses consolidados e estimativas</p>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr>
                                    <th>Mês</th>
                                    <th>Status</th>
                                    <th>Volume Operado</th>
                                    <th>Receita</th>
                                    <th>Custos</th>
                                    <th>Lucro Líquido</th>
                                    <th>Rentab.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fullYear.map((item, index) => {
                                    const isProj = item.status === "PROJETADO";
                                    return (
                                        <tr key={index} style={{ backgroundColor: isProj ? "rgba(0, 0, 0, 0.01)" : "transparent" }}>
                                            <td style={{ fontWeight: 700 }}>{item.name}</td>
                                            <td>
                                                <span style={{
                                                    fontSize: "0.625rem",
                                                    fontWeight: 800,
                                                    padding: "0.125rem 0.375rem",
                                                    borderRadius: "4px",
                                                    background: isProj ? "rgba(217, 119, 6, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                                    color: isProj ? "var(--accent-orange)" : "var(--accent-primary)"
                                                }}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td>{formatCurrency(item.totalOperado)}</td>
                                            <td>{formatCurrency(item.receita)}</td>
                                            <td style={{ color: "var(--accent-red)" }}>{formatCurrency(-item.custo)}</td>
                                            <td style={{ fontWeight: 700, color: item.lucroLiquido >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>
                                                {formatCurrency(item.lucroLiquido)}
                                            </td>
                                            <td>{formatPercent(item.rentabilidade)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side: Client Rankings */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
                    
                    {/* Ranking 1: Rentabilidade & Receita */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                            <h2 style={{ fontSize: "1.125rem", fontWeight: 800 }}>Melhores Cedentes (Rentabilidade / Receita)</h2>
                            <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>Cedentes ordenados por receita líquida gerada no ano</p>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: "40px" }}>Pos</th>
                                        <th>Cedente</th>
                                        <th>Volume</th>
                                        <th>Receita</th>
                                        <th>Rentab. %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revenueRanking.slice(0, 5).map((client, idx) => (
                                        <tr key={client.id}>
                                            <td style={{ fontWeight: 800, color: "var(--text-tertiary)" }}>{idx + 1}º</td>
                                            <td style={{ fontWeight: 700 }}>{client.name}</td>
                                            <td>{formatCurrency(client.totalVolume)}</td>
                                            <td style={{ fontWeight: 700, color: "var(--accent-primary)" }}>{formatCurrency(client.totalRevenue)}</td>
                                            <td>{formatPercent(client.rentabilidadePercent)}</td>
                                        </tr>
                                    ))}
                                    {revenueRanking.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>Nenhuma operação registrada em 2026.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ranking 2: Melhores Tarifas Flat */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                            <h2 style={{ fontSize: "1.125rem", fontWeight: 800 }}>Melhores Cedentes (Tarifas Flat)</h2>
                            <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>Cedentes ordenados pelo total arrecadado com tarifa flat por boleto/contrato</p>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: "40px" }}>Pos</th>
                                        <th>Cedente</th>
                                        <th>Nº Ops</th>
                                        <th>Total Tarifas</th>
                                        <th>Tarifa Média</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tarifasRanking.slice(0, 5).map((client, idx) => (
                                        <tr key={client.id}>
                                            <td style={{ fontWeight: 800, color: "var(--text-tertiary)" }}>{idx + 1}º</td>
                                            <td style={{ fontWeight: 700 }}>{client.name}</td>
                                            <td>{client.numOps} ops</td>
                                            <td style={{ fontWeight: 700, color: "var(--accent-secondary)" }}>{formatCurrency(client.totalTarifas)}</td>
                                            <td>{formatCurrency(client.tarifaMedia)} / op</td>
                                        </tr>
                                    ))}
                                    {tarifasRanking.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>Nenhuma tarifa arrecadada em 2026.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}

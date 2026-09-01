"use client";

import { useState } from "react";

interface CompletedMonth {
  m: number;
  totalOperado: number;
  receita: number;
  custo: number;
  lucroLiquido: number;
}

interface ProjectionsSectionProps {
  completedMonths: CompletedMonth[];
  currentMonthIdx: number;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

const formatPercent = (val: number) => `${val.toFixed(2)}%`;

export default function ProjectionsSection({
  completedMonths,
  currentMonthIdx
}: ProjectionsSectionProps) {
  const [scenario, setScenario] = useState<"conservador" | "moderado" | "otimista">("conservador");

  const numCompleted = completedMonths.length || 1;
  const avgOperado = completedMonths.reduce((sum, x) => sum + x.totalOperado, 0) / numCompleted;
  const avgReceita = completedMonths.reduce((sum, x) => sum + x.receita, 0) / numCompleted;
  const avgCusto = completedMonths.reduce((sum, x) => sum + x.custo, 0) / numCompleted;

  let monthlyGrowth = 0;
  let costGrowth = 0;

  if (scenario === "moderado") {
    monthlyGrowth = 0.05;
    costGrowth = 0.01;
  } else if (scenario === "otimista") {
    monthlyGrowth = 0.10;
    costGrowth = 0.02;
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

  const fullYearProjections = [];
  for (let m = 0; m < 12; m++) {
    const isProjected = m >= currentMonthIdx;
    if (isProjected) {
      const p = projectedMonths.find(x => x.m === m);
      fullYearProjections.push({
        name: monthNames[m],
        status: "PROJETADO",
        totalOperado: p ? p.totalOperado : 0,
        receita: p ? p.receita : 0,
        custo: p ? p.custo : 0,
        lucroLiquido: p ? p.lucroLiquido : 0,
        rentabilidade: p && p.totalOperado > 0 ? (p.lucroLiquido / p.totalOperado) * 100 : 0
      });
    } else {
      const c = completedMonths.find(x => x.m === m);
      fullYearProjections.push({
        name: monthNames[m],
        status: "REALIZADO",
        totalOperado: c ? c.totalOperado : 0,
        receita: c ? c.receita : 0,
        custo: c ? c.custo : 0,
        lucroLiquido: c ? c.lucroLiquido : 0,
        rentabilidade: c && c.totalOperado > 0 ? (c.lucroLiquido / c.totalOperado) * 100 : 0
      });
    }
  }

  const totalVolumeAnoProj = fullYearProjections.reduce((sum, x) => sum + x.totalOperado, 0);
  const totalLucroAnoProj = fullYearProjections.reduce((sum, x) => sum + x.lucroLiquido, 0);
  const rentabilidadeMediaAnoProj = totalVolumeAnoProj > 0 ? (totalLucroAnoProj / totalVolumeAnoProj) * 100 : 0;

  const totalVolumeRealizadoProj = completedMonths.reduce((sum, x) => sum + x.totalOperado, 0);
  const totalLucroRealizadoProj = completedMonths.reduce((sum, x) => sum + x.lucroLiquido, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>PROJEÇÕES DE FECHAMENTO & DESEMPENHO (2026)</h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
            Simulação baseada na média mensal realizada de {currentMonthIdx} meses para prever o encerramento em Dez/2026
          </p>
        </div>

        {/* Scenario Selector */}
        <div style={{ display: "flex", background: "var(--bg-tertiary)", padding: "0.25rem", borderRadius: "var(--radius-sm)", gap: "0.25rem" }}>
          {[
            { id: "conservador" as const, label: "Conservador" },
            { id: "moderado" as const, label: "Moderado (+5%)" },
            { id: "otimista" as const, label: "Otimista (+10%)" }
          ].map(s => {
            const isSelected = scenario === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenario(s.id)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  background: isSelected ? "#000000" : "transparent",
                  color: isSelected ? "#ffffff" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)"
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Projections Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Volume Projetado (Dez/2026)</h4>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.5rem" }}>{formatCurrency(totalVolumeAnoProj)}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Realizado até agora: {formatCurrency(totalVolumeRealizadoProj)}
          </p>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Lucro Projetado (Dez/2026)</h4>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-primary)", marginTop: "0.5rem" }}>{formatCurrency(totalLucroAnoProj)}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Realizado até agora: {formatCurrency(totalLucroRealizadoProj)}
          </p>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Rentabilidade Projetada (Média)</h4>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-secondary)", marginTop: "0.5rem" }}>{formatPercent(rentabilidadeMediaAnoProj)}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Eficiência média estimada
          </p>
        </div>
      </div>

      {/* Monthly Forecast Table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>Tabela Mensal 2026</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem" }}>Mês</th>
                <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem" }}>Status</th>
                <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Volume</th>
                <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Receita</th>
                <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Lucro Líq.</th>
              </tr>
            </thead>
            <tbody>
              {fullYearProjections.map((m, index) => {
                const isProj = m.status === "PROJETADO";
                return (
                  <tr key={index} style={{ borderBottom: "1px solid rgba(0,0,0,0.02)" }}>
                    <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", fontWeight: 700 }}>{m.name}</td>
                    <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem" }}>
                      <span style={{
                        fontSize: "0.5625rem",
                        fontWeight: 800,
                        padding: "0.125rem 0.375rem",
                        borderRadius: "4px",
                        background: isProj ? "rgba(217, 119, 6, 0.1)" : "rgba(16, 185, 129, 0.1)",
                        color: isProj ? "var(--accent-orange)" : "var(--accent-primary)"
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right" }}>{formatCurrency(m.totalOperado)}</td>
                    <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right" }}>{formatCurrency(m.receita)}</td>
                    <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right", fontWeight: 700, color: m.lucroLiquido >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>{formatCurrency(m.lucroLiquido)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

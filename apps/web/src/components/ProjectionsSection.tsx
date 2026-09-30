"use client";

import { useState } from "react";

export interface MonthData {
  m: number;
  totalOperado: number;
  receita: number;
  custo: number;
  lucroLiquido: number;
  hasActivity?: boolean;
}

interface ProjectionsSectionProps {
  monthlyData?: MonthData[];
  completedMonths?: MonthData[];
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
  monthlyData,
  completedMonths,
  currentMonthIdx
}: ProjectionsSectionProps) {
  const [scenario, setScenario] = useState<"conservador" | "moderado" | "otimista">("conservador");

  const data = monthlyData || completedMonths || [];

  // Meses anteriores já fechados (m < currentMonthIdx) com atividade financeira registrada
  const closedMonthsWithActivity = data.filter(
    x => x.m < currentMonthIdx && (x.totalOperado > 0 || x.receita > 0 || x.custo > 0)
  );

  // Fallback caso não haja meses fechados com atividade (ex: início de ano)
  const baselineMonths = closedMonthsWithActivity.length > 0
    ? closedMonthsWithActivity
    : data.filter(x => x.totalOperado > 0 || x.receita > 0 || x.custo > 0);

  const numBaseline = baselineMonths.length || 1;
  const avgOperado = baselineMonths.reduce((sum, x) => sum + x.totalOperado, 0) / numBaseline;
  const avgReceita = baselineMonths.reduce((sum, x) => sum + x.receita, 0) / numBaseline;
  const avgCusto = baselineMonths.reduce((sum, x) => sum + x.custo, 0) / numBaseline;

  let monthlyGrowth = 0;
  let costGrowth = 0;

  if (scenario === "moderado") {
    monthlyGrowth = 0.05;
    costGrowth = 0.01;
  } else if (scenario === "otimista") {
    monthlyGrowth = 0.10;
    costGrowth = 0.02;
  }

  const fullYearProjections = [];
  for (let m = 0; m < 12; m++) {
    const realMonth = data.find(x => x.m === m);
    const realOperado = realMonth ? realMonth.totalOperado : 0;
    const realReceita = realMonth ? realMonth.receita : 0;
    const realCusto = realMonth ? realMonth.custo : 0;
    const realLucro = realReceita - realCusto;

    if (m < currentMonthIdx) {
      // Mês encerrado
      fullYearProjections.push({
        m,
        name: monthNames[m],
        status: "REALIZADO" as const,
        totalOperado: realOperado,
        receita: realReceita,
        custo: realCusto,
        lucroLiquido: realLucro,
        rentabilidade: realOperado > 0 ? (realLucro / realOperado) * 100 : 0
      });
    } else if (m === currentMonthIdx) {
      // Mês corrente em andamento: atualiza a cada operação ou custo cadastrado
      fullYearProjections.push({
        m,
        name: monthNames[m],
        status: "EM ANDAMENTO" as const,
        totalOperado: realOperado,
        receita: realReceita,
        custo: realCusto,
        lucroLiquido: realLucro,
        rentabilidade: realOperado > 0 ? (realLucro / realOperado) * 100 : 0
      });
    } else {
      // Mês futuro: projeção baseada na média dos meses fechados e taxa do cenário
      const steps = m - currentMonthIdx;
      const factor = Math.pow(1 + monthlyGrowth, steps);
      const costFactor = Math.pow(1 + costGrowth, steps);

      const projOperado = avgOperado * factor;
      const projReceita = avgReceita * factor;
      const projCusto = avgCusto * costFactor;

      // Respeita lançamentos futuros que já possam ter sido agendados
      const finalOperado = Math.max(realOperado, projOperado);
      const finalReceita = Math.max(realReceita, projReceita);
      const finalCusto = Math.max(realCusto, projCusto);
      const finalLucro = finalReceita - finalCusto;

      fullYearProjections.push({
        m,
        name: monthNames[m],
        status: "PROJETADO" as const,
        totalOperado: finalOperado,
        receita: finalReceita,
        custo: finalCusto,
        lucroLiquido: finalLucro,
        rentabilidade: finalOperado > 0 ? (finalLucro / finalOperado) * 100 : 0
      });
    }
  }

  // Métricas do ano completo (realizado + em andamento + projetado)
  const totalVolumeAnoProj = fullYearProjections.reduce((sum, x) => sum + x.totalOperado, 0);
  const totalLucroAnoProj = fullYearProjections.reduce((sum, x) => sum + x.lucroLiquido, 0);
  const rentabilidadeMediaAnoProj = totalVolumeAnoProj > 0 ? (totalLucroAnoProj / totalVolumeAnoProj) * 100 : 0;

  // Realizado acumulado até o momento (inclui meses encerrados e mês corrente em andamento)
  const activeMonths = fullYearProjections.filter(x => x.m <= currentMonthIdx);
  const totalVolumeRealizadoProj = activeMonths.reduce((sum, x) => sum + x.totalOperado, 0);
  const totalLucroRealizadoProj = activeMonths.reduce((sum, x) => sum + x.lucroLiquido, 0);
  const rentabilidadeRealizadaProj = totalVolumeRealizadoProj > 0
    ? (totalLucroRealizadoProj / totalVolumeRealizadoProj) * 100
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>PROJEÇÕES DE FECHAMENTO & DESEMPENHO (2026)</h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
            Acompanhamento contínuo em tempo real (dados acumulados até agora + projeção estimada para o encerramento em Dez/2026)
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
            Realizado até agora: <strong>{formatCurrency(totalVolumeRealizadoProj)}</strong>
          </p>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Lucro Projetado (Dez/2026)</h4>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-primary)", marginTop: "0.5rem" }}>{formatCurrency(totalLucroAnoProj)}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Realizado até agora: <strong>{formatCurrency(totalLucroRealizadoProj)}</strong>
          </p>
        </div>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <h4 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Rentabilidade Projetada (Média)</h4>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-secondary)", marginTop: "0.5rem" }}>{formatPercent(rentabilidadeMediaAnoProj)}</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Realizada até agora: <strong>{formatPercent(rentabilidadeRealizadaProj)}</strong>
          </p>
        </div>
      </div>

      {/* Monthly Forecast Table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>Tabela Mensal 2026</h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            Atualizada em tempo real a cada nova operação ou custo adicionado
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "0.6rem 0.5rem", fontSize: "0.6875rem", textAlign: "left" }}>Mês</th>
                <th style={{ padding: "0.6rem 0.5rem", fontSize: "0.6875rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "0.6rem 0.5rem", fontSize: "0.6875rem", textAlign: "right" }}>Volume</th>
                <th style={{ padding: "0.6rem 0.5rem", fontSize: "0.6875rem", textAlign: "right" }}>Receita</th>
                <th style={{ padding: "0.6rem 0.5rem", fontSize: "0.6875rem", textAlign: "right" }}>Custos</th>
                <th style={{ padding: "0.6rem 0.5rem", fontSize: "0.6875rem", textAlign: "right" }}>Lucro Líq.</th>
                <th style={{ padding: "0.6rem 0.5rem", fontSize: "0.6875rem", textAlign: "right" }}>Rentab.</th>
              </tr>
            </thead>
            <tbody>
              {fullYearProjections.map((m, index) => {
                const isProj = m.status === "PROJETADO";
                const isOngoing = m.status === "EM ANDAMENTO";
                return (
                  <tr key={index} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", fontWeight: 700 }}>{m.name}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem" }}>
                      <span style={{
                        fontSize: "0.5625rem",
                        fontWeight: 800,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        background: isProj
                          ? "rgba(217, 119, 6, 0.1)"
                          : isOngoing
                            ? "rgba(59, 130, 246, 0.12)"
                            : "rgba(16, 185, 129, 0.1)",
                        color: isProj
                          ? "var(--accent-orange)"
                          : isOngoing
                            ? "#2563eb"
                            : "var(--accent-primary)",
                        border: isOngoing ? "1px solid rgba(59, 130, 246, 0.25)" : "none"
                      }}>
                        {isOngoing && (
                          <span style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            backgroundColor: "#2563eb"
                          }} />
                        )}
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right" }}>{formatCurrency(m.totalOperado)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right" }}>{formatCurrency(m.receita)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", color: "var(--accent-red)" }}>{formatCurrency(m.custo)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 700, color: m.lucroLiquido >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>{formatCurrency(m.lucroLiquido)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)" }}>{formatPercent(m.rentabilidade)}</td>
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

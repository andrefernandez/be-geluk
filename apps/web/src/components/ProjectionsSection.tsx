"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Target,
  Calendar,
  Zap,
  BarChart3,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  Wallet
} from "lucide-react";

export interface MonthData {
  m: number;
  totalOperado: number;
  receita: number;
  custo: number;
  lucroLiquido: number;
  hasActivity?: boolean;
}

interface CapitalGiroInfo {
  capitalAGirar?: number;
  capitalDoDia?: number;
  rentabilidadeProjetada?: number;
  lucroProjetadoComGiro?: number;
  lucroLiquidoProjetadoFinal?: number;
  dataReferencia?: string;
  dataLimiteGiro?: string;
}

interface ProjectionsSectionProps {
  monthlyData?: MonthData[];
  completedMonths?: MonthData[];
  currentMonthIdx: number;
  capitalGiroData?: CapitalGiroInfo | null;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

const formatPercent = (val: number) => `${val.toFixed(2)}%`;

// Calcula dias úteis (Seg-Sex) entre duas datas
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(count, 1);
}

export default function ProjectionsSection({
  monthlyData,
  completedMonths,
  currentMonthIdx,
  capitalGiroData
}: ProjectionsSectionProps) {
  const [scenario, setScenario] = useState<"conservador" | "moderado" | "otimista">("conservador");

  const data = monthlyData || completedMonths || [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const endOfYear = new Date(currentYear, 11, 31);
  const remainingWorkingDaysYear = calculateWorkingDays(now, endOfYear);

  // Mês corrente e seus dias úteis
  const startOfMonth = new Date(currentYear, currentMonthIdx, 1);
  const endOfMonth = new Date(currentYear, currentMonthIdx + 1, 0);
  const totalWorkingDaysMonth = calculateWorkingDays(startOfMonth, endOfMonth);
  const workingDaysMonthElapsed = calculateWorkingDays(startOfMonth, now);
  const remainingWorkingDaysMonth = calculateWorkingDays(now, endOfMonth);

  // Meses anteriores já fechados (m < currentMonthIdx) com atividade financeira registrada
  const closedMonthsWithActivity = data.filter(
    x => x.m < currentMonthIdx && (x.totalOperado > 0 || x.receita > 0 || x.custo > 0)
  );

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

  // Montagem da projeção dos 12 meses com cálculo dinâmico baseado no dia a dia
  const fullYearProjections = useMemo(() => {
    const list = [];
    for (let m = 0; m < 12; m++) {
      const realMonth = data.find(x => x.m === m);
      const realOperado = realMonth ? realMonth.totalOperado : 0;
      const realReceita = realMonth ? realMonth.receita : 0;
      const realCusto = realMonth ? realMonth.custo : 0;
      const realLucro = realReceita - realCusto;

      if (m < currentMonthIdx) {
        // Mês encerrado: 100% histórico realizado
        list.push({
          m,
          name: monthNames[m],
          status: "REALIZADO" as const,
          totalOperado: realOperado,
          receita: realReceita,
          custo: realCusto,
          lucroLiquido: realLucro,
          rentabilidade: realOperado > 0 ? (realLucro / realOperado) * 100 : 0,
          realizadoAteAgora: realOperado,
          lucroRealizadoAteAgora: realLucro
        });
      } else if (m === currentMonthIdx) {
        // MÊS CORRENTE EM ANDAMENTO:
        // Projeta o mês COMPLETO somando o realizado até hoje + projeção do giro dos títulos em aberto no SmartFactor
        let estimatedMonthOperado = realOperado;
        let estimatedMonthLucro = realLucro;
        let estimatedMonthReceita = realReceita;
        let estimatedMonthCusto = realCusto;

        const hasGiroFinal = capitalGiroData?.lucroLiquidoProjetadoFinal !== undefined &&
                              capitalGiroData.lucroLiquidoProjetadoFinal > realLucro;

        if (hasGiroFinal) {
          // Usa os dados precisos do SmartFactor (títulos em aberto até penúltimo dia útil)
          estimatedMonthLucro = Number(capitalGiroData?.lucroLiquidoProjetadoFinal);
          const giroAdd = Number(capitalGiroData?.capitalAGirar) || 0;
          estimatedMonthOperado = realOperado + giroAdd;
          // Estima receita e custo finais proporcionais
          const propRatio = realOperado > 0 ? estimatedMonthOperado / realOperado : 1;
          estimatedMonthReceita = realReceita * propRatio;
          estimatedMonthCusto = realCusto * (1 + (propRatio - 1) * 0.1); // custos fixos sobem pouco
        } else {
          // Fallback dinâmico por Run-Rate Diário: (Valor até hoje / dias úteis passados) * dias úteis totais
          const dailyPaceOperado = workingDaysMonthElapsed > 0 ? realOperado / workingDaysMonthElapsed : 0;
          const dailyPaceLucro = workingDaysMonthElapsed > 0 ? realLucro / workingDaysMonthElapsed : 0;
          const dailyPaceReceita = workingDaysMonthElapsed > 0 ? realReceita / workingDaysMonthElapsed : 0;
          const dailyPaceCusto = workingDaysMonthElapsed > 0 ? realCusto / workingDaysMonthElapsed : 0;

          estimatedMonthOperado = realOperado + (dailyPaceOperado * remainingWorkingDaysMonth);
          estimatedMonthLucro = realLucro + (dailyPaceLucro * remainingWorkingDaysMonth);
          estimatedMonthReceita = realReceita + (dailyPaceReceita * remainingWorkingDaysMonth);
          estimatedMonthCusto = realCusto + (dailyPaceCusto * remainingWorkingDaysMonth);
        }

        list.push({
          m,
          name: monthNames[m],
          status: "EM ANDAMENTO" as const,
          totalOperado: estimatedMonthOperado,
          receita: estimatedMonthReceita,
          custo: estimatedMonthCusto,
          lucroLiquido: estimatedMonthLucro,
          rentabilidade: estimatedMonthOperado > 0 ? (estimatedMonthLucro / estimatedMonthOperado) * 100 : 0,
          realizadoAteAgora: realOperado,
          lucroRealizadoAteAgora: realLucro
        });
      } else {
        // Mês futuro (Dezembro): Projeção com base na média consolidada recente + cenário
        const steps = m - currentMonthIdx;
        const factor = Math.pow(1 + monthlyGrowth, steps);
        const costFactor = Math.pow(1 + costGrowth, steps);

        const projOperado = avgOperado * factor;
        const projReceita = avgReceita * factor;
        const projCusto = avgCusto * costFactor;

        const finalOperado = Math.max(realOperado, projOperado);
        const finalReceita = Math.max(realReceita, projReceita);
        const finalCusto = Math.max(realCusto, projCusto);
        const finalLucro = finalReceita - finalCusto;

        list.push({
          m,
          name: monthNames[m],
          status: "PROJETADO" as const,
          totalOperado: finalOperado,
          receita: finalReceita,
          custo: finalCusto,
          lucroLiquido: finalLucro,
          rentabilidade: finalOperado > 0 ? (finalLucro / finalOperado) * 100 : 0,
          realizadoAteAgora: 0,
          lucroRealizadoAteAgora: 0
        });
      }
    }
    return list;
  }, [
    data,
    currentMonthIdx,
    capitalGiroData,
    avgOperado,
    avgReceita,
    avgCusto,
    monthlyGrowth,
    costGrowth,
    workingDaysMonthElapsed,
    remainingWorkingDaysMonth
  ]);

  // Totais do ano completo (realizado + mês corrente projetado completo + meses futuros projetados)
  const totalVolumeAnoProj = fullYearProjections.reduce((sum, x) => sum + x.totalOperado, 0);
  const totalLucroAnoProj = fullYearProjections.reduce((sum, x) => sum + x.lucroLiquido, 0);
  const rentabilidadeMediaAnoProj = totalVolumeAnoProj > 0 ? (totalLucroAnoProj / totalVolumeAnoProj) * 100 : 0;

  // Realizado efetivo em caixa até o dia de hoje (meses anteriores + realizado até hoje no mês atual)
  const totalVolumeRealizadoAteHoje = fullYearProjections.reduce((sum, x) => sum + (x.realizadoAteAgora ?? 0), 0);
  const totalLucroRealizadoAteHoje = fullYearProjections.reduce((sum, x) => sum + (x.lucroRealizadoAteAgora ?? 0), 0);
  const rentabilidadeRealizadaAteHoje = totalVolumeRealizadoAteHoje > 0
    ? (totalLucroRealizadoAteHoje / totalVolumeRealizadoAteHoje) * 100
    : 0;

  // Cálculos de Progresso (%)
  const progressoVolume = totalVolumeAnoProj > 0
    ? Math.min((totalVolumeRealizadoAteHoje / totalVolumeAnoProj) * 100, 100)
    : 0;
  const gapVolume = Math.max(totalVolumeAnoProj - totalVolumeRealizadoAteHoje, 0);

  const progressoLucro = totalLucroAnoProj > 0
    ? Math.min((totalLucroRealizadoAteHoje / totalLucroAnoProj) * 100, 100)
    : 0;
  const gapLucro = Math.max(totalLucroAnoProj - totalLucroRealizadoAteHoje, 0);

  // Pacing & Meta Diária da Mesa
  const currentMonthObj = fullYearProjections[currentMonthIdx];
  const currentMonthRealOperado = currentMonthObj?.realizadoAteAgora || 0;
  const currentMonthDailyPace = workingDaysMonthElapsed > 0 ? currentMonthRealOperado / workingDaysMonthElapsed : 0;

  const requiredDailyPaceYear = remainingWorkingDaysYear > 0 ? gapVolume / remainingWorkingDaysYear : 0;
  const isPaceAhead = currentMonthDailyPace >= requiredDailyPaceYear && requiredDailyPaceYear > 0;
  const paceDiffPercent = requiredDailyPaceYear > 0
    ? ((currentMonthDailyPace - requiredDailyPaceYear) / requiredDailyPaceYear) * 100
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header com Cenários e Badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--accent-primary)"
            }}>
              <TrendingUp size={16} />
            </span>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              PROJEÇÕES DE FECHAMENTO & DESEMPENHO ({currentYear})
            </h2>
          </div>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.35rem" }}>
            Acompanhamento contínuo em tempo real (dados acumulados até hoje + projeção dinâmica do giro da carteira até Dez/{currentYear})
          </p>
        </div>

        {/* Scenario Selector */}
        <div style={{ display: "flex", background: "var(--bg-tertiary)", padding: "0.25rem", borderRadius: "10px", gap: "0.25rem", border: "1px solid var(--card-border)" }}>
          {[
            { id: "conservador" as const, label: "Conservador", hint: "Piso de Carteira (Giro Real)" },
            { id: "moderado" as const, label: "Moderado (+5%)", hint: "Crescimento Sustentado" },
            { id: "otimista" as const, label: "Otimista (+10%)", hint: "Pico Sazonal de Fim de Ano" }
          ].map(s => {
            const isSelected = scenario === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenario(s.id)}
                title={s.hint}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "8px",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  background: isSelected ? "#09090b" : "transparent",
                  color: isSelected ? "#ffffff" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Projections Stats Grid (4 Cards Executivos de Alto Padrão) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
        
        {/* CARD 1: VOLUME PROJETADO + PROGRESSO */}
        <div className="glass-card" style={{ padding: "1.35rem", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Volume Projetado (Dez/{currentYear})
              </span>
              <span style={{
                fontSize: "0.625rem",
                fontWeight: 800,
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.1)",
                color: "var(--accent-primary)"
              }}>
                {progressoVolume.toFixed(1)}% ATINGIDO
              </span>
            </div>

            <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "var(--text-primary)", marginTop: "0.5rem", letterSpacing: "-0.03em" }}>
              {formatCurrency(totalVolumeAnoProj)}
            </div>

            {/* Barra de Progresso Executiva */}
            <div style={{ marginTop: "0.85rem", width: "100%", height: "8px", background: "rgba(0,0,0,0.06)", borderRadius: "999px", overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressoVolume}%`,
                  background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.05)", fontSize: "0.75rem" }}>
            <span style={{ color: "var(--text-tertiary)" }}>
              Realizado: <strong style={{ color: "var(--text-secondary)" }}>{formatCurrency(totalVolumeRealizadoAteHoje)}</strong>
            </span>
            <span style={{ color: "var(--text-tertiary)" }}>
              Faltam: <strong style={{ color: "var(--accent-secondary)" }}>{formatCurrency(gapVolume)}</strong>
            </span>
          </div>
        </div>

        {/* CARD 2: LUCRO LÍQUIDO PROJETADO + PROGRESSO */}
        <div className="glass-card" style={{ padding: "1.35rem", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Lucro Projetado (Dez/{currentYear})
              </span>
              <span style={{
                fontSize: "0.625rem",
                fontWeight: 800,
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.1)",
                color: "var(--accent-primary)"
              }}>
                {progressoLucro.toFixed(1)}% ATINGIDO
              </span>
            </div>

            <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "var(--accent-primary)", marginTop: "0.5rem", letterSpacing: "-0.03em" }}>
              {formatCurrency(totalLucroAnoProj)}
            </div>

            {/* Barra de Progresso Executiva */}
            <div style={{ marginTop: "0.85rem", width: "100%", height: "8px", background: "rgba(0,0,0,0.06)", borderRadius: "999px", overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressoLucro}%`,
                  background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.05)", fontSize: "0.75rem" }}>
            <span style={{ color: "var(--text-tertiary)" }}>
              Realizado: <strong style={{ color: "var(--text-secondary)" }}>{formatCurrency(totalLucroRealizadoAteHoje)}</strong>
            </span>
            <span style={{ color: "var(--text-tertiary)" }}>
              Faltam: <strong style={{ color: "var(--accent-primary)" }}>{formatCurrency(gapLucro)}</strong>
            </span>
          </div>
        </div>

        {/* CARD 3: RENTABILIDADE MÉDIA PROJETADA */}
        <div className="glass-card" style={{ padding: "1.35rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Rentabilidade Média
              </span>
              <span style={{
                fontSize: "0.625rem",
                fontWeight: 800,
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                background: rentabilidadeMediaAnoProj >= rentabilidadeRealizadaAteHoje ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: rentabilidadeMediaAnoProj >= rentabilidadeRealizadaAteHoje ? "var(--accent-primary)" : "#ef4444"
              }}>
                {rentabilidadeMediaAnoProj >= rentabilidadeRealizadaAteHoje ? "+ " : "- "}
                {Math.abs(rentabilidadeMediaAnoProj - rentabilidadeRealizadaAteHoje).toFixed(2)}% vs Real
              </span>
            </div>

            <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "var(--text-primary)", marginTop: "0.5rem", letterSpacing: "-0.03em" }}>
              {formatPercent(rentabilidadeMediaAnoProj)}
            </div>

            <p style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", marginTop: "0.6rem" }}>
              Retenção líquida média projetada sobre o volume bruto operado.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.05)", fontSize: "0.75rem" }}>
            <span style={{ color: "var(--text-tertiary)" }}>
              Realizada até hoje: <strong style={{ color: "var(--text-secondary)" }}>{formatPercent(rentabilidadeRealizadaAteHoje)}</strong>
            </span>
            <span style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>
              Spread Estável
            </span>
          </div>
        </div>

        {/* CARD 4: RITMO & META DIÁRIA DA MESA (PACING) */}
        <div className="glass-card" style={{ padding: "1.35rem", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Zap size={14} style={{ color: isPaceAhead ? "var(--accent-primary)" : "#f59e0b" }} />
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Ritmo da Mesa (Pace)
                </span>
              </div>
              <span style={{
                fontSize: "0.625rem",
                fontWeight: 800,
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                background: isPaceAhead ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                color: isPaceAhead ? "var(--accent-primary)" : "#d97706",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem"
              }}>
                {isPaceAhead ? "🟢 RITMO ACIMA" : "🟡 ACELERAR"}
              </span>
            </div>

            <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "var(--text-primary)", marginTop: "0.5rem", letterSpacing: "-0.03em" }}>
              {formatCurrency(requiredDailyPaceYear)}
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", marginLeft: "0.3rem" }}>/ dia útil</span>
            </div>

            <p style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", marginTop: "0.6rem" }}>
              Meta de compras necessária nos {remainingWorkingDaysYear} dias úteis restantes de {currentYear}.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.05)", fontSize: "0.75rem" }}>
            <span style={{ color: "var(--text-tertiary)" }}>
              Ritmo {monthNames[currentMonthIdx]}: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(currentMonthDailyPace)}/dia</strong>
            </span>
            <span style={{ color: isPaceAhead ? "var(--accent-primary)" : "#d97706", fontWeight: 700 }}>
              {paceDiffPercent >= 0 ? `+${paceDiffPercent.toFixed(0)}%` : `${paceDiffPercent.toFixed(0)}%`}
            </span>
          </div>
        </div>

      </div>

      {/* Horizontes de Fechamento (Mês Atual Dinâmico vs. Carrego de Fim de Ano) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        {/* Bloco Mês Atual com Realizado vs Projetado */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", boxShadow: "0 0 6px #2563eb" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Fechamento {monthNames[currentMonthIdx]}/{currentYear} (Mês Atual)
              </span>
            </div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.35rem" }}>
              {formatCurrency(currentMonthObj?.totalOperado || 0)}
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-tertiary)", marginLeft: "0.4rem" }}>
                (Realizado até hoje: {formatCurrency(currentMonthRealOperado)})
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: 700, marginTop: "0.2rem" }}>
              Lucro est.: {formatCurrency(currentMonthObj?.lucroLiquido || 0)}
              <span style={{ color: "var(--text-tertiary)", fontWeight: 500, marginLeft: "0.3rem" }}>
                (já realizado: {formatCurrency(currentMonthObj?.lucroRealizadoAteAgora || 0)})
              </span>
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textAlign: "right" }}>
            Restam <strong>{remainingWorkingDaysMonth}</strong> dias úteis
          </span>
        </div>

        {/* Bloco Dezembro (Sazonalidade) */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-primary)" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Carrego Dezembro/{currentYear} (Sazonalidade 13º)
              </span>
            </div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--accent-primary)", marginTop: "0.35rem" }}>
              {formatCurrency(fullYearProjections[11]?.totalOperado || 0)}
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-tertiary)", marginLeft: "0.4rem" }}>
                estimativa de pico
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600, marginTop: "0.2rem" }}>
              Lucro projetado: <strong style={{ color: "var(--accent-primary)" }}>{formatCurrency(fullYearProjections[11]?.lucroLiquido || 0)}</strong>
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textAlign: "right" }}>
            Pico de compras
          </span>
        </div>
      </div>

      {/* Monthly Forecast Table (Executiva & Aprimorada) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BarChart3 size={16} style={{ color: "var(--text-secondary)" }} />
            <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Tabela Mensal Consolidada {currentYear}
            </h3>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            Atualizada em tempo real a cada nova operação ou custo adicionado
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "680px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "left", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mês</th>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "left", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "right", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Volume</th>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "right", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Receita</th>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "right", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Custos</th>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "right", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lucro Líq.</th>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "right", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rentab.</th>
                <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.6875rem", textAlign: "right", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>% do Ano</th>
              </tr>
            </thead>
            <tbody>
              {fullYearProjections.map((m, index) => {
                const isProj = m.status === "PROJETADO";
                const isOngoing = m.status === "EM ANDAMENTO";
                const shareVolume = totalVolumeAnoProj > 0 ? (m.totalOperado / totalVolumeAnoProj) * 100 : 0;

                return (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.04)",
                      background: isOngoing ? "rgba(59, 130, 246, 0.02)" : "transparent",
                      transition: "background 0.15s ease"
                    }}
                  >
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {m.name}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem" }}>
                      <span style={{
                        fontSize: "0.5625rem",
                        fontWeight: 800,
                        padding: "0.2rem 0.5rem",
                        borderRadius: "5px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        background: isProj
                          ? "rgba(217, 119, 6, 0.1)"
                          : isOngoing
                            ? "rgba(59, 130, 246, 0.12)"
                            : "rgba(16, 185, 129, 0.1)",
                        color: isProj
                          ? "#d97706"
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
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 600 }}>
                      <div>{formatCurrency(m.totalOperado)}</div>
                      {isOngoing && m.realizadoAteAgora > 0 && (
                        <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                          (Real: {formatCurrency(m.realizadoAteAgora)})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatCurrency(m.receita)}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", color: "var(--accent-red)" }}>
                      {formatCurrency(m.custo)}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 700, color: m.lucroLiquido >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>
                      <div>{formatCurrency(m.lucroLiquido)}</div>
                      {isOngoing && m.lucroRealizadoAteAgora > 0 && (
                        <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                          (Real: {formatCurrency(m.lucroRealizadoAteAgora)})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {formatPercent(m.rentabilidade)}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", color: "var(--text-tertiary)", fontWeight: 600 }}>
                      {shareVolume.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--card-border)", background: "var(--bg-secondary)" }}>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.8125rem", fontWeight: 900, textTransform: "uppercase" }}>
                  TOTAL CONSOLIDADO
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.6875rem", fontWeight: 800, color: "var(--text-tertiary)" }}>
                  12 MESES
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 900, color: "var(--text-primary)" }}>
                  {formatCurrency(totalVolumeAnoProj)}
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 700 }}>
                  {formatCurrency(fullYearProjections.reduce((sum, x) => sum + x.receita, 0))}
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 700, color: "var(--accent-red)" }}>
                  {formatCurrency(fullYearProjections.reduce((sum, x) => sum + x.custo, 0))}
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 900, color: "var(--accent-primary)" }}>
                  {formatCurrency(totalLucroAnoProj)}
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 800, color: "var(--text-primary)" }}>
                  {formatPercent(rentabilidadeMediaAnoProj)}
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.8125rem", textAlign: "right", fontWeight: 800, color: "var(--accent-primary)" }}>
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

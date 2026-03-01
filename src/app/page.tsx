import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import MonthFilter from "@/components/MonthFilter";
import { cookies } from "next/headers";
import DashboardCharts from "@/components/DashboardCharts";

export default async function Home({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Definindo o período selecionado
  let dateFilter: any = {};
  let displayTitle = "";

  const resolvedParams = await searchParams;
  let monthParam = typeof resolvedParams?.month === 'string' ? resolvedParams.month : Array.isArray(resolvedParams?.month) ? resolvedParams.month[0] : null;

  if (!monthParam) {
    const cookieStore = await cookies();
    monthParam = cookieStore.get("selectedMonth")?.value || "all"; // Default de "all"
  }

  if (monthParam === "all") {
    const startOfYear = new Date(2026, 0, 1);
    const endOfYear = new Date(2026, 11, 31, 23, 59, 59);
    dateFilter = { gte: startOfYear, lte: endOfYear };
    displayTitle = "Resumo Geral 2026";
  } else {
    const [year, month] = monthParam.split("-");
    const now = new Date(Number(year), Number(month) - 1, 15);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    dateFilter = { gte: startOfMonth, lte: endOfMonth };
    displayTitle = `Resumo Mensal - ${now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
  }

  // Busca operações do período selecionado
  const operations = await prisma.operation.findMany({
    where: { date: dateFilter },
    include: { client: true },
    orderBy: { date: "asc" }
  });

  // Busca custos do período selecionado
  const costs = await prisma.cost.findMany({
    where: { date: dateFilter }
  });

  // ---- FUNÇÃO DE SOMA SEGURA ----
  const safeSumOperations = (key: keyof typeof operations[0]) => {
    return operations.reduce((acc, op) => acc + Math.round((Number(op[key]) || 0) * 100), 0) / 100;
  };

  const safeSumList = (list: any[]) => {
    return list.reduce((acc, item) => acc + Math.round((Number(item.amount) || 0) * 100), 0) / 100;
  };

  // ---- CALCULA DASHBOARD MAE ----

  const totalOperado = safeSumOperations("valorBruto");

  // Receita Bruta = Fator + Tarifas + AdValorem + IOF + IOF Adicional
  const receitaBruta = (Math.round((
    safeSumOperations("fator") +
    safeSumOperations("tarifas") +
    safeSumOperations("adValorem") +
    safeSumOperations("iof") +
    safeSumOperations("iofAdicional")
  ) * 100)) / 100;

  const custoOperadoPercent = totalOperado > 0 ? ((receitaBruta / totalOperado) * 100) : 0; // Aproximação Custo/Operado da planilha

  // Separação dos Custos
  const custosFixos = safeSumList(costs.filter(c => c.category === "FIXO"));
  const custosVariaveis = safeSumList(costs.filter(c => c.category === "VARIAVEL"));
  const impostosList = costs.filter(c => c.category === "IMPOSTO");
  const impostos = safeSumList(impostosList);

  // Agora "Investidores" é puxado direto da tela de Lançamentos de Custos
  const investidoresTotal = safeSumList(costs.filter(c => c.category === "INVESTIDORES"));

  // ==========================================
  // CÁLCULO DE RESULTADO: DRE (Lucro Real)
  // ==========================================
  // Segundo as normas contábeis de fomento mercantil no Lucro Real, o resultado segue:
  // 1. Receita Operacional Bruta = Fator + Ad Valorem + Tarifas (+ IOF retido do cliente)
  // 2. (-) Impostos sobre Faturamento (PIS, COFINS, ISS) e IOF Repassado
  // 3. (-) Despesas Operacionais (Custos Fixos, Variáveis, Repasses Investidores)
  // 4. (-) Impostos sobre o Lucro (IRPJ e CSLL)
  // = Lucro Líquido

  const iofTotal = safeSumOperations("iof") + safeSumOperations("iofAdicional");
  const impostosRegistrados = safeSumList(impostosList); // (PIS + COFINS + ISS + IRPJ + CSLL) lançados na tela

  // Mantemos o custo total normal para os outros painéis:
  const custoTotal = custosFixos + custosVariaveis + impostosRegistrados + investidoresTotal;

  // Lucro Líquido Corrigido: Receita Bruta - Despesas - Todos os Impostos (incluindo o IOF retido)
  // Obs: O "Valor Bruto" dos títulos (totalOperado) NÃO é deduzido do lucro, 
  // pois a aquisição do recebível é uma mutação patrimonial (troca de dinheiro por direito de crédito), não uma despesa.
  // O IOF agora é puxado exclusivamente dos lançamentos da aba de Custos (dentro de impostosRegistrados),
  // para não duplicar com a dedução automática.
  const lucroLiquido = receitaBruta - custosFixos - custosVariaveis - impostosRegistrados - investidoresTotal;

  const rentabilidade = totalOperado > 0 ? (lucroLiquido / totalOperado) * 100 : 0;

  const custoReceitaPercent = receitaBruta > 0 ? (custoTotal / receitaBruta) * 100 : 0;

  // ==========================================
  // DADOS PARA O GRÁFICO (MÊS A MÊS)
  // ==========================================
  const allOperations = await prisma.operation.findMany({ orderBy: { date: 'asc' } });
  const allCosts = await prisma.cost.findMany();

  const groupedByMonth: Record<string, { month: string; rawDate: Date; ops: any[]; costs: any[] }> = {};

  [...allOperations, ...allCosts].forEach(item => {
    const d = new Date(item.date);
    const mStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!groupedByMonth[mStr]) {
      groupedByMonth[mStr] = { month: mStr, rawDate: d, ops: [], costs: [] };
    }
    if ('valorBruto' in item) {
      groupedByMonth[mStr].ops.push(item);
    } else {
      groupedByMonth[mStr].costs.push(item);
    }
  });

  const chartData = Object.values(groupedByMonth)
    .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
    .map(group => {
      const groupOps = group.ops;
      const groupCosts = group.costs;

      const gTotalOperado = groupOps.reduce((acc, o) => acc + Math.round(Number(o.valorBruto || 0) * 100), 0) / 100;
      const gReceita = groupOps.reduce((acc, o) => acc + Math.round((Number(o.fator) + Number(o.tarifas) + Number(o.adValorem) + Number(o.iof) + Number(o.iofAdicional)) * 100), 0) / 100;

      const gCustosFixos = groupCosts.filter(c => c.category === 'FIXO').reduce((acc, c) => acc + Math.round(Number(c.amount) * 100), 0) / 100;
      const gCustosVariaveis = groupCosts.filter(c => c.category === 'VARIAVEL').reduce((acc, c) => acc + Math.round(Number(c.amount) * 100), 0) / 100;
      const gImpostosList = groupCosts.filter(c => c.category === 'IMPOSTO');

      const gPis = gImpostosList.filter(c => c.name.toLowerCase().includes('pis')).reduce((a, c) => a + Math.round(Number(c.amount) * 100), 0) / 100;
      const gCofins = gImpostosList.filter(c => c.name.toLowerCase().includes('cofins')).reduce((a, c) => a + Math.round(Number(c.amount) * 100), 0) / 100;
      const gIofMensal = gImpostosList.filter(c => c.name.toLowerCase().includes('iof')).reduce((a, c) => a + Math.round(Number(c.amount) * 100), 0) / 100;
      const gIr = gImpostosList.filter(c => c.name.toLowerCase().includes('ir') || c.name.toLowerCase().includes('i.r')).reduce((a, c) => a + Math.round(Number(c.amount) * 100), 0) / 100;
      const gCsll = gImpostosList.filter(c => c.name.toLowerCase().includes('csll') || c.name.toLowerCase().includes('contrib')).reduce((a, c) => a + Math.round(Number(c.amount) * 100), 0) / 100;

      const gLucroLiquido = gReceita - (gPis + gCofins + gIofMensal) - (gIr + gCsll) - (gCustosFixos + gCustosVariaveis);

      const gRentabilidade = gTotalOperado > 0 ? (gLucroLiquido / gTotalOperado) * 100 : 0;

      return {
        month: new Date(group.rawDate).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }),
        totalOperado: gTotalOperado,
        lucroLiquido: gLucroLiquido,
        rentabilidade: gRentabilidade
      }
    });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "2.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>DASHBOARD GERAL</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.25rem" }}>{displayTitle}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <MonthFilter />
          <Link href="/operacoes" className="btn-primary" style={{ height: "2.5rem", padding: "0 1.25rem", display: "flex", alignItems: "center", fontSize: "0.8125rem", fontWeight: 700 }}>NOVA OPERAÇÃO</Link>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5rem" }}>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Total Operado</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(totalOperado)}</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Receita Bruta</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(receitaBruta)}</div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Lucro Líquido</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: lucroLiquido >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>
              {formatCurrency(lucroLiquido)}
            </div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem" }}>
              RENTABILIDADE: {formatPercent(rentabilidade)}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Custos Totais</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(custosFixos + custosVariaveis + investidoresTotal)}</div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem" }}>
              EFICIÊNCIA: {formatPercent(100 - custoReceitaPercent)}
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>DESEMPENHO HISTÓRICO</h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>Evolução mensal de volumes e margens institucionais</p>
          </div>
          <DashboardCharts data={chartData} />
        </div>

        {/* Secondary Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
          {/* Result Structure */}
          <div className="glass-panel" style={{ padding: "2rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem", textTransform: "uppercase" }}>Estrutura DRE</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { label: "Receita Operacional", value: receitaBruta, color: "var(--text-primary)" },
                { label: "Custos Fixos", value: -custosFixos, color: "var(--accent-red)" },
                { label: "Custos Variáveis", value: -custosVariaveis, color: "var(--accent-red)" },
                { label: "IOF Retido", value: -iofTotal, color: "var(--accent-red)" },
                { label: "Impostos", value: -impostosRegistrados, color: "var(--accent-red)" },
                { label: "Investidores", value: -investidoresTotal, color: "var(--accent-red)" },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.75rem" }}>
                  <span style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: item.color }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem" }}>
                <span style={{ fontWeight: 800, fontSize: "0.875rem", color: "var(--accent-primary)" }}>LUCRO LÍQUIDO</span>
                <span style={{ fontWeight: 800, fontSize: "0.875rem", color: lucroLiquido >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>{formatCurrency(lucroLiquido)}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>Últimas Operações</h2>
              <Link href="/operacoes" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)" }}>VER TODAS</Link>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>Data</th>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>Cliente</th>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Valor Bruto</th>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Valor Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {[...operations].reverse().slice(0, 8).map(op => (
                    <tr key={op.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "0.875rem 0", color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>{new Date(op.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}</td>
                      <td style={{ padding: "0.875rem 0", fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-primary)" }}>{op.client.name}</td>
                      <td style={{ padding: "0.875rem 0", textAlign: "right", fontSize: "0.8125rem" }}>{formatCurrency(op.valorBruto)}</td>
                      <td style={{ padding: "0.875rem 0", textAlign: "right", fontWeight: 700, color: "var(--accent-primary)", fontSize: "0.8125rem" }}>{formatCurrency(op.valorLiquido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {operations.length === 0 && (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>Sem operações registradas no período.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

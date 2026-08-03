import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import MonthFilter from "@/components/MonthFilter";
import { cookies } from "next/headers";
import DashboardCharts from "@/components/DashboardCharts";

export default async function Home({ searchParams }: { searchParams: Promise<{ month?: string | string[], startDate?: string | string[], endDate?: string | string[], scenario?: string | string[] }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if ((session?.user as any)?.role === "INVESTOR") {
    redirect("/investidores");
  }

  if ((session?.user as any)?.role === "CONTADOR") {
    redirect("/custos");
  }

  if ((session?.user as any)?.role === "COMERCIAL") {
    redirect("/clientes");
  }

  // Definindo o período selecionado
  let dateFilter: any = {};
  let displayTitle = "";

  const resolvedParams = await searchParams;
  let monthParam = typeof resolvedParams?.month === 'string' ? resolvedParams.month : Array.isArray(resolvedParams?.month) ? resolvedParams.month[0] : null;
  let startDateParam = typeof resolvedParams?.startDate === 'string' ? resolvedParams.startDate : Array.isArray(resolvedParams?.startDate) ? resolvedParams.startDate[0] : null;
  let endDateParam = typeof resolvedParams?.endDate === 'string' ? resolvedParams.endDate : Array.isArray(resolvedParams?.endDate) ? resolvedParams.endDate[0] : null;

  const cookieStore = await cookies();
  if (!monthParam) {
    monthParam = cookieStore.get("selectedMonth")?.value || "all"; // Default de "all"
  }

  if (monthParam === "custom") {
    if (!startDateParam) {
      startDateParam = cookieStore.get("startDate")?.value || "2026-01-01";
    }
    if (!endDateParam) {
      endDateParam = cookieStore.get("endDate")?.value || "2026-12-31";
    }
    const startCustom = new Date(startDateParam + "T00:00:00.000Z");
    const endCustom = new Date(endDateParam + "T23:59:59.999Z");
    dateFilter = { gte: startCustom, lte: endCustom };
    
    const formatDatePt = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    };
    displayTitle = `Período: ${formatDatePt(startDateParam)} até ${formatDatePt(endDateParam)}`;
  } else if (monthParam === "all") {
    const startOfYear = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));
    dateFilter = { gte: startOfYear, lte: endOfYear };
    displayTitle = "Resumo Geral 2026";
  } else {
    const [year, month] = monthParam.split("-");
    const y = Number(year);
    const m = Number(month) - 1;
    const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
    endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
    dateFilter = { gte: startOfMonth, lte: endOfMonth };
    displayTitle = `Resumo Mensal - ${startOfMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}`;
  }

  const isComercial = (session?.user as any)?.role === "COMERCIAL";

  // Busca operações do período selecionado
  const operations = await prisma.operation.findMany({
    where: { 
      date: dateFilter,
      ...(isComercial ? { client: { representativeId: (session.user as any).id } } : {})
    },
    include: { client: true },
    orderBy: { date: "asc" }
  });

  // Busca custos do período selecionado
  const costs = await prisma.cost.findMany({
    where: { date: dateFilter }
  });

  // Busca todas as operações e custos para cálculos históricos e fallbacks
  const allOperations = await prisma.operation.findMany({ include: { client: true }, orderBy: { date: 'asc' } });
  const allCosts = await prisma.cost.findMany();

  const scenario = typeof resolvedParams?.scenario === 'string' ? resolvedParams.scenario : Array.isArray(resolvedParams?.scenario) ? resolvedParams?.scenario[0] : "conservador";

  // Busca operações realizadas no dia de hoje (UTC)
  const todayDate = new Date();
  const startOfToday = new Date(Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59, 999));

  const todayOperations = await prisma.operation.findMany({
    where: {
      date: {
        gte: startOfToday,
        lte: endOfToday
      }
    }
  });

  const todayCount = todayOperations.length;
  const todayGross = todayOperations.reduce((acc, op) => acc + Math.round((Number(op.valorBruto) || 0) * 100), 0) / 100;
  const todayNet = todayOperations.reduce((acc, op) => acc + Math.round((Number(op.valorLiquido) || 0) * 100), 0) / 100;

  // Rendimento (yield) das operações de hoje
  const todayYield = todayOperations.reduce((acc, op) => acc + Math.round((
    (Number(op.fator) || 0) +
    (Number(op.tarifas) || 0) +
    (Number(op.adValorem) || 0)
  ) * 100), 0) / 100;

  const todayIof = todayOperations.reduce((acc, op) => acc + Math.round((
    (Number(op.iof) || 0) +
    (Number(op.iofAdicional) || 0)
  ) * 100), 0) / 100;

  const todayRevenue = todayYield + todayIof; // Receita Bruta de hoje

  // ---- FUNÇÃO DE SOMA SEGURA ----
  const safeSumOperations = (key: keyof typeof operations[0]) => {
    return operations.reduce((acc, op) => acc + Math.round((Number(op[key]) || 0) * 100), 0) / 100;
  };

  const safeSumList = (list: any[]) => {
    return list.reduce((acc, item) => acc + Math.round((Number(item.amount) || 0) * 100), 0) / 100;
  };

  // ---- CALCULA DASHBOARD ----
  const totalOperado = safeSumOperations("valorBruto");
  const iofTotal = safeSumOperations("iof") + safeSumOperations("iofAdicional");

  // Receita Operacional = Soma do que a Factoring efetivamente ganha (Fator + Tarifas + AdValorem)
  const receitaOperacional = (Math.round((
    safeSumOperations("fator") +
    safeSumOperations("tarifas") +
    safeSumOperations("adValorem")
  ) * 100)) / 100;

  // Receita Bruta = Total cobrado do cliente (Receita Operacional + IOF)
  const receitaBruta = (Math.round((receitaOperacional + iofTotal) * 100)) / 100;

  // Custos Totais = Soma de tudo o que foi lançado na aba de Custos (manual)
  const custoTotalManual = safeSumList(costs);

  // Custos Totais Dashboard = Custos Manuais + IOF (conforme solicitado, o IOF entra como receita e sai como custo)
  const custoTotalDashboard = (Math.round((custoTotalManual + iofTotal) * 100)) / 100;

  // Lucro Líquido = Receita Bruta - Custos Manuais (conforme solicitado: Receita - Custos)
  const lucroLiquido = receitaBruta - custoTotalManual;

  const rentabilidade = totalOperado > 0 ? (lucroLiquido / totalOperado) * 100 : 0;
  const custoReceitaPercent = receitaBruta > 0 ? (custoTotalManual / receitaBruta) * 100 : 0;

  // Separação apenas para exibição na lista detalhada
  const custosFixos = safeSumList(costs.filter(c => c.category === "FIXO"));
  const custosVariaveis = safeSumList(costs.filter(c => c.category === "VARIAVEL"));
  const impostosRegistrados = safeSumList(costs.filter(c => c.category === "IMPOSTO"));
  const investidoresTotal = safeSumList(costs.filter(c => c.category === "INVESTIDORES"));
  // iofTotal já definido acima


  const valorDeclarado = operations.filter(op => op.declarada).reduce((acc, op) => acc + Math.round((Number(op.valorBruto) || 0) * 100), 0) / 100;
  const valorNaoDeclarado = operations.filter(op => !op.declarada).reduce((acc, op) => acc + Math.round((Number(op.valorBruto) || 0) * 100), 0) / 100;
  const percentualDeclarado = totalOperado > 0 ? (valorDeclarado / totalOperado) * 100 : 0;
  const percentualNaoDeclarado = totalOperado > 0 ? (valorNaoDeclarado / totalOperado) * 100 : 0;

  // ---- CALCULO DO PONTO DE EQUILÍBRIO (BREAK-EVEN) ----
  // Rentabilidade operacional (taxa de faturamento bruto sobre volume de operações)
  let taxaRetorno = totalOperado > 0 ? (receitaBruta / totalOperado) * 100 : 0;

  // Fallback se não houver operações no período selecionado (ex: início de mês sem operações registradas)
  if (taxaRetorno === 0 && allOperations.length > 0) {
    const totalOperadoAll = allOperations.reduce((acc, op) => acc + Math.round((Number(op.valorBruto) || 0) * 100), 0) / 100;
    if (totalOperadoAll > 0) {
      const yieldTotalAll = allOperations.reduce((acc, op) => acc + Math.round((
        (Number(op.fator) || 0) +
        (Number(op.tarifas) || 0) +
        (Number(op.adValorem) || 0)
      ) * 100), 0) / 100;
      const iofTotalAll = allOperations.reduce((acc, op) => acc + Math.round((
        (Number(op.iof) || 0) +
        (Number(op.iofAdicional) || 0)
      ) * 100), 0) / 100;
      const receitaBrutaAll = yieldTotalAll + iofTotalAll;
      taxaRetorno = (receitaBrutaAll / totalOperadoAll) * 100;
    }
  }

  // Se ainda assim for 0 (sem nenhuma operação no banco), usa fallback de 15%
  if (taxaRetorno === 0) {
    taxaRetorno = 15;
  }

  // Volume total necessário para igualar os custos manuais
  const volumeNecessarioTotal = taxaRetorno > 0 ? (custoTotalManual / (taxaRetorno / 100)) : 0;

  // Dias úteis e corridos do período selecionado (totais, decorridos e restantes)
  let calendarDays = 30;
  let businessDays = 22;
  let businessDaysElapsed = 22;
  let businessDaysRemaining = 0; // Se for passado, assume 0 (dividiremos pelo total)

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  if (monthParam === "custom") {
    const startCustom = new Date((startDateParam || "2026-01-01") + "T00:00:00.000Z");
    const endCustom = new Date((endDateParam || "2026-12-31") + "T23:59:59.999Z");
    
    const diffTime = Math.abs(endCustom.getTime() - startCustom.getTime());
    calendarDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    let countTotal = 0;
    let countElapsed = 0;
    let countRemaining = 0;
    
    let curDate = new Date(startCustom.getTime());
    while (curDate <= endCustom) {
      const dayOfWeek = curDate.getUTCDay();
      const isBusinessDay = dayOfWeek !== 0 && dayOfWeek !== 6;
      
      if (isBusinessDay) {
        countTotal++;
        
        const curDateOnly = new Date(Date.UTC(curDate.getUTCFullYear(), curDate.getUTCMonth(), curDate.getUTCDate()));
        if (curDateOnly <= todayUTC) {
          countElapsed++;
        } else {
          countRemaining++;
        }
      }
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }
    
    businessDays = countTotal;
    businessDaysElapsed = countElapsed;
    businessDaysRemaining = countRemaining;
  } else if (monthParam && monthParam !== "all") {
    const [year, month] = monthParam.split("-");
    const y = Number(year);
    const m = Number(month);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0));
    calendarDays = endOfMonth.getUTCDate();

    // Calcula dias úteis totais (Segunda a Sexta)
    let count = 0;
    let curDate = new Date(startOfMonth.getTime());
    while (curDate <= endOfMonth) {
      const dayOfWeek = curDate.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Domingo, 6 = Sábado
        count++;
      }
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }
    businessDays = count;

    // Se for o mês atual:
    if (y === currentYear && m === currentMonth) {
      // Decorridos: até ontem/hoje
      const endOfToday = new Date(Date.UTC(y, m - 1, currentDay));
      let countElapsed = 0;
      let curDateElapsed = new Date(startOfMonth.getTime());
      while (curDateElapsed <= endOfToday) {
        const dayOfWeek = curDateElapsed.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          countElapsed++;
        }
        curDateElapsed.setUTCDate(curDateElapsed.getUTCDate() + 1);
      }
      businessDaysElapsed = countElapsed > 0 ? countElapsed : 1;

      // Restantes: a partir de hoje (inclusive) até o final do mês
      const startOfToday = new Date(Date.UTC(y, m - 1, currentDay));
      let countRemaining = 0;
      let curDateRemaining = new Date(startOfToday.getTime());
      while (curDateRemaining <= endOfMonth) {
        const dayOfWeek = curDateRemaining.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          countRemaining++;
        }
        curDateRemaining.setUTCDate(curDateRemaining.getUTCDate() + 1);
      }
      businessDaysRemaining = countRemaining > 0 ? countRemaining : 1;
    } else if (new Date(Date.UTC(y, m - 1, 1)) > today) {
      // Mês futuro
      businessDaysElapsed = 0;
      businessDaysRemaining = businessDays;
    } else {
      // Mês passado
      businessDaysElapsed = businessDays;
      businessDaysRemaining = 0;
    }
  } else {
    // Para o ano inteiro de 2026
    calendarDays = 365;
    const startOfYear = new Date(Date.UTC(2026, 0, 1));
    const endOfYear = new Date(Date.UTC(2026, 11, 31));
    let count = 0;
    let curDate = new Date(startOfYear.getTime());
    while (curDate <= endOfYear) {
      const dayOfWeek = curDate.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }
    businessDays = count;

    if (currentYear === 2026) {
      const endOfToday = new Date(Date.UTC(2026, today.getMonth(), currentDay));
      let countElapsed = 0;
      let curDateElapsed = new Date(startOfYear.getTime());
      while (curDateElapsed <= endOfToday) {
        const dayOfWeek = curDateElapsed.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          countElapsed++;
        }
        curDateElapsed.setUTCDate(curDateElapsed.getUTCDate() + 1);
      }
      businessDaysElapsed = countElapsed > 0 ? countElapsed : 1;

      const startOfToday = new Date(Date.UTC(2026, today.getMonth(), currentDay));
      let countRemaining = 0;
      let curDateRemaining = new Date(startOfToday.getTime());
      while (curDateRemaining <= endOfYear) {
        const dayOfWeek = curDateRemaining.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          countRemaining++;
        }
        curDateRemaining.setUTCDate(curDateRemaining.getUTCDate() + 1);
      }
      businessDaysRemaining = countRemaining > 0 ? countRemaining : 1;
    } else if (currentYear < 2026) {
      businessDaysElapsed = 0;
      businessDaysRemaining = businessDays;
    } else {
      businessDaysElapsed = businessDays;
      businessDaysRemaining = 0;
    }
  }

  // Define se o período selecionado é o período ativo (mês/ano atual)
  let isActivePeriod = false;
  if (monthParam === "custom") {
    const startCustom = new Date((startDateParam || "2026-01-01") + "T00:00:00.000Z");
    const endCustom = new Date((endDateParam || "2026-12-31") + "T23:59:59.999Z");
    if (todayUTC >= startCustom && todayUTC <= endCustom) {
      isActivePeriod = true;
    }
  } else if (monthParam && monthParam !== "all") {
    const [year, month] = monthParam.split("-");
    if (Number(year) === currentYear && Number(month) === currentMonth) {
      isActivePeriod = true;
    }
  } else if (!monthParam || monthParam === "all") {
    if (currentYear === 2026) {
      isActivePeriod = true;
    }
  }

  // Divisores baseados em se restam dias ou não
  const divisorDiasUteis = businessDaysRemaining > 0 ? businessDaysRemaining : (businessDays > 0 ? businessDays : 1);

  // Se o período estiver ativo (hoje faz parte dele), calculamos com base no custo/volume restante
  const custoRestante = isActivePeriod ? Math.max(0, custoTotalManual - receitaBruta) : custoTotalManual;
  const volumeRestante = isActivePeriod ? Math.max(0, volumeNecessarioTotal - totalOperado) : volumeNecessarioTotal;

  const metaDiariaUteis = volumeRestante / divisorDiasUteis;
  const metaDiariaCalendario = calendarDays > 0 ? volumeRestante / calendarDays : 0;
  const custoDiarioUteis = custoRestante / divisorDiasUteis;

  // ==========================================
  // DADOS PARA O GRÁFICO (MÊS A MÊS) - UNIFICADO
  // ==========================================

  const groupedByMonth: Record<string, { month: string; rawDate: Date; ops: any[]; costs: any[] }> = {};

  [...operations, ...costs].forEach(item => {
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
      const gTotalOperado = group.ops.reduce((acc, o) => acc + Math.round(Number(o.valorBruto || 0) * 100), 0) / 100;
      const gReceita = group.ops.reduce((acc, o) => acc + Math.round((
        Number(o.fator) + Number(o.tarifas) + Number(o.adValorem) + Number(o.iof) + Number(o.iofAdicional)
      ) * 100), 0) / 100;

      const gCusto = group.costs.reduce((acc, c) => acc + Math.round(Number(c.amount || 0) * 100), 0) / 100;

      const gLucroLiquido = gReceita - gCusto;
      const gRentabilidade = gTotalOperado > 0 ? (gLucroLiquido / gTotalOperado) * 100 : 0;

      return {
        month: new Date(group.rawDate).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }),
        totalOperado: gTotalOperado,
        lucroLiquido: gLucroLiquido,
        rentabilidade: gRentabilidade
      }
    });

  // Calcula rentabilidades médias
  const totalOperadoHistorico = chartData.reduce((sum, item) => sum + item.totalOperado, 0);
  const totalLucroHistorico = chartData.reduce((sum, item) => sum + item.lucroLiquido, 0);
  const rentabilidadeMediaHistorica = totalOperadoHistorico > 0 ? (totalLucroHistorico / totalOperadoHistorico) * 100 : 0;
  
  const mesesComOperacao = chartData.filter(item => item.totalOperado > 0);
  const rentabilidadeMediaMensal = mesesComOperacao.length > 0
    ? mesesComOperacao.reduce((sum, item) => sum + item.rentabilidade, 0) / mesesComOperacao.length
    : 0;

  // ==========================================
  // MODELAGEM PREDITIVA E RANKINGS DE CEDENTES (2026)
  // ==========================================
  const operations2026 = allOperations.filter(o => {
    const yr = new Date(o.date).getUTCFullYear();
    return yr === 2026;
  });
  const costs2026 = allCosts.filter(c => {
    const yr = new Date(c.date).getUTCFullYear();
    return yr === 2026;
  });

  const nowTime = new Date();
  const currentMonthIdx = nowTime.getUTCFullYear() === 2026 ? nowTime.getUTCMonth() : 7;

  const completedMonths: any[] = [];
  for (let m = 0; m < currentMonthIdx; m++) {
    const opsInMonth = operations2026.filter(o => new Date(o.date).getUTCMonth() === m);
    const costsInMonth = costs2026.filter(c => new Date(c.date).getUTCMonth() === m);

    const totalOperado = opsInMonth.reduce((sum, o) => sum + o.valorBruto, 0);
    const receita = opsInMonth.reduce((sum, o) => sum + (o.fator + o.tarifas + o.adValorem + (o.iof || 0) + (o.iofAdicional || 0)), 0);
    const custo = costsInMonth.reduce((sum, c) => sum + c.amount, 0);
    const lucroLiquido = receita - custo;

    completedMonths.push({ m, totalOperado, receita, custo, lucroLiquido });
  }

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

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const fullYearProjections = [];

  for (let m = 0; m < 12; m++) {
    const isProjected = m >= currentMonthIdx;
    if (isProjected) {
      const p = projectedMonths.find(x => x.m === m);
      fullYearProjections.push({
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
      fullYearProjections.push({
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

  const totalVolumeAnoProj = fullYearProjections.reduce((sum, x) => sum + x.totalOperado, 0);
  const totalReceitaAnoProj = fullYearProjections.reduce((sum, x) => sum + x.receita, 0);
  const totalLucroAnoProj = fullYearProjections.reduce((sum, x) => sum + x.lucroLiquido, 0);
  const rentabilidadeMediaAnoProj = totalVolumeAnoProj > 0 ? (totalLucroAnoProj / totalVolumeAnoProj) * 100 : 0;

  const totalVolumeRealizadoProj = completedMonths.reduce((sum, x) => sum + x.totalOperado, 0);
  const totalLucroRealizadoProj = completedMonths.reduce((sum, x) => sum + x.lucroLiquido, 0);

  // Rankings de Cedentes baseados em operações de 2026
  const clientPerformanceMap: Record<string, {
    id: string;
    name: string;
    totalVolume: number;
    totalRevenue: number;
    totalTarifas: number;
    numOps: number;
  }> = {};

  operations2026.forEach(o => {
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

  const revenueRanking = [...clientPerformanceList].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const tarifasRanking = [...clientPerformanceList].sort((a, b) => b.totalTarifas - a.totalTarifas);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  return (
    <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="responsive-header-flex">
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.5rem" }}>DASHBOARD GERAL</h1>
          <p style={{ color: "var(--text-secondary)" }}>{displayTitle}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <MonthFilter />
          <Link href="/operacoes" className="btn-primary" style={{ height: "2.5rem", padding: "0 1.25rem", display: "flex", alignItems: "center", fontSize: "0.8125rem", fontWeight: 700 }}>NOVA OPERAÇÃO</Link>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5rem" }}>

        {/* KPI Grid */}
        <div className="layout-grid">
          <div className="glass-panel">
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Total Operado</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(totalOperado)}</div>
          </div>

          <div className="glass-panel">
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Receita Bruta</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(receitaBruta)}</div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem", display: "flex", justifyContent: "space-between" }}>
              <span>IOF: {formatCurrency(iofTotal)}</span>
              <span>RENT.: {formatPercent(totalOperado > 0 ? (receitaBruta / totalOperado) * 100 : 0)}</span>
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Lucro Líquido</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: lucroLiquido >= 0 ? "var(--accent-primary)" : "var(--accent-red)" }}>{formatCurrency(lucroLiquido)}</div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem" }}>
              RENT. LÍQUIDA: {formatPercent(rentabilidade)}
            </div>
          </div>

          {!isComercial && (
            <div className="glass-panel">
              <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Custos Totais</h3>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(custoTotalManual)}</div>
            </div>
          )}

          {!isComercial && (
            <div className="glass-panel">
              <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Líquido Diário (Meta)</h3>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-orange)" }}>{formatCurrency(custoDiarioUteis)}</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem", display: "flex", justifyContent: "space-between" }}>
                <span>META DE RECEITA DIÁRIA</span>
                <span>
                  {businessDaysRemaining > 0 && businessDaysRemaining !== businessDays
                    ? `RESTAM: ${businessDaysRemaining}d úteis`
                    : `TOTAL: ${businessDays}d úteis`}
                </span>
              </div>
            </div>
          )}

          {!isComercial && (
            <div className="glass-panel">
              <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Meta Diária (0 a 0)</h3>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-orange)" }}>{taxaRetorno > 0 ? formatCurrency(metaDiariaUteis) : "R$ 0,00"}</div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem", display: "flex", justifyContent: "space-between" }}>
                <span>
                  {businessDaysRemaining > 0 && businessDaysRemaining !== businessDays
                    ? `RESTAM: ${businessDaysRemaining}d úteis`
                    : `DIAS ÚTEIS: ${businessDays}d`}
                </span>
                <span>META MÊS: {taxaRetorno > 0 ? formatCurrency(volumeNecessarioTotal) : "R$ 0,00"}</span>
              </div>
            </div>
          )}

          <div className="glass-panel">
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Operações de Hoje</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{todayCount} {todayCount === 1 ? 'Operação' : 'Operações'}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Bruto:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(todayGross)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Líquido:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(todayNet)}</span>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", margin: "0.5rem 0", paddingTop: "0.5rem" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Volume vs Meta (0 a 0):</span>
                <span style={{ fontWeight: 600, color: todayGross >= metaDiariaUteis ? "var(--accent-primary)" : "var(--accent-orange)" }}>
                  {todayGross >= metaDiariaUteis ? "Batida!" : formatCurrency(metaDiariaUteis - todayGross)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                <span>Progresso Volume:</span>
                <span>{metaDiariaUteis > 0 ? ((todayGross / metaDiariaUteis) * 100).toFixed(2) : "0.00"}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
                <span>Receita vs Meta:</span>
                <span style={{ fontWeight: 600, color: todayRevenue >= custoDiarioUteis ? "var(--accent-primary)" : "var(--accent-orange)" }}>
                  {todayRevenue >= custoDiarioUteis ? "Batida!" : formatCurrency(custoDiarioUteis - todayRevenue)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                <span>Rendimento / Meta:</span>
                <span>{custoDiarioUteis > 0 ? ((todayRevenue / custoDiarioUteis) * 100).toFixed(2) : "0.00"}%</span>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Volume Declarado</h3>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-primary)" }}>{formatCurrency(valorDeclarado)}</div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem" }}>
                DECLARADO: {formatPercent(percentualDeclarado)}
            </div>
          </div>
        </div>


        {/* Chart Section */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem", marginBottom: "2rem" }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>DESEMPENHO HISTÓRICO</h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>Evolução mensal de volumes e margens institucionais</p>
            </div>
            
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div className="glass-card" style={{ padding: "0.5rem 1rem", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xs)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Rentabilidade Média Geral</div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: rentabilidadeMediaHistorica >= 0 ? "var(--accent-primary)" : "var(--accent-red)", marginTop: "0.125rem" }}>
                  {rentabilidadeMediaHistorica.toFixed(2)}%
                </div>
              </div>
              <div className="glass-card" style={{ padding: "0.5rem 1rem", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xs)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Rentabilidade Média Mensal</div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: rentabilidadeMediaMensal >= 0 ? "var(--accent-primary)" : "var(--accent-red)", marginTop: "0.125rem" }}>
                  {rentabilidadeMediaMensal.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
          <DashboardCharts data={chartData} />
        </div>

        {/* Secondary Grid */}
        <div className="responsive-grid-1-2">
          {/* Result Structure */}
          {!isComercial && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem", textTransform: "uppercase" }}>Estrutura DRE</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { label: "Receita Bruta", value: receitaBruta, color: "var(--text-primary)" },
                  { label: "Custos Fixos", value: -custosFixos, color: "var(--accent-red)" },
                  { label: "Custos Variáveis", value: -custosVariaveis, color: "var(--accent-red)" },
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
          )}

          {/* Table */}
          <div style={{ padding: "2rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>Últimas Operações</h2>
              <Link href="/operacoes" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)" }}>VER TODAS</Link>
            </div>

            <div className="desktop-only" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>Data</th>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "left" }}>Cedente</th>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Valor Bruto</th>
                    <th style={{ padding: "0.75rem 0", color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Valor Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {[...operations].reverse().slice(0, 8).map(op => (
                    <tr key={op.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "0.875rem 0", color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>{new Date(op.date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</td>
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

            {/* Mobile View for Últimas Operações */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[...operations].reverse().slice(0, 8).map(op => (
                <div key={`mob-${op.id}`} className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Cedente: {op.client.name}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data: {new Date(op.date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Bruto: {formatCurrency(op.valorBruto)}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--accent-primary)", fontWeight: 600 }}>Líquido: {formatCurrency(op.valorLiquido)}</span>
                  </div>
                </div>
              ))}
              {operations.length === 0 && (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>Sem operações registradas no período.</div>
              )}
            </div>
          </div>
        </div>

        {/* Projections & Client Rankings Section */}
        <div style={{ padding: "2rem 0", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
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
                  { id: "conservador", label: "Conservador" },
                  { id: "moderado", label: "Moderado (+5%)" },
                  { id: "otimista", label: "Otimista (+10%)" }
                ].map(s => {
                  const isSelected = scenario === s.id;
                  const currentMonthQuery = monthParam ? `month=${monthParam}` : "";
                  const startDateQuery = startDateParam ? `&startDate=${startDateParam}` : "";
                  const endDateQuery = endDateParam ? `&endDate=${endDateParam}` : "";
                  return (
                    <Link
                      key={s.id}
                      href={`/?scenario=${s.id}${currentMonthQuery ? `&${currentMonthQuery}` : ""}${startDateQuery}${endDateQuery}`}
                      style={{
                        padding: "0.4rem 0.8rem",
                        borderRadius: "var(--radius-xs)",
                        fontSize: "0.6875rem",
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

            {/* Projections tables (Stacked for Full Width) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3.5rem" }}>
              
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

              {/* Client Performance rankings (Side-by-Side under the table) */}
              <div className="responsive-grid-1-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem" }}>
                
                {/* Ranking 1 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>Melhores Cedentes (Rentabilidade / Receita)</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", width: "40px" }}>Pos</th>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem" }}>Cedente</th>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Volume</th>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Receita</th>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Rentab %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueRanking.slice(0, 5).map((client, idx) => (
                          <tr key={client.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.02)" }}>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", fontWeight: 800, color: "var(--text-tertiary)" }}>{idx + 1}º</td>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", fontWeight: 700 }}>{client.name}</td>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right" }}>{formatCurrency(client.totalVolume)}</td>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right", fontWeight: 700, color: "var(--accent-primary)" }}>{formatCurrency(client.totalRevenue)}</td>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right" }}>{formatPercent(client.rentabilidadePercent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ranking 2 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" }}>Melhores Cedentes (Tarifas Flat Arrecadadas)</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", width: "40px" }}>Pos</th>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem" }}>Cedente</th>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Nº Ops</th>
                          <th style={{ padding: "0.5rem 0", fontSize: "0.6875rem", textAlign: "right" }}>Total Tarifas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tarifasRanking.slice(0, 5).map((client, idx) => (
                          <tr key={client.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.02)" }}>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", fontWeight: 800, color: "var(--text-tertiary)" }}>{idx + 1}º</td>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", fontWeight: 700 }}>{client.name}</td>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right" }}>{client.numOps} ops</td>
                            <td style={{ padding: "0.75rem 0", fontSize: "0.8125rem", textAlign: "right", fontWeight: 700, color: "var(--accent-secondary)" }}>{formatCurrency(client.totalTarifas)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>

          </div>
      </main>
    </div>
  );
}

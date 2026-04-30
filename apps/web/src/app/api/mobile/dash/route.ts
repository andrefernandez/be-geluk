import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month') || 'all';

    let dateFilter: any = {};

    if (monthParam === "all") {
      const startOfYear = new Date(2026, 0, 1);
      const endOfYear = new Date(2026, 11, 31, 23, 59, 59);
      dateFilter = { gte: startOfYear, lte: endOfYear };
    } else {
      const [year, month] = monthParam.split("-");
      const now = new Date(Number(year), Number(month) - 1, 15);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter = { gte: startOfMonth, lte: endOfMonth };
    }

    const operations = await prisma.operation.findMany({
      where: { date: dateFilter },
      include: { client: true },
      orderBy: { date: "asc" },
    });

    const costs = await prisma.cost.findMany({
      where: { date: dateFilter },
    });

    // Funções auxiliares
    const safeSumOperations = (ops: any[], key: string) => {
      return ops.reduce((acc, op) => acc + Math.round((Number(op[key]) || 0) * 100), 0) / 100;
    };

    const safeSumList = (list: any[]) => {
      return list.reduce((acc, item) => acc + Math.round((Number(item.amount) || 0) * 100), 0) / 100;
    };

    const calculateMetrics = (ops: any[], csts: any[]) => {
      const totalOperado = safeSumOperations(ops, "valorBruto");
      const iofTotal = safeSumOperations(ops, "iof") + safeSumOperations(ops, "iofAdicional");

      const receitaOperacional = (Math.round((
        safeSumOperations(ops, "fator") +
        safeSumOperations(ops, "tarifas") +
        safeSumOperations(ops, "adValorem")
      ) * 100)) / 100;

      const receitaBruta = (Math.round((receitaOperacional + iofTotal) * 100)) / 100;
      const custoTotal = safeSumList(csts);
      const lucroLiquido = receitaBruta - custoTotal;
      
      const rentabilidadeBruta = totalOperado > 0 ? (receitaBruta / totalOperado) * 100 : 0;
      const rentabilidadeLiquida = totalOperado > 0 ? (lucroLiquido / totalOperado) * 100 : 0;

      const valorDeclarado = ops.filter(op => op.declarada).reduce((acc, op) => acc + Math.round((Number(op.valorBruto) || 0) * 100), 0) / 100;
      const percentualDeclarado = totalOperado > 0 ? (valorDeclarado / totalOperado) * 100 : 0;

      return {
        totalOperado,
        receitaBruta,
        iofTotal,
        lucroLiquido,
        custos: custoTotal,
        rentabilidadeBruta,
        rentabilidadeLiquida,
        percentualDeclarado
      };
    };

    const mainMetrics = calculateMetrics(operations, costs);

    // Gerar Histórico dos últimos 6 meses (para o gráfico)
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); // Usando a data atual como base para os últimos 6 meses
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthOps = await prisma.operation.findMany({
        where: { date: { gte: start, lte: end } }
      });
      const monthCosts = await prisma.cost.findMany({
        where: { date: { gte: start, lte: end } }
      });

      const metrics = calculateMetrics(monthOps, monthCosts);
      const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      history.push({
        label: shortMonths[start.getMonth()],
        value: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        totalOperado: metrics.totalOperado,
        lucroLiquido: metrics.lucroLiquido,
        rentabilidade: metrics.rentabilidadeLiquida
      });
    }

    return NextResponse.json({
      ...mainMetrics,
      history
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Erro ao buscar dashboard" }, { status: 500 });
  }
}

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
    const safeSumOperations = (key: keyof typeof operations[0]) => {
      return operations.reduce((acc, op) => acc + Math.round((Number(op[key as keyof typeof op]) || 0) * 100), 0) / 100;
    };

    const safeSumList = (list: any[]) => {
      return list.reduce((acc, item) => acc + Math.round((Number(item.amount) || 0) * 100), 0) / 100;
    };

    const totalOperado = safeSumOperations("valorBruto");
    const iofTotal = safeSumOperations("iof") + safeSumOperations("iofAdicional");

    const receitaOperacional = (Math.round((
      safeSumOperations("fator") +
      safeSumOperations("tarifas") +
      safeSumOperations("adValorem")
    ) * 100)) / 100;

    const receitaBruta = (Math.round((receitaOperacional + iofTotal) * 100)) / 100;
    const custoTotalManual = safeSumList(costs);
    const lucroLiquido = receitaBruta - custoTotalManual;
    const rentabilidade = totalOperado > 0 ? (lucroLiquido / totalOperado) * 100 : 0;

    const valorDeclarado = operations.filter(op => op.declarada).reduce((acc, op) => acc + Math.round((Number(op.valorBruto) || 0) * 100), 0) / 100;
    const percentualDeclarado = totalOperado > 0 ? (valorDeclarado / totalOperado) * 100 : 0;

    return NextResponse.json({
      totalOperado,
      receitaBruta,
      lucroLiquido,
      rentabilidade,
      percentualDeclarado,
      custos: custoTotalManual,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Erro ao buscar dashboard" }, { status: 500 });
  }
}

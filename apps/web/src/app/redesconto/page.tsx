import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import MonthFilter from "@/components/MonthFilter";
import { cookies } from "next/headers";
import RedescontoView from "./RedescontoView";

export default async function RedescontoPage({
    searchParams
}: {
    searchParams: Promise<{ month?: string | string[]; startDate?: string | string[]; endDate?: string | string[] }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if ((session?.user as any)?.role === "COMERCIAL") {
        redirect("/clientes");
    }

    let now = new Date();
    const resolvedParams = await searchParams;
    let monthParam = typeof resolvedParams?.month === "string" ? resolvedParams.month : Array.isArray(resolvedParams?.month) ? resolvedParams.month[0] : null;
    let startDateParam = typeof resolvedParams?.startDate === "string" ? resolvedParams.startDate : Array.isArray(resolvedParams?.startDate) ? resolvedParams.startDate[0] : null;
    let endDateParam = typeof resolvedParams?.endDate === "string" ? resolvedParams.endDate : Array.isArray(resolvedParams?.endDate) ? resolvedParams.endDate[0] : null;

    const cookieStore = await cookies();
    if (!monthParam) {
        monthParam = cookieStore.get("selectedMonth")?.value || null;
    }

    let dateFilter: any = {};

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
    } else if (monthParam === "all") {
        const startOfYear = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));
        dateFilter = { gte: startOfYear, lte: endOfYear };
    } else if (monthParam && monthParam.includes("-")) {
        const [year, month] = monthParam.split("-");
        const y = Number(year);
        const m = Number(month) - 1;
        const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
        endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
        dateFilter = { gte: startOfMonth, lte: endOfMonth };
    } else {
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
        endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
        dateFilter = { gte: startOfMonth, lte: endOfMonth };
    }

    // 1. Buscar todos os parceiros
    const partners = await prisma.partner.findMany({
        orderBy: { name: "asc" }
    });

    // 2. Buscar operações com re-desconto no período selecionado
    const operations = await prisma.operation.findMany({
        where: {
            isRedesconto: true,
            date: dateFilter
        },
        include: {
            client: true,
            partner: true,
            sacados: true
        },
        orderBy: { date: "desc" }
    });

    // 3. Buscar todas as operações de re-desconto em aberto (paga === false) para calcular o limite tomado atual
    const openRediscountOps = await prisma.operation.findMany({
        where: {
            isRedesconto: true,
            paga: false,
            active: true
        },
        select: {
            partnerId: true,
            valorBruto: true
        }
    });

    const openOpsByPartner: Record<string, { totalBruto: number; count: number }> = {};
    openRediscountOps.forEach(op => {
        if (op.partnerId) {
            if (!openOpsByPartner[op.partnerId]) {
                openOpsByPartner[op.partnerId] = { totalBruto: 0, count: 0 };
            }
            openOpsByPartner[op.partnerId].totalBruto += Number(op.valorBruto) || 0;
            openOpsByPartner[op.partnerId].count += 1;
        }
    });

    // 4. Buscar histórico de re-desconto para evolução mensal no gráfico
    const allRediscountOps = await prisma.operation.findMany({
        where: {
            isRedesconto: true,
            active: true
        },
        select: {
            date: true,
            valorBruto: true,
            fator: true,
            adValorem: true,
            tarifas: true,
            custoParceiro: true
        },
        orderBy: { date: "asc" }
    });

    const monthlyMap: Record<string, { monthKey: string; label: string; volume: number; receitaGeluk: number; custoParceiro: number; ganhoGeluk: number }> = {};
    allRediscountOps.forEach(op => {
        const d = new Date(op.date);
        const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });

        if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = {
                monthKey,
                label,
                volume: 0,
                receitaGeluk: 0,
                custoParceiro: 0,
                ganhoGeluk: 0
            };
        }

        const bruto = Number(op.valorBruto) || 0;
        const rec = (Number(op.fator) || 0) + (Number(op.adValorem) || 0) + (Number(op.tarifas) || 0);
        const custo = Number(op.custoParceiro) || 0;
        const ganho = rec - custo;

        monthlyMap[monthKey].volume += bruto;
        monthlyMap[monthKey].receitaGeluk += rec;
        monthlyMap[monthKey].custoParceiro += custo;
        monthlyMap[monthKey].ganhoGeluk += ganho;
    });

    const monthlyHistory = Object.values(monthlyMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "2rem 0" }}>
            <header className="responsive-header-flex" style={{ padding: "0 2rem", marginBottom: "1.5rem" }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                        Re-desconto
                    </h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        Gestão de Funding com Bancos, FIDCs, Securitizadoras, limites tomados e apuração de spread
                    </p>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <MonthFilter />
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
                <RedescontoView
                    operations={operations as any}
                    partners={partners as any}
                    openOpsByPartner={openOpsByPartner}
                    monthlyHistory={monthlyHistory}
                    currentUserRole={(session.user as any).role}
                />
            </main>
        </div>
    );
}

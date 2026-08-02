import { prisma } from "@/lib/prisma";
import CostTable from "./CostTable";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import MonthFilter from "@/components/MonthFilter";
import { cookies } from "next/headers";

export default async function CustosPage({ searchParams }: { searchParams: Promise<{ month?: string | string[], startDate?: string | string[], endDate?: string | string[] }> }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if ((session?.user as any)?.role === "COMERCIAL") {
        redirect("/clientes");
    }

    let now = new Date();
    const resolvedParams = await searchParams;
    let monthParam = typeof resolvedParams?.month === 'string' ? resolvedParams.month : Array.isArray(resolvedParams?.month) ? resolvedParams.month[0] : null;
    let startDateParam = typeof resolvedParams?.startDate === 'string' ? resolvedParams.startDate : Array.isArray(resolvedParams?.startDate) ? resolvedParams.startDate[0] : null;
    let endDateParam = typeof resolvedParams?.endDate === 'string' ? resolvedParams.endDate : Array.isArray(resolvedParams?.endDate) ? resolvedParams.endDate[0] : null;

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

    const costs = await prisma.cost.findMany({
        where: {
            date: dateFilter
        },
        orderBy: { date: "asc" },
    });

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header className="responsive-header-flex">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Custos e Despesas</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Controle de gastos fixos, variáveis e impostos</p>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <MonthFilter />
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div className="glass-panel" style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <CostTable initialCosts={costs} currentUserRole={(session?.user as any)?.role || "USER"} />
                </div>
            </main>
        </div>
    );
}

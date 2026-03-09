import { prisma } from "@/lib/prisma";
import CostTable from "./CostTable";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import MonthFilter from "@/components/MonthFilter";
import { cookies } from "next/headers";

export default async function CustosPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    let now = new Date();
    const resolvedParams = await searchParams;
    let monthParam = typeof resolvedParams?.month === 'string' ? resolvedParams.month : Array.isArray(resolvedParams?.month) ? resolvedParams.month[0] : null;

    if (!monthParam) {
        const cookieStore = await cookies();
        monthParam = cookieStore.get("selectedMonth")?.value || null;
    }

    let dateFilter: any = {};
    if (monthParam === "all") {
        const startOfYear = new Date(2026, 0, 1);
        const endOfYear = new Date(2026, 11, 31, 23, 59, 59);
        dateFilter = { gte: startOfYear, lte: endOfYear };
    } else if (monthParam) {
        const [year, month] = monthParam.split("-");
        now = new Date(Number(year), Number(month) - 1, 15);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        dateFilter = { gte: startOfMonth, lte: endOfMonth };
    } else {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
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
                    <CostTable initialCosts={costs} currentUserRole={(session.user as any).role} />
                </div>
            </main>
        </div>
    );
}

import { prisma } from "@/lib/prisma";
import InvestorTable from "./InvestorTable";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function InvestidoresPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const investors = await prisma.investor.findMany({
        include: {
            transactions: {
                orderBy: { date: "asc" }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "2rem" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Investidores</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Gestão de capital e aportes</p>
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div className="glass-panel" style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <InvestorTable initialInvestors={investors as any} currentUserRole={(session.user as any).role} />
                </div>
            </main>
        </div>
    );
}

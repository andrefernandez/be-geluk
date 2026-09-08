import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EmAbertoView from "./EmAbertoView";

export default async function OperacoesEmAbertoPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if ((session?.user as any)?.role === "COMERCIAL") {
        redirect("/clientes");
    }

    // Busca todas as operações em aberto (independente de mês) para que nenhuma pendência seja perdida
    const operations = await prisma.operation.findMany({
        where: {
            paga: false,
            active: true
        },
        include: {
            client: true,
            partner: true,
            sacados: true
        },
        orderBy: { date: "asc" }
    });

    const partners = await prisma.partner.findMany({
        where: { active: true },
        orderBy: { name: "asc" }
    });

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "2rem 0" }}>
            <header className="responsive-header-flex" style={{ padding: "0 2rem", marginBottom: "1.5rem" }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                        Operações em Aberto
                    </h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        Controle global de todos os recebíveis pendentes de liquidação pelo cliente
                    </p>
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
                <EmAbertoView
                    operations={operations as any}
                    partners={partners as any}
                    currentUserRole={(session.user as any).role}
                />
            </main>
        </div>
    );
}

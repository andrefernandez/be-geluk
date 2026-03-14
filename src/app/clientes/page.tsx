import { prisma } from "@/lib/prisma";
import ClientTable from "./ClientTable";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function ClientesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const clients = await prisma.client.findMany({
        where: (session.user as any).role === "COMERCIAL" ? {
            representativeId: (session.user as any).id
        } : {},
        select: {
            id: true,
            name: true,
            cnpj: true,
            status: true,
            createdAt: true,
            representativeId: true,
            representative: {
                select: {
                    name: true
                }
            },
            _count: {
                select: { 
                    operations: true,
                    agreements: true
                }
            }
        },
        orderBy: { name: "asc" },
    });

    const representatives = await prisma.user.findMany({
        where: {
            role: {
                in: ["MANAGER", "COMERCIAL"]
            }
        },
        select: {
            id: true,
            name: true,
            role: true
        },
        orderBy: { name: "asc" }
    });

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header className="responsive-header-flex">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Clientes</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Gestão de sacados/cedentes</p>
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div className="glass-panel" style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <ClientTable 
                        initialClients={clients as any} 
                        currentUserRole={(session.user as any).role} 
                        currentUserId={(session.user as any).id}
                        representatives={representatives}
                    />
                </div>
            </main>
        </div>
    );
}

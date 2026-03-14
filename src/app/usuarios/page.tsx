import { prisma } from "@/lib/prisma";
import UserTable from "./UserTable";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function UsuariosPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if ((session?.user as any)?.role === "COMERCIAL") {
        redirect("/clientes");
    }

    // Apenas Admin e Manager podem ver/editar usuários? 
    // No caso, deixaremos Admin para criar/editar.
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header className="responsive-header-flex">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Usuários</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Gerenciamento de acessos ao sistema</p>
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div className="glass-panel" style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <UserTable initialUsers={users} currentUserRole={(session.user as any).role} />
                </div>
            </main>
        </div>
    );
}

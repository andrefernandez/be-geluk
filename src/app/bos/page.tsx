import { prisma } from "@/lib/prisma";
import BoList from "./BoList";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function BoPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const bos = await prisma.todo.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header className="responsive-header-flex">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>B.o's</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Gerencie problemas e pendências operacionais</p>
                </div>
            </header>

            <main style={{ flex: 1, marginTop: "2rem" }}>
                <BoList initialTodos={bos} />
            </main>
        </div>
    );
}

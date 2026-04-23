import { prisma } from "@/lib/prisma";
import TodoList from "./TodoList";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function TodoPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const todos = await prisma.todo.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header className="responsive-header-flex">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Agenda e Tarefas</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Organize pendências e compromissos</p>
                </div>
            </header>

            <main style={{ flex: 1, marginTop: "2rem" }}>
                <TodoList initialTodos={todos} />
            </main>
        </div>
    );
}

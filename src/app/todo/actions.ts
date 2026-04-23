"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTodos() {
    return await prisma.todo.findMany({
        orderBy: { createdAt: "desc" },
    });
}

export async function createTodo(data: { title: string; description?: string }) {
    try {
        const todo = await prisma.todo.create({
            data: {
                title: data.title,
                description: data.description,
                status: "OPEN",
            },
        });
        revalidatePath("/todo");
        return { success: true, todo };
    } catch (error) {
        console.error("Error creating todo:", error);
        return { success: false, error: "Falha ao criar tarefa" };
    }
}

export async function updateTodo(id: string, data: { title?: string; description?: string; status?: string }) {
    try {
        const todo = await prisma.todo.update({
            where: { id },
            data,
        });
        revalidatePath("/todo");
        return { success: true, todo };
    } catch (error) {
        console.error("Error updating todo:", error);
        return { success: false, error: "Falha ao atualizar tarefa" };
    }
}

export async function toggleTodoStatus(id: string, currentStatus: string) {
    try {
        const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
        const todo = await prisma.todo.update({
            where: { id },
            data: { status: newStatus },
        });
        revalidatePath("/todo");
        return { success: true, todo };
    } catch (error) {
        console.error("Error toggling todo status:", error);
        return { success: false, error: "Falha ao alternar status" };
    }
}

export async function deleteTodo(id: string) {
    try {
        await prisma.todo.delete({
            where: { id },
        });
        revalidatePath("/todo");
        return { success: true };
    } catch (error) {
        console.error("Error deleting todo:", error);
        return { success: false, error: "Falha ao excluir tarefa" };
    }
}

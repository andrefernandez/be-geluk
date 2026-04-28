"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getBos() {
    return await prisma.todo.findMany({
        orderBy: { createdAt: "desc" },
    });
}

export async function createBo(data: { title: string; description?: string }) {
    try {
        const todo = await prisma.todo.create({
            data: {
                title: data.title,
                description: data.description,
                status: "OPEN",
            },
        });
        revalidatePath("/bos");
        return { success: true, todo };
    } catch (error) {
        console.error("Error creating B.o:", error);
        return { success: false, error: "Falha ao criar B.o" };
    }
}

export async function updateBo(id: string, data: { title?: string; description?: string; status?: string }) {
    try {
        const todo = await prisma.todo.update({
            where: { id },
            data,
        });
        revalidatePath("/bos");
        return { success: true, todo };
    } catch (error) {
        console.error("Error updating B.o:", error);
        return { success: false, error: "Falha ao atualizar B.o" };
    }
}

export async function toggleBoStatus(id: string, currentStatus: string) {
    try {
        const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
        const todo = await prisma.todo.update({
            where: { id },
            data: { status: newStatus },
        });
        revalidatePath("/bos");
        return { success: true, todo };
    } catch (error) {
        console.error("Error toggling B.o status:", error);
        return { success: false, error: "Falha ao alternar status" };
    }
}

export async function deleteBo(id: string) {
    try {
        await prisma.todo.delete({
            where: { id },
        });
        revalidatePath("/bos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting B.o:", error);
        return { success: false, error: "Falha ao excluir B.o" };
    }
}

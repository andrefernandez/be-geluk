"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCost(data: { name: string; amount: number; date: Date; type: string; category: string; }) {
    try {
        await prisma.cost.create({
            data: {
                name: data.name,
                amount: data.amount,
                date: data.date,
                category: data.category,
                type: data.type || "GERAL",
            },
        });
        revalidatePath("/custos");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao registrar custo" };
    }
}

export async function updateCost(id: string, data: { name: string; amount: number; date: Date; type: string; category: string; }) {
    try {
        await prisma.cost.update({
            where: { id },
            data: {
                name: data.name,
                amount: data.amount,
                date: data.date,
                category: data.category,
                type: data.type || "GERAL",
            },
        });
        revalidatePath("/custos");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao atualizar custo" };
    }
}

export async function deleteCost(id: string) {
    try {
        await prisma.cost.delete({ where: { id } });
        revalidatePath("/custos");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao excluir custo" };
    }
}

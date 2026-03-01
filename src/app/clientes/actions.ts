"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: { name: string }) {
    try {
        const existing = await prisma.client.findUnique({ where: { name: data.name } });
        if (existing) {
            return { success: false, error: "Já existe um cliente com este nome." };
        }

        await prisma.client.create({
            data: {
                name: data.name,
            },
        });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao criar cliente. Verifique se o nome é único." };
    }
}

export async function updateClient(id: string, data: { name: string }) {
    try {
        const existing = await prisma.client.findUnique({ where: { name: data.name } });
        if (existing && existing.id !== id) {
            return { success: false, error: "Já existe um cliente com este nome." };
        }

        await prisma.client.update({
            where: { id },
            data: {
                name: data.name,
            },
        });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao atualizar cliente" };
    }
}

export async function deleteClient(id: string) {
    try {
        // Check if the client has any operations first
        const client = await prisma.client.findUnique({
            where: { id },
            include: { _count: { select: { operations: true } } }
        });
        if (client && client._count.operations > 0) {
            return { success: false, error: "Não é possível excluir um cliente que possui operações vinculadas." };
        }

        await prisma.client.delete({ where: { id } });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao deletar cliente" };
    }
}

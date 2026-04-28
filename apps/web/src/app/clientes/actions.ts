"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: { name: string, cnpj?: string, status?: string, representativeId?: string, taxaFator?: number, taxaAdValorem?: number, taxaTarifa?: number }) {
    try {
        const existing = await prisma.client.findUnique({ where: { name: data.name } });
        if (existing) {
            return { success: false, error: "Já existe um cliente com este nome." };
        }

        await prisma.client.create({
            data: {
                name: data.name,
                cnpj: data.cnpj,
                status: data.status || "ATIVO",
                representativeId: data.representativeId,
                taxaFator: data.taxaFator,
                taxaAdValorem: data.taxaAdValorem,
                taxaTarifa: data.taxaTarifa,
            } as any,
        });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao criar cliente. Verifique se o nome é único." };
    }
}

export async function updateClient(id: string, data: { name: string, cnpj?: string, status?: string, representativeId?: string, taxaFator?: number, taxaAdValorem?: number, taxaTarifa?: number }) {
    try {
        const existing = await prisma.client.findUnique({ where: { name: data.name } });
        if (existing && existing.id !== id) {
            return { success: false, error: "Já existe um cliente com este nome." };
        }

        await prisma.client.update({
            where: { id },
            data: {
                name: data.name,
                cnpj: data.cnpj,
                status: data.status,
                representativeId: data.representativeId,
                taxaFator: data.taxaFator,
                taxaAdValorem: data.taxaAdValorem,
                taxaTarifa: data.taxaTarifa,
            } as any,
        });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao atualizar cliente" };
    }
}

export async function updateClientStatus(id: string, status: string) {
    try {
        await prisma.client.update({
            where: { id },
            data: { status } as any,
        });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao atualizar status do cliente" };
    }
}

export async function deleteClient(id: string) {
    console.log(">>> SERVIDOR: Iniciando exclusão do ID:", id);
    try {
        const deleted = await prisma.client.delete({ where: { id } });
        console.log(">>> SERVIDOR: Excluído com sucesso:", deleted.name);
        revalidatePath("/clientes");
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: any) {
        console.error(">>> SERVIDOR: Erro ao excluir:", error);
        if (error.code === 'P2003') {
            return { success: false, error: "Este cliente possui vínculos (Operações ou Acordos) que impedem a exclusão." };
        }
        return { success: false, error: "Erro no servidor: " + error.message };
    }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: { name: string, cnpj?: string | null, status?: string, representativeId?: string | null, taxaFator?: number, taxaAdValorem?: number, taxaTarifa?: number, taxaIof?: number, taxaIofAdicional?: number }) {
    try {
        const trimmedName = data.name?.trim();
        if (!trimmedName) {
            return { success: false, error: "O nome do cliente é obrigatório." };
        }

        const existing = await prisma.client.findUnique({ where: { name: trimmedName } });
        if (existing) {
            return { success: false, error: "Já existe um cliente com este nome." };
        }

        await prisma.client.create({
            data: {
                name: trimmedName,
                cnpj: data.cnpj?.trim() || null,
                status: data.status || "ATIVO",
                representativeId: data.representativeId?.trim() ? data.representativeId.trim() : null,
                taxaFator: data.taxaFator ?? null,
                taxaAdValorem: data.taxaAdValorem ?? null,
                taxaTarifa: data.taxaTarifa ?? null,
                taxaIof: data.taxaIof ?? null,
                taxaIofAdicional: data.taxaIofAdicional ?? null,
            } as any,
        });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao criar cliente:", error);
        if (error.code === 'P2002') {
            return { success: false, error: "Já existe um cliente com este nome." };
        }
        if (error.code === 'P2003') {
            return { success: false, error: "Representante selecionado inválido ou não encontrado." };
        }
        return { success: false, error: "Erro ao criar cliente: " + (error?.message || "Erro desconhecido") };
    }
}

export async function updateClient(id: string, data: { name: string, cnpj?: string | null, status?: string, representativeId?: string | null, taxaFator?: number, taxaAdValorem?: number, taxaTarifa?: number, taxaIof?: number, taxaIofAdicional?: number }) {
    try {
        const trimmedName = data.name?.trim();
        if (!trimmedName) {
            return { success: false, error: "O nome do cliente é obrigatório." };
        }

        const existing = await prisma.client.findUnique({ where: { name: trimmedName } });
        if (existing && existing.id !== id) {
            return { success: false, error: "Já existe um cliente com este nome." };
        }

        await prisma.client.update({
            where: { id },
            data: {
                name: trimmedName,
                cnpj: data.cnpj?.trim() || null,
                status: data.status,
                representativeId: data.representativeId?.trim() ? data.representativeId.trim() : null,
                taxaFator: data.taxaFator ?? null,
                taxaAdValorem: data.taxaAdValorem ?? null,
                taxaTarifa: data.taxaTarifa ?? null,
                taxaIof: data.taxaIof ?? null,
                taxaIofAdicional: data.taxaIofAdicional ?? null,
            } as any,
        });
        revalidatePath("/clientes");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao atualizar cliente:", error);
        if (error.code === 'P2002') {
            return { success: false, error: "Já existe um cliente com este nome." };
        }
        if (error.code === 'P2003') {
            return { success: false, error: "Representante selecionado inválido ou não encontrado." };
        }
        return { success: false, error: "Erro ao atualizar cliente: " + (error?.message || "Erro desconhecido") };
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

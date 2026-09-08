"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPartner(data: {
    name: string;
    type?: string;
    rate: number;
    limit: number;
    contact?: string | null;
    notes?: string | null;
}) {
    try {
        if (!data.name || !data.name.trim()) {
            return { success: false, error: "O nome do parceiro é obrigatório." };
        }
        if (data.rate === undefined || isNaN(data.rate)) {
            return { success: false, error: "A taxa cobrada é obrigatória." };
        }
        if (data.limit === undefined || isNaN(data.limit)) {
            return { success: false, error: "O limite disponibilizado é obrigatório." };
        }

        const existing = await prisma.partner.findUnique({
            where: { name: data.name.trim() }
        });
        if (existing) {
            return { success: false, error: "Já existe um parceiro cadastrado com este nome." };
        }

        await prisma.partner.create({
            data: {
                name: data.name.trim(),
                type: data.type || "FIDC",
                rate: Number(data.rate),
                limit: Number(data.limit),
                contact: data.contact?.trim() || null,
                notes: data.notes?.trim() || null,
                active: true
            }
        });

        revalidatePath("/redesconto");
        revalidatePath("/operacoes");
        revalidatePath("/em-aberto");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao cadastrar parceiro:", error);
        return { success: false, error: error.message || "Erro ao cadastrar parceiro." };
    }
}

export async function updatePartner(id: string, data: {
    name: string;
    type?: string;
    rate: number;
    limit: number;
    contact?: string | null;
    notes?: string | null;
    active?: boolean;
}) {
    try {
        if (!data.name || !data.name.trim()) {
            return { success: false, error: "O nome do parceiro é obrigatório." };
        }

        const existing = await prisma.partner.findFirst({
            where: {
                name: data.name.trim(),
                NOT: { id }
            }
        });
        if (existing) {
            return { success: false, error: "Já existe outro parceiro com este nome." };
        }

        await prisma.partner.update({
            where: { id },
            data: {
                name: data.name.trim(),
                type: data.type || "FIDC",
                rate: Number(data.rate),
                limit: Number(data.limit),
                contact: data.contact?.trim() || null,
                notes: data.notes?.trim() || null,
                active: data.active ?? true
            }
        });

        revalidatePath("/redesconto");
        revalidatePath("/operacoes");
        revalidatePath("/em-aberto");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao atualizar parceiro:", error);
        return { success: false, error: error.message || "Erro ao atualizar parceiro." };
    }
}

export async function deletePartner(id: string) {
    try {
        const opsCount = await prisma.operation.count({
            where: { partnerId: id }
        });
        if (opsCount > 0) {
            return { 
                success: false, 
                error: `Este parceiro possui ${opsCount} operação(ões) vinculada(s). Desative-o ao invés de excluir para manter o histórico.` 
            };
        }

        await prisma.partner.delete({
            where: { id }
        });

        revalidatePath("/redesconto");
        revalidatePath("/operacoes");
        revalidatePath("/em-aberto");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao excluir parceiro:", error);
        return { success: false, error: error.message || "Erro ao excluir parceiro." };
    }
}

export async function togglePartnerStatus(id: string, active: boolean) {
    try {
        await prisma.partner.update({
            where: { id },
            data: { active }
        });

        revalidatePath("/redesconto");
        revalidatePath("/operacoes");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao alternar status do parceiro:", error);
        return { success: false, error: error.message || "Erro ao alternar status do parceiro." };
    }
}

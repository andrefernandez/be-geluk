"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createInvestor(data: { name: string; rate: number; type: string; startDate?: Date; initialAmount?: number }) {
    try {
        const investor = await prisma.investor.create({
            data: {
                name: data.name,
                rate: data.rate,
                type: data.type,
                startDate: data.startDate || null,
            } as any,
        });

        if (data.initialAmount && data.initialAmount > 0) {
            await prisma.investmentTransaction.create({
                data: {
                    investorId: investor.id,
                    type: "APORTE",
                    amount: data.initialAmount,
                    date: data.startDate || new Date(),
                }
            });
        }

        revalidatePath("/investidores");
        return { success: true };
    } catch (error) {
        console.error("DEBUG: Error creating investor:", error);
        return { success: false, error: "Erro ao cadastrar investidor" };
    }
}

export async function updateInvestor(id: string, data: { name: string; rate: number; type: string; startDate?: Date; initialAmount?: number }) {
    try {
        await prisma.investor.update({
            where: { id },
            data: {
                name: data.name,
                rate: data.rate,
                type: data.type,
                startDate: data.startDate || null,
            } as any,
        });

        if (data.initialAmount !== undefined) {
            // Tenta encontrar a primeira transação de aporte para atualizar
            const firstTx = await prisma.investmentTransaction.findFirst({
                where: { investorId: id, type: "APORTE" },
                orderBy: { date: "asc" }
            });

            if (firstTx) {
                await prisma.investmentTransaction.update({
                    where: { id: firstTx.id },
                    data: {
                        amount: data.initialAmount,
                        date: data.startDate || firstTx.date
                    }
                });
            } else if (data.initialAmount > 0) {
                await prisma.investmentTransaction.create({
                    data: {
                        investorId: id,
                        type: "APORTE",
                        amount: data.initialAmount,
                        date: data.startDate || new Date(),
                    }
                });
            }
        }

        revalidatePath("/investidores");
        return { success: true };
    } catch (error) {
        console.error("DEBUG: Error updating investor:", error);
        return { success: false, error: "Erro ao atualizar investidor" };
    }
}

export async function addTransaction(investorId: string, data: { type: string; amount: number; date: Date; prazo?: number; parentId?: string; modalidade?: string; rate?: number }) {
    try {
        await prisma.investmentTransaction.create({
            data: {
                investorId,
                type: data.type,
                amount: data.amount,
                date: data.date,
                prazo: data.prazo || null,
                parentId: data.parentId || null,
                modalidade: data.modalidade || null,
                rate: data.rate || null,
            } as any,
        });
        revalidatePath("/investidores");
        return { success: true };
    } catch (error) {
        console.error("DEBUG: Error adding transaction:", error);
        return { success: false, error: "Erro ao adicionar movimentação" };
    }
}
export async function deleteTransaction(id: string) {
    try {
        await prisma.investmentTransaction.delete({
            where: { id },
        });
        revalidatePath("/investidores");
        return { success: true };
    } catch (error) {
        console.error("DEBUG: Error deleting transaction:", error);
        return { success: false, error: "Erro ao excluir movimentação" };
    }
}
export async function deleteInvestor(id: string) {
    try {
        // As transações serão deletadas automaticamente se houver Cascade no Prisma, 
        // caso contrário deletamos manualmente primeiro.
        await prisma.investmentTransaction.deleteMany({
            where: { investorId: id }
        });

        await prisma.investor.delete({
            where: { id },
        });
        revalidatePath("/investidores");
        return { success: true };
    } catch (error) {
        console.error("DEBUG: Error deleting investor:", error);
        return { success: false, error: "Erro ao excluir investidor" };
    }
}
export async function updateTransactionDate(id: string, newDate: Date) {
    try {
        await prisma.investmentTransaction.update({
            where: { id },
            data: { date: newDate },
        });
        revalidatePath("/investidores");
        return { success: true };
    } catch (error) {
        console.error("DEBUG: Error updating transaction date:", error);
        return { success: false, error: "Erro ao atualizar data" };
    }
}

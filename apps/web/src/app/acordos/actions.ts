"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createAgreement(data: {
    clientId: string;
    totalValue: number;
    installmentsCount: number;
    installmentValue: number;
    firstDueDate: Date;
}) {
    try {
        const { clientId, totalValue, installmentsCount, installmentValue, firstDueDate } = data;

        // Start a transaction to create the agreement and its installments together
        await prisma.$transaction(async (tx) => {
            const agreement = await tx.agreement.create({
                data: {
                    clientId,
                    totalValue,
                    installmentsCount,
                    status: "ACTIVE"
                }
            });

            const installmentsData = [];
            let currentDueDate = new Date(firstDueDate);

            for (let i = 0; i < installmentsCount; i++) {
                installmentsData.push({
                    agreementId: agreement.id,
                    value: installmentValue,
                    dueDate: new Date(currentDueDate),
                    status: "PENDING"
                });
                
                // Add 1 month for the next installment
                currentDueDate.setMonth(currentDueDate.getMonth() + 1);
            }

            await tx.agreementInstallment.createMany({
                data: installmentsData
            });
        });

        revalidatePath("/acordos");
        return { success: true };
    } catch (error) {
        console.error("Error creating agreement:", error);
        return { success: false, error: "Erro ao registrar acordo" };
    }
}

export async function getAgreements() {
    try {
        const agreements = await prisma.agreement.findMany({
            include: {
                client: true,
                installments: {
                    orderBy: {
                        dueDate: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return { success: true, agreements };
    } catch (error) {
        console.error("Error fetching agreements:", error);
        return { success: false, error: "Erro ao buscar acordos", agreements: [] };
    }
}

export async function toggleInstallmentStatus(installmentId: string) {
    try {
        const installment = await prisma.agreementInstallment.findUnique({
            where: { id: installmentId },
            include: { agreement: true }
        });

        if (!installment) {
            return { success: false, error: "Parcela não encontrada" };
        }

        const isCurrentlyPaid = installment.status === "PAID";
        const newStatus = isCurrentlyPaid ? "PENDING" : "PAID";
        const newPaidAt = newStatus === "PAID" ? new Date() : null;
        const newPaidValue = newStatus === "PAID" ? installment.value : 0;

        await prisma.$transaction(async (tx) => {
            await tx.agreementInstallment.update({
                where: { id: installmentId },
                data: { status: newStatus, paidAt: newPaidAt, paidValue: newPaidValue }
            });

            // Check if all installments for this agreement are now paid
            const updatedAgreement = await tx.agreement.findUnique({
                where: { id: installment.agreementId },
                include: { installments: true }
            });

            if (updatedAgreement) {
                const allPaid = updatedAgreement.installments.every(inst => inst.status === "PAID");
                
                // Only update to COMPLETED if all are paid. If one was unchecked, revert to ACTIVE
                await tx.agreement.update({
                    where: { id: updatedAgreement.id },
                    data: { status: allPaid ? "COMPLETED" : "ACTIVE" }
                });
            }
        });

        revalidatePath("/acordos");
        return { success: true };
    } catch (error) {
        console.error("Error toggling installment status:", error);
        return { success: false, error: "Erro ao atualizar status da parcela" };
    }
}

export async function updateInstallmentPayment(installmentId: string, paidValue: number) {
    try {
        const installment = await prisma.agreementInstallment.findUnique({
            where: { id: installmentId }
        });

        if (!installment) {
            return { success: false, error: "Parcela não encontrada" };
        }

        let newStatus = "PENDING";
        if (paidValue >= installment.value) {
            newStatus = "PAID";
        } else if (paidValue > 0) {
            newStatus = "PARTIAL";
        }

        const newPaidAt = newStatus === "PAID" || newStatus === "PARTIAL" ? new Date() : null;

        await prisma.$transaction(async (tx) => {
            await tx.agreementInstallment.update({
                where: { id: installmentId },
                data: { 
                    status: newStatus, 
                    paidAt: newPaidAt, 
                    paidValue: paidValue 
                }
            });

            // Check if all installments for this agreement are now paid
            const updatedAgreement = await tx.agreement.findUnique({
                where: { id: installment.agreementId },
                include: { installments: true }
            });

            if (updatedAgreement) {
                const allPaid = updatedAgreement.installments.every(inst => inst.status === "PAID");
                
                await tx.agreement.update({
                    where: { id: updatedAgreement.id },
                    data: { status: allPaid ? "COMPLETED" : "ACTIVE" }
                });
            }
        });

        revalidatePath("/acordos");
        return { success: true };
    } catch (error) {
        console.error("Error updating installment payment:", error);
        return { success: false, error: "Erro ao atualizar pagamento da parcela" };
    }
}

export async function addInstallment(agreementId: string, value: number, dueDate: Date) {
    try {
        await prisma.$transaction(async (tx) => {
            const agreement = await tx.agreement.findUnique({
                where: { id: agreementId }
            });

            if (!agreement) {
                throw new Error("Acordo não encontrado");
            }

            // Create new installment
            await tx.agreementInstallment.create({
                data: {
                    agreementId,
                    value,
                    dueDate,
                    status: "PENDING",
                    paidValue: 0
                }
            });

            // Update agreement totals
            await tx.agreement.update({
                where: { id: agreementId },
                data: {
                    totalValue: agreement.totalValue + value,
                    installmentsCount: agreement.installmentsCount + 1,
                    status: "ACTIVE" // Reverts to active if it was completed
                }
            });
        });

        revalidatePath("/acordos");
        return { success: true };
    } catch (error: any) {
        console.error("Error adding installment:", error);
        return { success: false, error: error.message || "Erro ao adicionar parcela" };
    }
}

export async function deleteAgreement(id: string) {
    try {
        await prisma.agreement.delete({ where: { id } });
        revalidatePath("/acordos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting agreement:", error);
        return { success: false, error: "Erro ao excluir acordo" };
    }
}

export async function editAgreement(id: string, data: {
    clientId: string;
    totalValue: number;
    installmentsCount: number;
    installmentValue: number;
    firstDueDate: Date;
}) {
    try {
        const { clientId, totalValue, installmentsCount, installmentValue, firstDueDate } = data;

        await prisma.$transaction(async (tx) => {
            // Delete all existing installments to regenerate them
            await tx.agreementInstallment.deleteMany({
                where: { agreementId: id }
            });

            // Update the agreement basic info
            await tx.agreement.update({
                where: { id },
                data: {
                    clientId,
                    totalValue,
                    installmentsCount,
                    status: "ACTIVE"
                }
            });

            const installmentsData = [];
            let currentDueDate = new Date(firstDueDate);

            for (let i = 0; i < installmentsCount; i++) {
                installmentsData.push({
                    agreementId: id,
                    value: installmentValue,
                    dueDate: new Date(currentDueDate),
                    status: "PENDING"
                });
                
                // Add 1 month for the next installment
                currentDueDate.setMonth(currentDueDate.getMonth() + 1);
            }

            // Create new installments
            await tx.agreementInstallment.createMany({
                data: installmentsData
            });
        });

        revalidatePath("/acordos");
        return { success: true };
    } catch (error) {
        console.error("Error editing agreement:", error);
        return { success: false, error: "Erro ao editar acordo" };
    }
}

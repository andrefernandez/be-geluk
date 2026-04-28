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

        const newStatus = installment.status === "PENDING" ? "PAID" : "PENDING";
        const newPaidAt = newStatus === "PAID" ? new Date() : null;

        await prisma.$transaction(async (tx) => {
            await tx.agreementInstallment.update({
                where: { id: installmentId },
                data: { status: newStatus, paidAt: newPaidAt }
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

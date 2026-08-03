"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createOperation(data: any) {
    try {
        await prisma.operation.create({
            data: {
                clientId: data.clientId,
                date: data.date,
                valorBruto: data.valorBruto,
                fator: data.fator,
                percentual: data.percentual,
                percentualPrazo: data.percentualPrazo,
                dias: data.dias,
                tarifas: data.tarifas,
                percentualTarifas: data.percentualTarifas,
                adValorem: data.adValorem,
                percentualAdValorem: data.percentualAdValorem,
                irpj: data.irpj,
                iof: data.iof,
                iofAdicional: data.iofAdicional,
                valorLiquido: data.valorLiquido,
                recompra: data.recompra,
                declarada: data.declarada ?? false,
                status: data.status || "CONFIRMACAO",
                comprovanteConfirmacao: data.comprovanteConfirmacao || null,
                comprovanteAssinatura: data.comprovanteAssinatura || null,
                comprovantePagamento: data.comprovantePagamento || null,
                sacados: {
                    create: data.sacados?.map((s: any) => ({
                        nome: s.nome,
                        cnpj: s.cnpj,
                        valor: s.valor
                    })) || []
                }
            },
        });
        revalidatePath("/operacoes");
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false, error: "Erro ao registrar operação" };
    }
}

export async function deleteOperation(id: string) {
    try {
        await prisma.operation.delete({ where: { id } });
        revalidatePath("/operacoes");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao excluir operação" };
    }
}

export async function updateOperation(id: string, data: any) {
    try {
        await prisma.operation.update({
            where: { id },
            data: {
                clientId: data.clientId,
                date: data.date,
                valorBruto: data.valorBruto,
                fator: data.fator,
                percentual: data.percentual,
                percentualPrazo: data.percentualPrazo,
                dias: data.dias,
                tarifas: data.tarifas,
                percentualTarifas: data.percentualTarifas,
                adValorem: data.adValorem,
                percentualAdValorem: data.percentualAdValorem,
                irpj: data.irpj,
                iof: data.iof,
                iofAdicional: data.iofAdicional,
                valorLiquido: data.valorLiquido,
                recompra: data.recompra,
                declarada: data.declarada ?? false,
                status: data.status || "CONFIRMACAO",
                comprovanteConfirmacao: data.comprovanteConfirmacao || null,
                comprovanteAssinatura: data.comprovanteAssinatura || null,
                comprovantePagamento: data.comprovantePagamento || null,
                sacados: {
                    deleteMany: {},
                    create: data.sacados?.map((s: any) => ({
                        nome: s.nome,
                        cnpj: s.cnpj,
                        valor: s.valor
                    })) || []
                }
            },
        });
        revalidatePath("/operacoes");
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false, error: "Erro ao atualizar operação" };
    }
}

export async function uploadOperationFile(operationId: string, stage: string, formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, error: "Arquivo não enviado." };
        }

        const { writeFile, mkdir } = require("fs/promises");
        const { join } = require("path");

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), "public", "uploads", stage);
        await mkdir(uploadDir, { recursive: true });

        const ext = file.name.split(".").pop();
        const filename = `${operationId}-${Date.now()}.${ext}`;
        const filePath = join(uploadDir, filename);

        await writeFile(filePath, buffer);

        const relativePath = `/uploads/${stage}/${filename}`;

        const updateData: any = {};
        if (stage === "confirmacoes") {
            updateData.comprovanteConfirmacao = relativePath;
            updateData.status = "ASSINATURA";
        } else if (stage === "assinaturas") {
            updateData.comprovanteAssinatura = relativePath;
            updateData.status = "PAGAMENTO";
        } else if (stage === "pagamentos") {
            updateData.comprovantePagamento = relativePath;
            updateData.status = "CONCLUIDA";
        }

        await prisma.operation.update({
            where: { id: operationId },
            data: updateData
        });

        revalidatePath("/operacoes");
        return { success: true, path: relativePath };
    } catch (error: any) {
        console.error("Erro no upload do arquivo:", error);
        return { success: false, error: error.message || "Erro no upload do arquivo." };
    }
}

export async function updateOperationStatus(operationId: string, status: string) {
    try {
        await prisma.operation.update({
            where: { id: operationId },
            data: { status }
        });
        revalidatePath("/operacoes");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao atualizar status:", error);
        return { success: false, error: error.message };
    }
}

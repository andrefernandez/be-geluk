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
            },
        });
        revalidatePath("/operacoes");
        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false, error: "Erro ao atualizar operação" };
    }
}

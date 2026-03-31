"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export async function getGlobalSettings() {
    let settings = await prisma.globalSettings.findFirst();
    if (!settings) {
        settings = await prisma.globalSettings.create({
            data: {
                id: 'default_1',
                defaultFator: 8.5,
                defaultTarifas: [
                    { id: '1', nome: "Entrada de título", valor: "85", active: false },
                    { id: '2', nome: "Instrução bancária de título", valor: "10", active: false },
                    { id: '3', nome: "Manutenção de título bancário", valor: "15", active: false },
                    { id: '4', nome: "Tarifa de aditivo", valor: "10", active: false },
                    { id: '5', nome: "Tarifa de cobrança e notificação", valor: "60", active: false },
                    { id: '6', nome: "Tarifa de contrato", valor: "200", active: false }
                ]
            }
        });
    }
    return settings;
}

export async function updateGlobalSettings(data: any) {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "MANAGER")) {
        throw new Error("Não autorizado");
    }

    const settings = await prisma.globalSettings.findFirst();
    if (settings) {
        return prisma.globalSettings.update({
            where: { id: settings.id },
            data: {
                defaultFator: Number(data.defaultFator) || null,
                defaultAdValorem: Number(data.defaultAdValorem) || null,
                defaultIof: Number(data.defaultIof) || null,
                defaultIofAdicional: Number(data.defaultIofAdicional) || null,
                defaultTarifas: data.defaultTarifas || null
            }
        });
    }
    return null;
}

import { prisma } from "@/lib/prisma";
import OperationTable from "./OperationTable";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import MonthFilter from "@/components/MonthFilter";
import { cookies } from "next/headers";

export default async function OperacoesPage({ searchParams }: { searchParams: Promise<{ month?: string | string[], startDate?: string | string[], endDate?: string | string[] }> }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if ((session?.user as any)?.role === "COMERCIAL") {
        redirect("/clientes");
    }

    let now = new Date();
    const resolvedParams = await searchParams;
    let monthParam = typeof resolvedParams?.month === 'string' ? resolvedParams.month : Array.isArray(resolvedParams?.month) ? resolvedParams.month[0] : null;
    let startDateParam = typeof resolvedParams?.startDate === 'string' ? resolvedParams.startDate : Array.isArray(resolvedParams?.startDate) ? resolvedParams.startDate[0] : null;
    let endDateParam = typeof resolvedParams?.endDate === 'string' ? resolvedParams.endDate : Array.isArray(resolvedParams?.endDate) ? resolvedParams.endDate[0] : null;

    const cookieStore = await cookies();
    if (!monthParam) {
        monthParam = cookieStore.get("selectedMonth")?.value || null;
    }

    let dateFilter: any = {};

    if (monthParam === "custom") {
        if (!startDateParam) {
            startDateParam = cookieStore.get("startDate")?.value || "2026-01-01";
        }
        if (!endDateParam) {
            endDateParam = cookieStore.get("endDate")?.value || "2026-12-31";
        }
        const startCustom = new Date(startDateParam + "T00:00:00.000Z");
        const endCustom = new Date(endDateParam + "T23:59:59.999Z");
        dateFilter = { gte: startCustom, lte: endCustom };
    } else if (monthParam === "all") {
        const startOfYear = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));
        dateFilter = { gte: startOfYear, lte: endOfYear };
    } else if (monthParam && monthParam.includes("-")) {
        const [year, month] = monthParam.split("-");
        const y = Number(year);
        const m = Number(month) - 1;
        const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
        endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
        dateFilter = { gte: startOfMonth, lte: endOfMonth };
    } else {
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
        endOfMonth.setUTCMilliseconds(endOfMonth.getUTCMilliseconds() - 1);
        dateFilter = { gte: startOfMonth, lte: endOfMonth };
    }

    const isComercial = (session?.user as any)?.role === "COMERCIAL";

    const operations = await prisma.operation.findMany({
        where: {
            date: dateFilter,
            ...(isComercial ? { client: { representativeId: (session.user as any).id } } : {})
        },
        include: {
            client: true,
            sacados: true
        },
        orderBy: { date: "asc" },
    });

    const rawClients = await prisma.client.findMany({
        where: isComercial ? { representativeId: (session.user as any).id } : {},
        orderBy: { name: "asc" }
    });

    const clients = await Promise.all(rawClients.map(async (c) => {
        let updated = false;
        const updateData: any = {};

        const clientOps = await prisma.operation.findMany({
            where: { clientId: c.id },
            select: {
                percentualAdValorem: true,
                iof: true,
                iofAdicional: true,
                valorBruto: true
            }
        });

        if (clientOps.length > 0) {
            if (c.taxaAdValorem == null) {
                const maxAdValorem = Math.max(...clientOps.map(op => op.percentualAdValorem || 0));
                if (maxAdValorem > 0) {
                    updateData.taxaAdValorem = maxAdValorem;
                    c.taxaAdValorem = maxAdValorem;
                    updated = true;
                }
            }

            if ((c as any).taxaIof == null) {
                const maxIofPercent = Math.max(...clientOps.map(op => {
                    const bruto = op.valorBruto || 0;
                    const iofVal = op.iof || 0;
                    return bruto > 0 ? (iofVal / bruto) * 100 : 0;
                }));
                if (maxIofPercent > 0) {
                    updateData.taxaIof = Number(maxIofPercent.toFixed(4));
                    (c as any).taxaIof = Number(maxIofPercent.toFixed(4));
                    updated = true;
                }
            }

            if ((c as any).taxaIofAdicional == null) {
                const maxIofAdicPercent = Math.max(...clientOps.map(op => {
                    const bruto = op.valorBruto || 0;
                    const iofAdicVal = op.iofAdicional || 0;
                    return bruto > 0 ? (iofAdicVal / bruto) * 100 : 0;
                }));
                if (maxIofAdicPercent > 0) {
                    updateData.taxaIofAdicional = Number(maxIofAdicPercent.toFixed(4));
                    (c as any).taxaIofAdicional = Number(maxIofAdicPercent.toFixed(4));
                    updated = true;
                }
            }

            if (updated) {
                await prisma.client.update({
                    where: { id: c.id },
                    data: updateData as any
                });
            }
        }
        return c;
    }));

    const globalSettings = await prisma.globalSettings.findFirst();

    const allHistoryOperations = await prisma.operation.findMany({
        select: {
            clientId: true,
            percentual: true,
            percentualAdValorem: true,
            percentualTarifas: true,
            tarifas: true,
            iof: true,
            iofAdicional: true,
            irpj: true,
            valorBruto: true,
            date: true
        }
    });

    const clientHistoryMaxRates: Record<string, any> = {};
    for (const op of allHistoryOperations) {
        const totalTax = (Number(op.percentual) || 0) + (Number(op.percentualAdValorem) || 0) + (Number(op.percentualTarifas) || 0);
        const existing = clientHistoryMaxRates[op.clientId];
        if (!existing || totalTax > existing.totalTax) {
            clientHistoryMaxRates[op.clientId] = {
                totalTax,
                f: op.percentual,
                a: op.percentualAdValorem,
                t: op.percentualTarifas,
                tFixed: op.tarifas,
                iof: op.iof,
                iofAdicional: op.iofAdicional,
                irpj: op.irpj
            };
        }
    }

    const clientLastOperationRate: Record<string, { percentual: number, percentualAdValorem: number }> = {};
    const sortedOps = [...allHistoryOperations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const op of sortedOps) {
        clientLastOperationRate[op.clientId] = {
            percentual: Number(op.percentual) || 0,
            percentualAdValorem: Number(op.percentualAdValorem) || 0
        };
    }

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "2rem 0" }}>
            <header className="responsive-header-flex" style={{ padding: "0 2rem", marginBottom: "2rem" }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Operações</h1>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <MonthFilter />
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
                    <OperationTable
                        initialOperations={operations as any}
                        clients={clients as any}
                        currentUserRole={(session.user as any).role}
                        clientHistoryMaxRates={clientHistoryMaxRates}
                        clientLastOperationRate={clientLastOperationRate}
                        globalSettings={globalSettings}
                    />
                </div>
            </main>
        </div>
    );
}

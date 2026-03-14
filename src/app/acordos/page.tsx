import { prisma } from "@/lib/prisma";
import AgreementList from "./AgreementList";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AcordosPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const isComercial = (session?.user as any)?.role === "COMERCIAL";

    if (isComercial) {
        redirect("/clientes");
    }

    // Fetch clients for the creation modal
    const clientsData = await prisma.client.findMany({
        where: isComercial ? { representativeId: (session.user as any).id } : {},
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    // Fetch agreements with installments and client info
    const agreementsData = await prisma.agreement.findMany({
        where: isComercial ? { client: { representativeId: (session.user as any).id } } : {},
        include: {
            client: {
                select: { name: true }
            },
            installments: {
                orderBy: { dueDate: 'asc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Compute Metrics
    const totalAgreements = agreementsData.length;
    let totalPaidValue = 0;
    let totalPendingValue = 0;
    let totalPaidInstallments = 0;
    let totalInstallments = 0;

    agreementsData.forEach((agreement: any) => {
        agreement.installments.forEach((inst: any) => {
            totalInstallments++;
            if (inst.status === "PAID") {
                totalPaidValue += inst.value;
                totalPaidInstallments++;
            } else {
                totalPendingValue += inst.value;
            }
        });
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="container-full">
            <div className="responsive-header-flex">
                        <div>
                            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.5rem" }}>Acordos</h1>
                            <p style={{ color: "var(--text-secondary)" }}>Gerencie parcelamentos e acordos com clientes</p>
                        </div>
                    </div>

                    <div className="layout-grid" style={{ marginBottom: "2rem" }}>
                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Valor Recebido</h3>
                            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(totalPaidValue)}</div>
                        </div>

                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>A Receber</h3>
                            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(totalPendingValue)}</div>
                        </div>

                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Parcelas Pagas</h3>
                            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{totalPaidInstallments}</div>
                            <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.5rem" }}>
                                DE {totalInstallments} PARCELAS
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <h3 style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Total de Acordos</h3>
                            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-primary)" }}>{totalAgreements}</div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: "0" }}>
                        <AgreementList
                            initialAgreements={agreementsData}
                            clients={clientsData}
                        />
                    </div>
        </div>
    );
}

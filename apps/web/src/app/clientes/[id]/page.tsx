import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ClientDetailsDashboard from "./ClientDetailsDashboard";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const { id } = await params;

    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            representative: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            operations: {
                where: { active: true },
                orderBy: { date: "desc" },
                include: {
                    sacados: true
                }
            }
        }
    });

    if (!client) {
        redirect("/clientes");
    }

    // Role check: Commercial reps can only view their own clients
    const user = session.user as any;
    if (user.role === "COMERCIAL" && client.representativeId !== user.id) {
        redirect("/clientes");
    }

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <ClientDetailsDashboard 
                client={client as any} 
                currentUserRole={user.role}
            />
        </div>
    );
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const user = await prisma.user.upsert({
            where: { email: 'admin@geluk.com.br' },
            update: {
                password: hashedPassword,
                role: 'ADMIN'
            },
            create: {
                name: 'Administrador',
                email: 'admin@geluk.com.br',
                password: hashedPassword,
                role: 'ADMIN'
            }
        });

        return NextResponse.json({
            success: true,
            message: "Usuário Admin criado/resetado com sucesso!",
            email: "admin@geluk.com.br",
            password: "admin123"
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

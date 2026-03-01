"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(data: any) {
    try {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role,
            },
        });
        revalidatePath("/usuarios");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao criar usuário" };
    }
}

export async function updateUser(id: string, data: any) {
    try {
        const updateData: any = {
            name: data.name,
            email: data.email,
            role: data.role,
        };
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        await prisma.user.update({
            where: { id },
            data: updateData,
        });
        revalidatePath("/usuarios");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao atualizar usuário" };
    }
}

export async function deleteUser(id: string) {
    try {
        await prisma.user.delete({ where: { id } });
        revalidatePath("/usuarios");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao deletar usuário" };
    }
}

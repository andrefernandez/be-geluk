"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCost(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const amountStr = formData.get("amount") as string;
        const dateStr = formData.get("date") as string;
        const type = (formData.get("type") as string) || "GERAL";
        const category = formData.get("category") as string;
        const barcode = formData.get("barcode") as string;
        const paymentMethod = formData.get("paymentMethod") as string;
        const pixKey = formData.get("pixKey") as string;
        const file = formData.get("file") as File | null;

        const amount = parseFloat(amountStr) || 0;
        const date = new Date(dateStr);

        const cost = await prisma.cost.create({
            data: {
                name,
                amount,
                date,
                category,
                type,
                barcode: barcode || null,
                paymentMethod: paymentMethod || null,
                pixKey: pixKey || null,
            },
        });

        if (file && file.size > 0) {
            const { writeFile, mkdir } = require("fs/promises");
            const { join } = require("path");

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploadDir = join(process.cwd(), "public", "uploads", "custos");
            await mkdir(uploadDir, { recursive: true });

            const ext = file.name.split(".").pop();
            const filename = `${cost.id}-${Date.now()}.${ext}`;
            const filePath = join(uploadDir, filename);

            await writeFile(filePath, buffer);

            const relativePath = `/uploads/custos/${filename}`;

            await prisma.cost.update({
                where: { id: cost.id },
                data: { attachment: relativePath }
            });
        }

        revalidatePath("/custos");
        return { success: true };
    } catch (error) {
        console.error("Erro ao registrar custo:", error);
        return { success: false, error: "Erro ao registrar custo" };
    }
}

export async function updateCost(id: string, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const amountStr = formData.get("amount") as string;
        const dateStr = formData.get("date") as string;
        const type = (formData.get("type") as string) || "GERAL";
        const category = formData.get("category") as string;
        const barcode = formData.get("barcode") as string;
        const paymentMethod = formData.get("paymentMethod") as string;
        const pixKey = formData.get("pixKey") as string;
        const file = formData.get("file") as File | null;
        const removeAttachment = formData.get("removeAttachment") === "true";

        const amount = parseFloat(amountStr) || 0;
        const date = new Date(dateStr);

        let attachmentPath: string | null | undefined = undefined;

        if (removeAttachment) {
            attachmentPath = null;
        }

        if (file && file.size > 0) {
            const { writeFile, mkdir } = require("fs/promises");
            const { join } = require("path");

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploadDir = join(process.cwd(), "public", "uploads", "custos");
            await mkdir(uploadDir, { recursive: true });

            const ext = file.name.split(".").pop();
            const filename = `${id}-${Date.now()}.${ext}`;
            const filePath = join(uploadDir, filename);

            await writeFile(filePath, buffer);

            attachmentPath = `/uploads/custos/${filename}`;
        }

        await prisma.cost.update({
            where: { id },
            data: {
                name,
                amount,
                date,
                category,
                type,
                barcode: barcode || null,
                paymentMethod: paymentMethod || null,
                pixKey: pixKey || null,
                ...(attachmentPath !== undefined ? { attachment: attachmentPath } : {})
            },
        });
        revalidatePath("/custos");
        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar custo:", error);
        return { success: false, error: "Erro ao atualizar custo" };
    }
}

export async function deleteCost(id: string) {
    try {
        await prisma.cost.delete({ where: { id } });
        revalidatePath("/custos");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erro ao excluir custo" };
    }
}

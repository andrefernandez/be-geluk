import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getGlobalSettings } from "./actions";
import SettingsForm from "./SettingsForm";

export default async function TaxasTarifasPage() {
    const session = await getServerSession(authOptions);

    if (!session || ((session?.user as any)?.role !== "ADMIN" && (session?.user as any)?.role !== "MANAGER")) {
        redirect("/");
    }

    const settings = await getGlobalSettings();

    return (
        <div className="responsive-p" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header className="responsive-header-flex">
                <div>
                    <h1 className="text-gradient" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Taxas e Tarifas</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Tabela mestra de Taxas Matemáticas e Tarifas Bancárias</p>
                </div>
            </header>

            <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2rem", marginTop: "1rem" }}>
                <div className="glass-panel" style={{ flex: 1, padding: "2rem", maxWidth: "800px", alignSelf: "center", width: "100%" }}>
                    <SettingsForm initialData={settings as any} />
                </div>
            </main>
        </div>
    );
}

"use client";

import { useState } from "react";
import { createClient, updateClient, deleteClient } from "./actions";

type Client = {
    id: string;
    name: string;
    createdAt: Date;
    _count: { operations: number };
};

export default function ClientTable({ initialClients, currentUserRole }: { initialClients: Client[], currentUserRole: string }) {
    const [clients] = useState<Client[]>(initialClients);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    const handleOpenModal = (client?: Client) => {
        setErrorMsg("");
        if (client) {
            setEditingClient(client);
            setName(client.name);
        } else {
            setEditingClient(null);
            setName("");
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        let res;
        if (editingClient) {
            res = await updateClient(editingClient.id, { name });
        } else {
            res = await createClient({ name });
        }

        if (!res.success) {
            setErrorMsg(res.error || "Ocorreu um erro desconhecido.");
            setLoading(false);
        } else {
            window.location.reload();
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja deletar este cliente?")) {
            const res = await deleteClient(id);
            if (!res.success) {
                alert(res.error);
            } else {
                window.location.reload();
            }
        }
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Clientes Cadastrados</h2>
                {isAdminOrManager && (
                    <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                        + Novo Cliente
                    </button>
                )}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Nome da Empresa</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Operações</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Data Criação</th>
                            {isAdminOrManager && <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, textAlign: "right" }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((client) => (
                            <tr key={client.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)" }} className="hover-row">
                                <td style={{ padding: "1rem", fontWeight: 500 }}>{client.name}</td>
                                <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                                    <span style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", border: "1px solid var(--glass-border)" }}>
                                        {client._count.operations} registro(s)
                                    </span>
                                </td>
                                <td style={{ padding: "1rem", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                                    {new Date(client.createdAt).toLocaleDateString("pt-BR")}
                                </td>
                                {isAdminOrManager && (
                                    <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                        <button className="btn-secondary" onClick={() => handleOpenModal(client)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Editar</button>
                                        {client._count.operations === 0 && (
                                            <button onClick={() => handleDelete(client.id)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}>
                                                Excluir
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {clients.length === 0 && (
                    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                        Nenhum cliente cadastrado ainda.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingClient ? "Editar Cliente" : "Novo Cliente"}</h3>

                        {errorMsg && (
                            <div style={{ padding: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)", color: "var(--accent-red)", fontSize: "0.875rem" }}>
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Razão Social / Nome</label>
                                <input required className="glass-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Metalur" />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adding arbitrary hover style for rows */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .hover-row:hover { background-color: var(--glass-bg-hover); }
      `}} />
        </div>
    );
}

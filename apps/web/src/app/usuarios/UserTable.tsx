"use client";

import { useState } from "react";
import { createUser, updateUser, deleteUser } from "./actions";

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
};

export default function UserTable({ initialUsers, currentUserRole }: { initialUsers: User[], currentUserRole: string }) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "USER" });
    const [loading, setLoading] = useState(false);

    const isAdmin = currentUserRole === "ADMIN";

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({ name: user.name, email: user.email, password: "", role: user.role });
        } else {
            setEditingUser(null);
            setFormData({ name: "", email: "", password: "", role: "USER" });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (editingUser) {
            await updateUser(editingUser.id, formData);
        } else {
            await createUser(formData);
        }

        // Refresh should be handled by Next.js Server Actions revalidatePath, but doing hard reload here to showcase simple state
        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja deletar este usuário?")) {
            await deleteUser(id);
            window.location.reload();
        }
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Usuários Cadastrados</h2>
                {isAdmin && (
                    <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                        + Novo Usuário
                    </button>
                )}
            </div>

            <div className="desktop-only" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Nome</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Email</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Nível</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Data Criação</th>
                            {isAdmin && <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, textAlign: "right" }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)" }} className="hover-row">
                                <td style={{ padding: "1rem" }}>{user.name}</td>
                                <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{user.email}</td>
                                <td style={{ padding: "1rem" }}>
                                    <span style={{
                                        padding: "0.25rem 0.75rem",
                                        borderRadius: "99px",
                                        fontSize: "0.75rem",
                                        backgroundColor: user.role === "ADMIN" ? "rgba(16, 185, 129, 0.15)" : user.role === "MANAGER" ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                        color: user.role === "ADMIN" ? "var(--accent-primary)" : user.role === "MANAGER" ? "var(--accent-blue)" : "var(--text-primary)",
                                        border: `1px solid ${user.role === "ADMIN" ? "var(--accent-primary)" : user.role === "MANAGER" ? "var(--accent-blue)" : "var(--glass-border)"}`
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={{ padding: "1rem", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                                    {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                                </td>
                                {isAdmin && (
                                    <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                        <button className="btn-secondary" onClick={() => handleOpenModal(user)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Editar</button>
                                        {user.email !== "admin@begeluk.com" && (
                                            <button onClick={() => handleDelete(user.id)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}>
                                                Excluir
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {users.map(user => (
                    <div key={user.id} className="glass-card" onClick={() => isAdmin && handleOpenModal(user)} style={{ padding: "1.25rem", cursor: isAdmin ? "pointer" : "default" }}>
                        <div className="flex-between" style={{ alignItems: "flex-start", marginBottom: "0.75rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)" }}>{user.name}</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{user.email}</span>
                            </div>
                            <span style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                backgroundColor: user.role === "ADMIN" ? "rgba(16, 185, 129, 0.15)" : user.role === "MANAGER" ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                color: user.role === "ADMIN" ? "var(--accent-primary)" : user.role === "MANAGER" ? "var(--accent-blue)" : "var(--text-primary)",
                                border: `1px solid ${user.role === "ADMIN" ? "var(--accent-primary)" : user.role === "MANAGER" ? "var(--accent-blue)" : "var(--glass-border)"}`
                            }}>
                                {user.role}
                            </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Adicionado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "500px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingUser ? "Editar Usuário" : "Novo Usuário"}</h3>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Nome Completo</label>
                                <input required className="glass-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>E-mail</label>
                                <input required type="email" className="glass-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{editingUser ? "Nova Senha (deixe em branco para não alterar)" : "Senha"}</label>
                                <input required={!editingUser} type="password" className="glass-input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Nível de Acesso</label>
                                <select className="glass-input" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="USER">Operacional (USER)</option>
                                    <option value="MANAGER">Gerente (MANAGER)</option>
                                    <option value="ADMIN">Administrador (ADMIN)</option>
                                </select>
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

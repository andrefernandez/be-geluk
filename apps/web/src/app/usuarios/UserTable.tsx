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

const getRoleBadge = (role: string) => {
    switch (role) {
        case "ADMIN":
            return { bg: "rgba(16, 185, 129, 0.15)", color: "var(--accent-primary)", border: "var(--accent-primary)", label: "ADMIN" };
        case "MANAGER":
            return { bg: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)", border: "var(--accent-blue)", label: "GERENTE" };
        case "PARCEIRO":
            return { bg: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "rgba(168, 85, 247, 0.4)", label: "PARCEIRO" };
        case "COMERCIAL":
            return { bg: "rgba(14, 165, 233, 0.15)", color: "#38bdf8", border: "rgba(14, 165, 233, 0.4)", label: "COMERCIAL" };
        case "CONTADOR":
            return { bg: "rgba(245, 158, 11, 0.15)", color: "var(--accent-orange)", border: "var(--accent-orange)", label: "CONTADOR" };
        case "INVESTOR":
            return { bg: "rgba(236, 72, 153, 0.15)", color: "#ec4899", border: "#ec4899", label: "INVESTIDOR" };
        default:
            return { bg: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)", border: "var(--glass-border)", label: role || "OPERACIONAL" };
    }
};

export default function UserTable({ initialUsers, currentUserRole }: { initialUsers: User[], currentUserRole: string }) {
    const [users] = useState<User[]>(initialUsers);
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "PARCEIRO" });
    const [loading, setLoading] = useState(false);

    const isAdmin = currentUserRole === "ADMIN";

    const filteredUsers = selectedRoleFilter === "ALL" 
        ? users 
        : users.filter(u => u.role === selectedRoleFilter);

    const roleCounts = {
        ALL: users.length,
        PARCEIRO: users.filter(u => u.role === "PARCEIRO").length,
        COMERCIAL: users.filter(u => u.role === "COMERCIAL").length,
        MANAGER: users.filter(u => u.role === "MANAGER").length,
        ADMIN: users.filter(u => u.role === "ADMIN").length,
        USER: users.filter(u => u.role === "USER").length,
    };

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({ name: user.name, email: user.email, password: "", role: user.role });
        } else {
            setEditingUser(null);
            setFormData({ name: "", email: "", password: "", role: selectedRoleFilter !== "ALL" ? selectedRoleFilter : "PARCEIRO" });
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

        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja deletar este usuário?")) {
            await deleteUser(id);
            window.location.reload();
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>Usuários Cadastrados</h2>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        Gerenciamento de acessos e níveis (Parceiros comissionados, Comercial, Gestores e Administradores)
                    </p>
                </div>
                {isAdmin && (
                    <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                        <span>+</span> Novo Usuário
                    </button>
                )}
            </div>

            {/* Filtros por Nível de Usuário */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0.25rem", background: "var(--bg-tertiary, rgba(255,255,255,0.03))", borderRadius: "var(--radius-sm)" }}>
                {[
                    { key: "ALL", label: "Todos", count: roleCounts.ALL },
                    { key: "PARCEIRO", label: "Parceiros", count: roleCounts.PARCEIRO },
                    { key: "COMERCIAL", label: "Comercial", count: roleCounts.COMERCIAL },
                    { key: "MANAGER", label: "Gerentes", count: roleCounts.MANAGER },
                    { key: "ADMIN", label: "Administradores", count: roleCounts.ADMIN },
                    { key: "USER", label: "Operacional", count: roleCounts.USER },
                ].map(tab => {
                    const isSelected = selectedRoleFilter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setSelectedRoleFilter(tab.key)}
                            style={{
                                padding: "0.4rem 0.75rem",
                                borderRadius: "var(--radius-xs)",
                                fontSize: "0.75rem",
                                fontWeight: isSelected ? 700 : 500,
                                background: isSelected ? "var(--accent-primary, #10b981)" : "transparent",
                                color: isSelected ? "#000" : "var(--text-secondary)",
                                border: "none",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                transition: "all var(--transition-fast)"
                            }}
                        >
                            <span>{tab.label}</span>
                            <span style={{
                                fontSize: "0.6875rem",
                                padding: "0.1rem 0.35rem",
                                borderRadius: "99px",
                                background: isSelected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.06)",
                                color: isSelected ? "#000" : "var(--text-tertiary)"
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Desktop Table */}
            <div className="desktop-only" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Nome</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Email</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Nível de Acesso</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Data Criação</th>
                            {isAdmin && <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, textAlign: "right" }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => {
                            const badge = getRoleBadge(user.role);
                            return (
                                <tr key={user.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)" }} className="hover-row">
                                    <td style={{ padding: "1rem" }}>
                                        <strong style={{ color: "var(--text-primary)" }}>{user.name}</strong>
                                    </td>
                                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{user.email}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{
                                            padding: "0.25rem 0.75rem",
                                            borderRadius: "99px",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            backgroundColor: badge.bg,
                                            color: badge.color,
                                            border: `1px solid ${badge.border}`
                                        }}>
                                            {badge.label}
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
                            );
                        })}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? 5 : 4} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                                    Nenhum usuário encontrado neste nível.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredUsers.map(user => {
                    const badge = getRoleBadge(user.role);
                    return (
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
                                    fontWeight: 700,
                                    backgroundColor: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`
                                }}>
                                    {badge.label}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Adicionado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                        </div>
                    );
                })}
                {filteredUsers.length === 0 && (
                    <div className="glass-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                        Nenhum usuário encontrado neste nível.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "520px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{editingUser ? "Editar Usuário" : "Novo Usuário"}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: "1.25rem" }}>✕</button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>Nome Completo</label>
                                <input required className="glass-input" placeholder="Ex: Roberto Silva" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>E-mail de Acesso</label>
                                <input required type="email" className="glass-input" placeholder="roberto@parceiro.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>{editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso"}</label>
                                <input required={!editingUser} type="password" className="glass-input" placeholder="******" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>Nível de Acesso (Perfil)</label>
                                <select 
                                    className="glass-input" 
                                    value={formData.role} 
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    style={{ backgroundColor: "var(--bg-secondary, #1a1a1a)", color: "#fff" }}
                                >
                                    <option value="PARCEIRO" style={{ backgroundColor: "#1a1a1a", color: "#c084fc" }}>🟣 Parceiro (Comissões)</option>
                                    <option value="COMERCIAL" style={{ backgroundColor: "#1a1a1a", color: "#38bdf8" }}>🔵 Comercial (Representante)</option>
                                    <option value="MANAGER" style={{ backgroundColor: "#1a1a1a", color: "#60a5fa" }}>🟢 Gerente (MANAGER)</option>
                                    <option value="ADMIN" style={{ backgroundColor: "#1a1a1a", color: "#10b981" }}>🟡 Administrador (ADMIN)</option>
                                    <option value="CONTADOR" style={{ backgroundColor: "#1a1a1a", color: "#f59e0b" }}>🟠 Contador (Custos)</option>
                                    <option value="USER" style={{ backgroundColor: "#1a1a1a", color: "#fff" }}>⚪ Operacional (USER)</option>
                                </select>
                                {formData.role === "PARCEIRO" && (
                                    <span style={{ fontSize: "0.75rem", color: "#c084fc", marginTop: "0.2rem" }}>
                                        ✦ Usuários com perfil <strong>Parceiro</strong> podem ser vinculados a cedentes para receber comissões pelas operações realizadas.
                                    </span>
                                )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar Usuário"}</button>
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

"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle, Circle, ClipboardList } from "lucide-react";
import { createBo, deleteBo, toggleBoStatus } from "./actions";

interface Bo {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
}

interface BoListProps {
    initialTodos: Bo[];
}

export default function BoList({ initialTodos }: BoListProps) {
    const [bos, setBos] = useState(initialTodos);
    const [isAdding, setIsAdding] = useState(false);
    const [newBo, setNewBo] = useState({ title: "", description: "" });
    const [loading, setLoading] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBo.title.trim()) return;

        setLoading(true);
        const result = await createBo(newBo);
        if (result.success && result.todo) {
            setBos([result.todo as Bo, ...bos]);
            setNewBo({ title: "", description: "" });
            setIsAdding(false);
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    const handleToggle = async (id: string, currentStatus: string) => {
        // Optimistic update
        const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
        setBos(bos.map(t => t.id === id ? { ...t, status: newStatus } : t));

        const result = await toggleBoStatus(id, currentStatus);
        if (!result.success) {
            // Revert on failure
            setBos(bos.map(t => t.id === id ? { ...t, status: currentStatus } : t));
            alert(result.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este B.o?")) return;

        const originalBos = [...bos];
        setBos(bos.filter(t => t.id !== id));

        const result = await deleteBo(id);
        if (!result.success) {
            setBos(originalBos);
            alert(result.error);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>B.o's Pendentes</h2>
                <button className="btn-primary" onClick={() => setIsAdding(true)}>
                    <Plus size={18} />
                    <span>Novo B.o</span>
                </button>
            </div>

            {isAdding && (
                <div className="glass-panel" style={{ padding: "1.5rem", border: "1px solid var(--accent-primary)" }}>
                    <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Título</label>
                            <input
                                required
                                className="glass-input"
                                value={newBo.title}
                                onChange={e => setNewBo({ ...newBo, title: e.target.value })}
                                placeholder="Ex: Cobrar o Moretti"
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Descrição (Opcional)</label>
                            <textarea
                                className="glass-input"
                                value={newBo.description}
                                onChange={e => setNewBo({ ...newBo, description: e.target.value })}
                                placeholder="Detalhes sobre o B.o..."
                                rows={3}
                                style={{ resize: "none" }}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? "Salvando..." : "Criar B.o"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {bos.map((bo) => (
                    <div
                        key={bo.id}
                        className="glass-panel"
                        style={{
                            padding: "1rem 1.5rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            opacity: bo.status === "CLOSED" ? 0.6 : 1,
                            transition: "all 0.3s ease",
                            borderLeft: bo.status === "OPEN" ? "4px solid var(--accent-secondary)" : "4px solid var(--card-border)"
                        }}
                    >
                        <button
                            onClick={() => handleToggle(bo.id, bo.status)}
                            style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: bo.status === "CLOSED" ? "var(--accent-primary)" : "var(--text-tertiary)",
                                transition: "transform 0.2s"
                            }}
                            className="status-toggle"
                        >
                            {bo.status === "CLOSED" ? <CheckCircle size={24} /> : <Circle size={24} />}
                        </button>

                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                color: bo.status === "CLOSED" ? "var(--text-tertiary)" : "var(--text-primary)",
                                textDecoration: bo.status === "CLOSED" ? "line-through" : "none",
                                marginBottom: "0.25rem"
                            }}>
                                {bo.title}
                            </h3>
                            {bo.description && (
                                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                    {bo.description}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => handleDelete(bo.id)}
                            style={{
                                background: "none",
                                border: "none",
                                padding: "0.5rem",
                                cursor: "pointer",
                                color: "var(--accent-red)",
                                opacity: 0.4,
                                transition: "opacity 0.2s"
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                {bos.length === 0 && !isAdding && (
                    <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                        <ClipboardList size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
                        <p>Nenhum B.o pendente.</p>
                        <button
                            className="btn-secondary"
                            style={{ marginTop: "1rem" }}
                            onClick={() => setIsAdding(true)}
                        >
                            Criar primeiro B.o
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .status-toggle:hover {
                    transform: scale(1.1);
                }
            `}</style>
        </div>
    );
}

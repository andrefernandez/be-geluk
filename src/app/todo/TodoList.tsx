"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle, Circle, ClipboardList } from "lucide-react";
import { createTodo, deleteTodo, toggleTodoStatus } from "./actions";

interface Todo {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
}

interface TodoListProps {
    initialTodos: Todo[];
}

export default function TodoList({ initialTodos }: TodoListProps) {
    const [todos, setTodos] = useState(initialTodos);
    const [isAdding, setIsAdding] = useState(false);
    const [newTodo, setNewTodo] = useState({ title: "", description: "" });
    const [loading, setLoading] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.title.trim()) return;

        setLoading(true);
        const result = await createTodo(newTodo);
        if (result.success && result.todo) {
            setTodos([result.todo as Todo, ...todos]);
            setNewTodo({ title: "", description: "" });
            setIsAdding(false);
        } else {
            alert(result.error);
        }
        setLoading(false);
    };

    const handleToggle = async (id: string, currentStatus: string) => {
        // Optimistic update
        const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
        setTodos(todos.map(t => t.id === id ? { ...t, status: newStatus } : t));

        const result = await toggleTodoStatus(id, currentStatus);
        if (!result.success) {
            // Revert on failure
            setTodos(todos.map(t => t.id === id ? { ...t, status: currentStatus } : t));
            alert(result.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

        const originalTodos = [...todos];
        setTodos(todos.filter(t => t.id !== id));

        const result = await deleteTodo(id);
        if (!result.success) {
            setTodos(originalTodos);
            alert(result.error);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>Tarefas Pendentes</h2>
                <button className="btn-primary" onClick={() => setIsAdding(true)}>
                    <Plus size={18} />
                    <span>Nova Tarefa</span>
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
                                value={newTodo.title}
                                onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
                                placeholder="Ex: Cobrar o Moretti"
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Descrição (Opcional)</label>
                            <textarea
                                className="glass-input"
                                value={newTodo.description}
                                onChange={e => setNewTodo({ ...newTodo, description: e.target.value })}
                                placeholder="Detalhes sobre a tarefa..."
                                rows={3}
                                style={{ resize: "none" }}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? "Salvando..." : "Criar Tarefa"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {todos.map((todo) => (
                    <div
                        key={todo.id}
                        className="glass-panel"
                        style={{
                            padding: "1rem 1.5rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            opacity: todo.status === "CLOSED" ? 0.6 : 1,
                            transition: "all 0.3s ease",
                            borderLeft: todo.status === "OPEN" ? "4px solid var(--accent-secondary)" : "4px solid var(--card-border)"
                        }}
                    >
                        <button
                            onClick={() => handleToggle(todo.id, todo.status)}
                            style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: todo.status === "CLOSED" ? "var(--accent-primary)" : "var(--text-tertiary)",
                                transition: "transform 0.2s"
                            }}
                            className="status-toggle"
                        >
                            {todo.status === "CLOSED" ? <CheckCircle size={24} /> : <Circle size={24} />}
                        </button>

                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                color: todo.status === "CLOSED" ? "var(--text-tertiary)" : "var(--text-primary)",
                                textDecoration: todo.status === "CLOSED" ? "line-through" : "none",
                                marginBottom: "0.25rem"
                            }}>
                                {todo.title}
                            </h3>
                            {todo.description && (
                                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                    {todo.description}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => handleDelete(todo.id)}
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

                {todos.length === 0 && !isAdding && (
                    <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                        <ClipboardList size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
                        <p>Nenhuma tarefa pendente.</p>
                        <button
                            className="btn-secondary"
                            style={{ marginTop: "1rem" }}
                            onClick={() => setIsAdding(true)}
                        >
                            Criar primeira tarefa
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

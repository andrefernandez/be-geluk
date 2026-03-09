"use client";

import { useState } from "react";
import { createCost, updateCost, deleteCost } from "./actions";
import { NumericFormat } from 'react-number-format';

type Cost = {
    id: string;
    name: string;
    amount: number;
    date: Date;
    category: string;
    type: string;
};

export default function CostTable({ initialCosts, currentUserRole }: { initialCosts: Cost[], currentUserRole: string }) {
    const costs = initialCosts;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<Cost | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const sumCosts = (onlySelected = false) => {
        const toSum = onlySelected && selectedIds.size > 0
            ? costs.filter(c => selectedIds.has(c.id))
            : costs;
        return toSum.reduce((acc, c) => acc + Math.round((Number(c.amount) || 0) * 100), 0) / 100;
    };

    const [formData, setFormData] = useState({ name: "", amount: "", date: new Date().toISOString().split("T")[0], category: "FIXO", type: "GERAL" });
    const [loading, setLoading] = useState(false);

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handleOpenModal = (cost?: Cost) => {
        if (cost) {
            setEditingCost(cost);
            setFormData({
                name: cost.name,
                amount: String(cost.amount),
                date: new Date(cost.date).toISOString().split("T")[0],
                category: cost.category,
                type: cost.type
            });
        } else {
            setEditingCost(null);
            setFormData({ name: "", amount: "", date: new Date().toISOString().split("T")[0], category: "FIXO", type: "GERAL" });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dataToSave = {
            ...formData,
            amount: Number(formData.amount),
            date: new Date(formData.date),
        };

        let result;
        if (editingCost) {
            result = await updateCost(editingCost.id, dataToSave);
        } else {
            result = await createCost(dataToSave);
        }

        if (result && result.success) {
            window.location.reload();
        } else {
            alert(result?.error || "Ocorreu um erro ao salvar!");
            console.error(result);
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta despesa?")) {
            await deleteCost(id);
            window.location.reload();
        }
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Lançamentos</h2>
                {isAdminOrManager && (
                    <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                        + Novo Custo
                    </button>
                )}
            </div>

            <div className="desktop-only" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Descrição</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Categoria</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Data</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Valor</th>
                            {isAdminOrManager && <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, textAlign: "right" }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {costs.map((cost) => {
                            const categoryColor = cost.category === "FIXO" ? "var(--accent-blue)" : cost.category === "VARIAVEL" ? "var(--accent-orange)" : cost.category === "INVESTIDORES" ? "var(--accent-primary)" : "var(--accent-red)";
                            const categoryBg = cost.category === "FIXO" ? "rgba(59, 130, 246, 0.1)" : cost.category === "VARIAVEL" ? "rgba(245, 158, 11, 0.1)" : cost.category === "INVESTIDORES" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";

                            return (
                                <tr key={cost.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)" }} className="hover-row">
                                    <td style={{ padding: "1rem", fontWeight: 500 }}>{cost.name} <br /><span style={{ fontSize: '0.75rem', color: "var(--text-tertiary)" }}>{cost.type}</span></td>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{
                                            backgroundColor: categoryBg,
                                            color: categoryColor,
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: "var(--radius-sm)",
                                            fontSize: "0.75rem",
                                            border: `1px solid ${categoryColor}`
                                        }}>
                                            {cost.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                                        {new Date(cost.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}
                                    </td>
                                    <td style={{ padding: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(cost.amount)}</td>

                                    {isAdminOrManager && (
                                        <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end", alignItems: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(cost.id)}
                                                onChange={() => toggleSelection(cost.id)}
                                                style={{ cursor: "pointer", width: "18px", height: "18px", accentColor: "var(--accent-primary)", marginRight: "0.25rem" }}
                                            />
                                            <button className="btn-secondary" onClick={() => handleOpenModal(cost)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Editar</button>
                                            <button onClick={() => handleDelete(cost.id)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}>
                                                Excluir
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                    {costs.length > 0 && (
                        <tfoot>
                            <tr style={{ borderTop: "2px solid var(--glass-border)", fontWeight: 600 }}>
                                <td style={{ padding: "1rem" }} colSpan={3}>Total</td>
                                <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatCurrency(sumCosts())}</td>
                                {isAdminOrManager && <td></td>}
                            </tr>
                            {selectedIds.size > 0 && (
                                <tr style={{ borderTop: "1px dashed var(--glass-border)", fontWeight: 600, backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                                    <td style={{ padding: "1rem", color: "var(--accent-primary)" }} colSpan={3}>Sel. ({selectedIds.size} itens)</td>
                                    <td style={{ padding: "1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumCosts(true))}</td>
                                    {isAdminOrManager && <td></td>}
                                </tr>
                            )}
                        </tfoot>
                    )}
                </table>

                {costs.length === 0 && (
                    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                        Nenhum custo cadastrado.
                    </div>
                )}
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {costs.map(cost => {
                    const categoryColor = cost.category === "FIXO" ? "var(--accent-blue)" : cost.category === "VARIAVEL" ? "var(--accent-orange)" : cost.category === "INVESTIDORES" ? "var(--accent-primary)" : "var(--accent-red)";
                    const categoryBg = cost.category === "FIXO" ? "rgba(59, 130, 246, 0.1)" : cost.category === "VARIAVEL" ? "rgba(245, 158, 11, 0.1)" : cost.category === "INVESTIDORES" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";

                    return (
                        <div key={cost.id} className="glass-card" onClick={() => isAdminOrManager && handleOpenModal(cost)} style={{ padding: "1.25rem", cursor: isAdminOrManager ? "pointer" : "default" }}>
                            <div className="flex-between" style={{ alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                    <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)" }}>{cost.name}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{new Date(cost.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}</span>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{formatCurrency(cost.amount)}</span>
                            </div>
                            <div className="flex-between">
                                <span style={{ backgroundColor: categoryBg, color: categoryColor, padding: "0.25rem 0.5rem", borderRadius: "100px", fontSize: "0.65rem", fontWeight: 700, border: `1px solid ${categoryColor}40` }}>
                                    {cost.category}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {costs.length > 0 && (
                    <div className="glass-card" style={{ padding: "1.25rem", marginTop: "0.5rem", backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <div className="flex-between">
                            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-secondary)" }}>Total Lançamentos</span>
                            <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--text-primary)" }}>{formatCurrency(sumCosts())}</span>
                        </div>
                    </div>
                )}
                {costs.length === 0 && (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                        Nenhum custo cadastrado.
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                        <div className="glass-card" style={{ width: "100%", maxWidth: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingCost ? "Editar Lançamento" : "Novo Custo"}</h3>

                            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Descrição</label>
                                    <input required className="glass-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Sistema Credit Hub" />
                                </div>

                                <div className="form-grid-2">
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data</label>
                                        <input required type="date" className="glass-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Valor (R$)</label>
                                        <NumericFormat
                                            required
                                            className="glass-input"
                                            value={formData.amount}
                                            thousandSeparator="."
                                            decimalSeparator=","
                                            decimalScale={2}
                                            fixedDecimalScale={true}
                                            prefix="R$ "
                                            onValueChange={(values: any) => {
                                                setFormData({ ...formData, amount: values.floatValue !== undefined ? String(values.floatValue) : "" })
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Categoria</label>
                                        <select className="glass-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            <option value="FIXO">Custo Fixo</option>
                                            <option value="VARIAVEL">Custo Variável</option>
                                            <option value="IMPOSTO">Imposto</option>
                                            <option value="INVESTIDORES">Investidores</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Adding arbitrary hover style for rows */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .hover-row:hover { background-color: var(--glass-bg-hover); }
      `}} />
        </div >
    );
}

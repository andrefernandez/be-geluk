"use client";

import { useState } from "react";
import { createOperation, deleteOperation, updateOperation } from "./actions";
import { NumericFormat } from 'react-number-format';

export default function OperationTable({ initialOperations, clients, currentUserRole }: { initialOperations: any[], clients: any[], currentUserRole: string }) {
    const operations = initialOperations;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    const [formData, setFormData] = useState({
        clientId: "",
        date: new Date().toISOString().split("T")[0],
        valorBruto: "",
        fator: "",
        percentual: "",
        percentualPrazo: "",
        dias: "",
        tarifas: "",
        percentualTarifas: "",
        adValorem: "",
        percentualAdValorem: "",
        irpj: "",
        iof: "",
        iofAdicional: "",
        valorLiquido: "",
        recompra: "",
        declarada: false
    });

    const formatCurrency = (val: number | null) => {
        if (val === null || val === undefined) return "-";
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatPercent = (val: number | null) => {
        if (val === null || val === undefined) return "-";
        return `${val.toFixed(2)}%`;
    };

    const sumColumn = (key: keyof typeof operations[0], onlySelected = false) => {
        const opsToSum = onlySelected && selectedIds.size > 0
            ? operations.filter(op => selectedIds.has(op.id))
            : operations;
        return opsToSum.reduce((acc, op) => {
            const val = Number(op[key]) || 0;
            return acc + Math.round(val * 100);
        }, 0) / 100;
    };

    const calculateAverageDays = (onlySelected = false) => {
        const opsToCalc = onlySelected && selectedIds.size > 0
            ? operations.filter(op => selectedIds.has(op.id))
            : operations;

        const totalBruto = opsToCalc.reduce((acc, op) => acc + (Number(op.valorBruto) || 0), 0);
        if (totalBruto === 0) return 0;

        const weightedDays = opsToCalc.reduce((acc, op) => {
            const bruto = Number(op.valorBruto) || 0;
            const dias = Number(op.dias) || 0;
            return acc + (bruto * dias);
        }, 0);

        return weightedDays / totalBruto;
    };

    const calculateWeightedAveragePercent = (key: "percentual" | "percentualTarifas" | "percentualAdValorem", onlySelected = false) => {
        const opsToCalc = onlySelected && selectedIds.size > 0
            ? operations.filter(op => selectedIds.has(op.id))
            : operations;

        const totalBruto = opsToCalc.reduce((acc, op) => acc + (Number(op.valorBruto) || 0), 0);
        if (totalBruto === 0) return 0;

        const weightedPercent = opsToCalc.reduce((acc, op) => {
            const bruto = Number(op.valorBruto) || 0;
            const percent = Number(op[key]) || 0;
            return acc + (bruto * percent);
        }, 0);

        return weightedPercent / totalBruto;
    };

    const handleOpenModal = () => {
        setEditingId(null);
        setFormData({
            clientId: clients.length > 0 ? clients[0].id : "",
            date: new Date().toISOString().split("T")[0],
            valorBruto: "", fator: "", percentual: "", percentualPrazo: "", dias: "",
            tarifas: "", percentualTarifas: "", adValorem: "", percentualAdValorem: "",
            irpj: "", iof: "", iofAdicional: "", valorLiquido: "", recompra: "", declarada: false
        });
        setIsModalOpen(true);
    };

    const handleEdit = (op: any) => {
        setEditingId(op.id);
        const dateStr = new Date(op.date).toISOString().split("T")[0];
        setFormData({
            clientId: op.clientId,
            date: dateStr,
            valorBruto: op.valorBruto?.toString() || "",
            fator: op.fator?.toString() || "",
            percentual: op.percentual?.toString() || "",
            percentualPrazo: op.percentualPrazo?.toString() || "",
            dias: op.dias?.toString() || "",
            tarifas: op.tarifas?.toString() || "",
            percentualTarifas: op.percentualTarifas?.toString() || "",
            adValorem: op.adValorem?.toString() || "",
            percentualAdValorem: op.percentualAdValorem?.toString() || "",
            irpj: op.irpj?.toString() || "",
            iof: op.iof?.toString() || "",
            iofAdicional: op.iofAdicional?.toString() || "",
            valorLiquido: op.valorLiquido?.toString() || "",
            recompra: op.recompra?.toString() || "",
            declarada: op.declarada ?? false,
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clientId) {
            alert("Selecione um cliente.");
            return;
        }
        setLoading(true);

        const payload = {
            ...formData,
            date: new Date(formData.date),
            valorBruto: Number(formData.valorBruto),
            fator: Number(formData.fator),
            percentual: Number(formData.percentual),
            percentualPrazo: Number(formData.percentualPrazo),
            dias: Number(formData.dias),
            tarifas: Number(formData.tarifas),
            percentualTarifas: formData.percentualTarifas ? Number(formData.percentualTarifas) : null,
            adValorem: Number(formData.adValorem),
            percentualAdValorem: formData.percentualAdValorem ? Number(formData.percentualAdValorem) : null,
            irpj: formData.irpj ? Number(formData.irpj) : null,
            iof: formData.iof ? Number(formData.iof) : null,
            iofAdicional: formData.iofAdicional ? Number(formData.iofAdicional) : null,
            valorLiquido: Number(formData.valorLiquido),
            recompra: formData.recompra ? Number(formData.recompra) : null,
            declarada: formData.declarada,
        };

        if (editingId) {
            await updateOperation(editingId, payload);
        } else {
            await createOperation(payload);
        }
        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta operação?")) {
            await deleteOperation(id);
            window.location.reload();
        }
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "1.5rem" }}>
                {isAdminOrManager && (
                    <button className="btn-primary" onClick={handleOpenModal} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                        + Nova Operação
                    </button>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Nº de Operações</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{operations.length}</span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Total Bruto</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(sumColumn("valorBruto"))}</span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Valor Líquido</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("valorLiquido"))}</span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Taxa Média</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{formatPercent(calculateWeightedAveragePercent("percentual"))}</span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Taxa Total Média</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatPercent(
                            calculateWeightedAveragePercent("percentual") +
                            calculateWeightedAveragePercent("percentualTarifas") +
                            calculateWeightedAveragePercent("percentualAdValorem")
                        )}
                    </span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Prazo Médio</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{calculateAverageDays().toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>Dias</span></span>
                </div>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border-light)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Data</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Cliente</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, borderLeft: "1px dashed var(--glass-border)" }}>Bruto Operação</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Fator</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Dias</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, borderLeft: "1px dashed var(--glass-border)" }}>Tarifas</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Ad Valorem</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>IOF</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>IOF Adic.</th>
                            <th style={{ padding: "1rem", color: "var(--accent-primary)", fontWeight: 500, borderLeft: "1px dashed var(--glass-border)" }}>Valor Líquido</th>
                            <th style={{ padding: "1rem", color: "var(--accent-red)", fontWeight: 500 }}>Recompra</th>
                            {isAdminOrManager && <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, textAlign: "right" }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {operations.map((op) => (
                            <tr key={op.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)", fontSize: "0.875rem" }} className="hover-row">
                                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{new Date(op.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}</td>
                                <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>{op.client.name}</td>

                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(op.valorBruto)}</td>
                                <td style={{ padding: "0.75rem 1rem", color: "var(--text-tertiary)" }}>{formatCurrency(op.fator)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{op.dias}</td>

                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(op.tarifas)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(op.adValorem)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(op.iof)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(op.iofAdicional)}</td>

                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", fontWeight: 600, color: "var(--accent-primary)" }}>{formatCurrency(op.valorLiquido)}</td>
                                <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: op.recompra ? "var(--accent-red)" : "inherit" }}>{op.recompra ? formatCurrency(op.recompra) : "-"}</td>

                                {isAdminOrManager && (
                                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", alignItems: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(op.id)}
                                                onChange={() => toggleSelection(op.id)}
                                                style={{ cursor: "pointer", width: "18px", height: "18px", accentColor: "var(--accent-primary)", marginRight: "0.25rem" }}
                                            />
                                            <button onClick={() => handleEdit(op)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--accent-primary)", border: "1px solid var(--accent-primary)", borderRadius: "var(--radius-sm)" }}>
                                                Editar
                                            </button>
                                            <button onClick={() => handleDelete(op.id)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}>
                                                Excluir
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    {operations.length > 0 && (
                        <tfoot>
                            <tr style={{ borderTop: "2px solid var(--glass-border)", fontWeight: 600 }}>
                                <td style={{ padding: "0.75rem 1rem" }} colSpan={2}>Total</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(sumColumn("valorBruto"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("fator"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{calculateAverageDays().toFixed(1)} d</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(sumColumn("tarifas"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("adValorem"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("iof"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("iofAdicional"))}</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("valorLiquido"))}</td>
                                <td style={{ padding: "0.75rem 1rem", color: "var(--accent-red)" }}>{formatCurrency(sumColumn("recompra"))}</td>
                                {isAdminOrManager && <td></td>}
                            </tr>
                            {selectedIds.size > 0 && (
                                <tr style={{ borderTop: "1px dashed var(--glass-border)", fontWeight: 600, backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }} colSpan={2}>Sel. ({selectedIds.size} itens)</td>
                                    <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("valorBruto", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("fator", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{calculateAverageDays(true).toFixed(1)} d</td>
                                    <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("tarifas", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("adValorem", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("iof", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("iofAdicional", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--text-primary)" }}>{formatCurrency(sumColumn("valorLiquido", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-red)" }}>{formatCurrency(sumColumn("recompra", true))}</td>
                                    {isAdminOrManager && <td></td>}
                                </tr>
                            )}
                        </tfoot>
                    )}
                </table>
                {operations.length === 0 && (
                    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>Nenhuma operação cadastrada.</div>
                )}
            </div>

            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "800px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxHeight: "90vh", overflowY: "auto" }}>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingId ? "Editar Operação" : "Nova Operação"}</h3>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data</label>
                                    <input required type="date" className="glass-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Cliente</label>
                                    <select required className="glass-input" value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Bruto Operação (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.valorBruto} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const bruto = v.floatValue || 0;
                                        const fator = parseFloat(formData.fator) || 0;
                                        const tarifas = parseFloat(formData.tarifas) || 0;
                                        const adValorem = parseFloat(formData.adValorem) || 0;
                                        const dias = parseFloat(formData.dias) || 0;

                                        const dateObj = new Date(formData.date);
                                        const daysInMonth = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, 0).getDate();

                                        setFormData({
                                            ...formData,
                                            valorBruto: v.floatValue !== undefined ? String(v.floatValue) : "",
                                            percentual: (bruto > 0 && dias > 0) ? (((fator / bruto) / dias) * daysInMonth * 100).toFixed(2) : "",
                                            percentualTarifas: bruto > 0 ? ((tarifas / bruto) * 100).toFixed(2) : "",
                                            percentualAdValorem: bruto > 0 ? ((adValorem / bruto) * 100).toFixed(2) : ""
                                        });
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Fator (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.fator} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const fator = v.floatValue || 0;
                                        const bruto = parseFloat(formData.valorBruto) || 0;
                                        const dias = parseFloat(formData.dias) || 0;

                                        const dateObj = new Date(formData.date);
                                        const daysInMonth = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, 0).getDate();

                                        setFormData({
                                            ...formData,
                                            fator: v.floatValue !== undefined ? String(v.floatValue) : "",
                                            percentual: (bruto > 0 && dias > 0) ? (((fator / bruto) / dias) * daysInMonth * 100).toFixed(2) : ""
                                        });
                                    }} />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Dias</label>
                                    <input required type="number" className="glass-input" value={formData.dias} onChange={e => {
                                        const dias = parseFloat(e.target.value) || 0;
                                        const bruto = parseFloat(formData.valorBruto) || 0;
                                        const fator = parseFloat(formData.fator) || 0;

                                        const dateObj = new Date(formData.date);
                                        const daysInMonth = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, 0).getDate();

                                        setFormData({
                                            ...formData,
                                            dias: e.target.value,
                                            percentual: (bruto > 0 && dias > 0) ? (((fator / bruto) / dias) * daysInMonth * 100).toFixed(2) : ""
                                        });
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Tarifas (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.tarifas} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const tarifas = v.floatValue || 0;
                                        const bruto = parseFloat(formData.valorBruto) || 0;
                                        setFormData({
                                            ...formData,
                                            tarifas: v.floatValue !== undefined ? String(v.floatValue) : "",
                                            percentualTarifas: bruto > 0 ? ((tarifas / bruto) * 100).toFixed(2) : ""
                                        });
                                    }} />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Ad Valorem (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.adValorem} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const adValorem = v.floatValue || 0;
                                        const bruto = parseFloat(formData.valorBruto) || 0;
                                        setFormData({
                                            ...formData,
                                            adValorem: v.floatValue !== undefined ? String(v.floatValue) : "",
                                            percentualAdValorem: bruto > 0 ? ((adValorem / bruto) * 100).toFixed(2) : ""
                                        });
                                    }} />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IRPJ</label>
                                    <NumericFormat className="glass-input" value={formData.irpj} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => setFormData({ ...formData, irpj: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF</label>
                                    <NumericFormat className="glass-input" value={formData.iof} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => setFormData({ ...formData, iof: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF Adicional</label>
                                    <NumericFormat className="glass-input" value={formData.iofAdicional} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => setFormData({ ...formData, iofAdicional: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--accent-primary)", fontWeight: 600 }}>Valor Líquido (R$)</label>
                                    <NumericFormat required className="glass-input" style={{ borderColor: "var(--accent-primary)" }} value={formData.valorLiquido} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => setFormData({ ...formData, valorLiquido: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--accent-red)", fontWeight: 600 }}>Recompra (R$)</label>
                                    <NumericFormat className="glass-input" style={{ borderColor: "var(--accent-red)" }} value={formData.recompra} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => setFormData({ ...formData, recompra: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                                <input
                                    type="checkbox"
                                    id="declarada"
                                    checked={formData.declarada}
                                    onChange={(e) => setFormData({ ...formData, declarada: e.target.checked })}
                                    style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)", cursor: "pointer" }}
                                />
                                <label htmlFor="declarada" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>
                                    Operação Declarada/Contabilizada
                                </label>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : (editingId ? "Atualizar Operação" : "Salvar Operação")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
            .hover - row:hover { background - color: var(--glass - bg - hover); }
        `}} />
        </div>
    );
}

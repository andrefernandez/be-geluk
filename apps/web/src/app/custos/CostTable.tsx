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
    barcode?: string | null;
    attachment?: string | null;
    paymentMethod?: string | null;
    pixKey?: string | null;
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

    const [formData, setFormData] = useState({ name: "", amount: "", date: new Date().toISOString().split("T")[0], category: "FIXO", type: "GERAL", barcode: "", attachment: "", paymentMethod: "BOLETO", pixKey: "" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [removeAttachment, setRemoveAttachment] = useState(false);
    const [loading, setLoading] = useState(false);

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handleOpenModal = (cost?: Cost) => {
        setSelectedFile(null);
        setRemoveAttachment(false);
        if (cost) {
            setEditingCost(cost);
            setFormData({
                name: cost.name,
                amount: String(cost.amount),
                date: new Date(cost.date).toISOString().split("T")[0],
                category: cost.category,
                type: cost.type,
                barcode: cost.barcode || "",
                attachment: cost.attachment || "",
                paymentMethod: cost.paymentMethod || "BOLETO",
                pixKey: cost.pixKey || ""
            });
        } else {
            setEditingCost(null);
            setFormData({
                name: "",
                amount: "",
                date: new Date().toISOString().split("T")[0],
                category: "FIXO",
                type: "GERAL",
                barcode: "",
                attachment: "",
                paymentMethod: "BOLETO",
                pixKey: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formDataObj = new FormData();
        formDataObj.append("name", formData.name);
        formDataObj.append("amount", formData.amount);
        formDataObj.append("date", formData.date);
        formDataObj.append("category", formData.category);
        formDataObj.append("type", formData.type);
        formDataObj.append("barcode", formData.barcode);
        formDataObj.append("paymentMethod", formData.paymentMethod);
        formDataObj.append("pixKey", formData.pixKey);
        if (selectedFile) {
            formDataObj.append("file", selectedFile);
        }
        if (editingCost && removeAttachment) {
            formDataObj.append("removeAttachment", "true");
        }

        let result;
        if (editingCost) {
            result = await updateCost(editingCost.id, formDataObj);
        } else {
            result = await createCost(formDataObj);
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

    const handleExportExcel = () => {
        // Read the month parameter from URL to matching export
        const params = new URLSearchParams(window.location.search);
        let month = params.get("month");
        
        // If no month in URL, try to get from cookies pattern or default
        if (!month) {
            const match = document.cookie.match(/(^| )selectedMonth=([^;]+)/);
            if (match) month = match[2];
        }

        const url = `/api/export${month ? "?month=" + month : ""}`;
        window.location.href = url;
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Lançamentos</h2>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button className="btn-secondary" onClick={handleExportExcel} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Exportar Excel
                    </button>
                    {isAdminOrManager && (
                        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                            + Novo Custo
                        </button>
                    )}
                </div>
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
                                    <td style={{ padding: "1rem", fontWeight: 500 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <span>{cost.name}</span>
                                            {cost.attachment && (
                                                <a href={cost.attachment} target="_blank" rel="noopener noreferrer" title="Visualizar Comprovante/Anexo" style={{ display: "inline-flex", alignItems: "center", color: "var(--accent-primary)", textDecoration: "none" }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                </a>
                                            )}
                                        </div>
                                        {cost.paymentMethod === "PIX" && cost.pixKey ? (
                                            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                                PIX: <code style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.1rem 0.25rem", borderRadius: "2px" }}>{cost.pixKey}</code>
                                            </span>
                                        ) : cost.barcode ? (
                                            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                                Boleto: <code style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.1rem 0.25rem", borderRadius: "2px" }}>{cost.barcode}</code>
                                            </span>
                                        ) : null}
                                        <span style={{ fontSize: '0.75rem', color: "var(--text-tertiary)", display: "block", marginTop: "0.15rem" }}>{cost.type}</span>
                                    </td>
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
                                        <td style={{ padding: "1rem", textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", alignItems: "center" }}>
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
                                            </div>
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
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)" }}>{cost.name}</span>
                                        {cost.attachment && (
                                            <a href={cost.attachment} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" title="Visualizar Comprovante/Anexo" style={{ display: "inline-flex", alignItems: "center", color: "var(--accent-primary)" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                            </a>
                                        )}
                                    </div>
                                    {cost.paymentMethod === "PIX" && cost.pixKey ? (
                                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                                            PIX: <code style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.1rem 0.25rem", borderRadius: "2px" }}>{cost.pixKey}</code>
                                        </span>
                                    ) : cost.barcode ? (
                                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                                            Boleto: <code style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.1rem 0.25rem", borderRadius: "2px" }}>{cost.barcode}</code>
                                        </span>
                                    ) : null}
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
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Forma de Pagamento</label>
                                        <select className="glass-input" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                                            <option value="BOLETO">Boleto Bancário</option>
                                            <option value="PIX">Chave PIX</option>
                                            <option value="OUTRO">Outros</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.paymentMethod === "BOLETO" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Linha Digitável do Boleto</label>
                                        <input className="glass-input" value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} placeholder="Ex: 34191.79001 01043.513184..." />
                                    </div>
                                )}

                                {formData.paymentMethod === "PIX" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Chave PIX para Pagamento</label>
                                        <input className="glass-input" value={formData.pixKey} onChange={e => setFormData({ ...formData, pixKey: e.target.value })} placeholder="Digite a chave PIX (CNPJ, Celular, E-mail ou Aleatória)" />
                                    </div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Comprovante / Anexo (PDF ou Imagem)</label>
                                    {formData.attachment && !removeAttachment ? (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px dashed var(--glass-border)", borderRadius: "var(--radius-sm)" }}>
                                            <a href={formData.attachment} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--accent-primary)", display: "inline-flex", alignItems: "center", gap: "0.25rem", textDecoration: "underline" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                Visualizar Anexo Atual
                                            </a>
                                            <button type="button" onClick={() => setRemoveAttachment(true)} style={{ background: "transparent", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                Remover Anexo
                                            </button>
                                        </div>
                                    ) : (
                                        <input type="file" accept="image/*,application/pdf" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-secondary)",
                                            backgroundColor: "rgba(255, 255, 255, 0.01)",
                                            border: "1px dashed var(--glass-border)",
                                            padding: "0.5rem",
                                            borderRadius: "var(--radius-sm)",
                                            cursor: "pointer"
                                        }} />
                                    )}
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

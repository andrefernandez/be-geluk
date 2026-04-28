"use client";

import { useState } from "react";
import { createClient, updateClient, deleteClient, updateClientStatus } from "./actions";
import { NumericFormat } from 'react-number-format';

type Client = {
    id: string;
    name: string;
    cnpj?: string | null;
    status: string;
    createdAt: Date;
    representativeId?: string | null;
    representative?: { name: string } | null;
    taxaFator?: number | null;
    taxaAdValorem?: number | null;
    taxaTarifa?: number | null;
    _count: { 
        operations: number;
        agreements: number;
    };
};

type Rep = { id: string; name: string; role: string };

export default function ClientTable({ initialClients, currentUserRole, currentUserId, representatives }: { initialClients: Client[], currentUserRole: string, currentUserId: string, representatives: Rep[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [representativeId, setRepresentativeId] = useState("");
    const [taxaFator, setTaxaFator] = useState("");
    const [taxaAdValorem, setTaxaAdValorem] = useState("");
    const [taxaTarifa, setTaxaTarifa] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";
    const isComercial = currentUserRole === "COMERCIAL";
    const [searchTerm, setSearchTerm] = useState("");

    const filteredInitialClients = initialClients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cnpj && c.cnpj.includes(searchTerm))
    );

    const pendingClients = filteredInitialClients.filter(c => c.status === "PENDENTE");
    const otherClients = filteredInitialClients.filter(c => c.status !== "PENDENTE");

    const handleOpenModal = (client?: Client) => {
        setErrorMsg("");
        if (client) {
            setEditingClient(client);
            setName(client.name);
            setCnpj(client.cnpj || "");
            setRepresentativeId(client.representativeId || "");
            setTaxaFator(client.taxaFator ? client.taxaFator.toString() : "");
            setTaxaAdValorem(client.taxaAdValorem ? client.taxaAdValorem.toString() : "");
            setTaxaTarifa(client.taxaTarifa ? client.taxaTarifa.toString() : "");
        } else {
            setEditingClient(null);
            setName("");
            setCnpj("");
            setRepresentativeId(isComercial ? currentUserId : "");
            setTaxaFator("");
            setTaxaAdValorem("");
            setTaxaTarifa("");
        }
        setConfirmingId(null);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        let res;
        const status = isComercial ? "PENDENTE" : (editingClient?.status || "ATIVO");

        const tFator = taxaFator ? parseFloat(taxaFator) : undefined;
        const tAdValorem = taxaAdValorem ? parseFloat(taxaAdValorem) : undefined;
        const tTarifa = taxaTarifa ? parseFloat(taxaTarifa) : undefined;

        if (editingClient) {
            res = await updateClient(editingClient.id, { name, cnpj, status, representativeId, taxaFator: tFator, taxaAdValorem: tAdValorem, taxaTarifa: tTarifa });
        } else {
            res = await createClient({ name, cnpj, status, representativeId, taxaFator: tFator, taxaAdValorem: tAdValorem, taxaTarifa: tTarifa });
        }

        if (!res.success) {
            setErrorMsg(res.error || "Ocorreu um erro desconhecido.");
            setLoading(false);
        } else {
            window.location.reload();
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Se ainda não clicou uma vez, entra no estado de confirmação
        if (confirmingId !== id) {
            setConfirmingId(id);
            // Resetar após 3 segundos se não confirmar
            setTimeout(() => setConfirmingId(prev => prev === id ? null : prev), 3000);
            return;
        }

        // Se já estava no estado de confirmação e clicou de novo, executa a exclusão
        setLoading(true);
        try {
            const res = await deleteClient(id);
            if (res.success) {
                window.location.reload();
            } else {
                alert("Erro: " + res.error);
                setConfirmingId(null);
            }
        } catch (err: any) {
            alert("Erro de conexão: " + err.message);
            setConfirmingId(null);
        }
        setLoading(false);
    };

    const handleStatusUpdate = async (e: React.MouseEvent, id: string, newStatus: string) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        try {
            const res = await updateClientStatus(id, newStatus);
            if (!res.success) {
                alert(res.error);
            } else {
                window.location.reload();
                return;
            }
        } catch (err) {
            console.error("Status update error:", err);
            alert("Erro ao atualizar status.");
        }
        setLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDENTE": return { bg: "rgba(245, 158, 11, 0.15)", text: "var(--accent-orange, #f59e0b)", border: "var(--accent-orange, #f59e0b)" };
            case "APROVADO": return { bg: "rgba(16, 185, 129, 0.15)", text: "var(--accent-primary)", border: "var(--accent-primary)" };
            case "REPROVADO": return { bg: "rgba(239, 68, 68, 0.15)", text: "var(--accent-red)", border: "var(--accent-red)" };
            case "ATIVO": return { bg: "rgba(16, 185, 129, 0.15)", text: "var(--accent-primary)", border: "var(--accent-primary)" };
            case "INATIVO": return { bg: "rgba(107, 114, 128, 0.15)", text: "var(--text-tertiary)", border: "var(--text-tertiary)" };
            default: return { bg: "rgba(255, 255, 255, 0.05)", text: "var(--text-primary)", border: "var(--glass-border)" };
        }
    };

    return (
        <div>
            {/* Approval Section */}
            {isAdminOrManager && pendingClients.length > 0 && (
                <div className="glass-card" style={{ marginBottom: "2rem", padding: "1.5rem", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b", animation: "pulse 2s infinite" }}></div>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#f59e0b" }}>Cedentes Pendentes de Aprovação</h2>
                    </div>
                    
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                                    <th style={{ padding: "0.75rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.875rem" }}>Empresa</th>
                                    <th style={{ padding: "0.75rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.875rem" }}>CNPJ</th>
                                    <th style={{ padding: "0.75rem", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.875rem", textAlign: "right" }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingClients.map(client => (
                                    <tr key={client.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                        <td style={{ padding: "0.75rem", fontWeight: 500 }}>{client.name}</td>
                                        <td style={{ padding: "0.75rem", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{client.cnpj || "---"}</td>
                                        <td style={{ padding: "0.75rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleStatusUpdate(e, client.id, "APROVADO")}
                                                className="btn-primary" 
                                                style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.8)" }}
                                                disabled={loading}
                                            >
                                                Aprovar
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleStatusUpdate(e, client.id, "REPROVADO")}
                                                style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}
                                                disabled={loading}
                                            >
                                                Reprovar
                                            </button>
                                            {(client._count?.operations === 0 && client._count?.agreements === 0) && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenModal(client)}
                                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", gap: "2rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "250px" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Cedentes Cadastrados</h2>
                    <div style={{ position: "relative" }}>
                        <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="Buscar por nome ou CNPJ..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: "1rem" }}
                        />
                    </div>
                </div>
                {(isAdminOrManager || isComercial) && (
                    <button className="btn-primary" onClick={() => handleOpenModal()} style={{ padding: "0.625rem 1.25rem", fontSize: "0.875rem", height: "fit-content" }}>
                        + Novo Cliente
                    </button>
                )}
            </div>

            <div className="desktop-only" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border-light)" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Nome da Empresa</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>CNPJ</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Status</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Representante</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Operações</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Data Criação</th>
                            {isAdminOrManager && <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, textAlign: "right" }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {otherClients.map((client) => {
                            const statusStyle = getStatusColor(client.status);
                            return (
                                <tr key={client.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)" }} className="hover-row">
                                    <td style={{ padding: "1rem", fontWeight: 500 }}>{client.name}</td>
                                    <td style={{ padding: "1rem", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{client.cnpj || "---"}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <span style={{
                                            padding: "0.25rem 0.625rem",
                                            borderRadius: "99px",
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.text,
                                            border: `1px solid ${statusStyle.border}`,
                                            textTransform: "uppercase"
                                        }}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                                        {client.representative?.name || <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>Não definido</span>}
                                    </td>
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
                                            {client.status === "APROVADO" || client.status === "ATIVO" || client.status === "INATIVO" ? (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => handleStatusUpdate(e, client.id, client.status === "ATIVO" ? "INATIVO" : "ATIVO")}
                                                    className={client.status === "ATIVO" ? "btn-secondary" : "btn-primary"} 
                                                    style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem", height: "auto" }}
                                                >
                                                    {client.status === "ATIVO" ? "Inativar" : "Ativar"}
                                                </button>
                                            ) : null}
                                            <button type="button" className="btn-secondary" onClick={() => handleOpenModal(client)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Editar</button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {otherClients.length === 0 && (
                    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                        Nenhum cliente aprovado/ativo cadastrado ainda.
                    </div>
                )}
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {initialClients.map(client => {
                    const statusStyle = getStatusColor(client.status);
                    return (
                        <div key={client.id} className="glass-card" onClick={() => isAdminOrManager && handleOpenModal(client)} style={{ padding: "1.25rem", cursor: isAdminOrManager ? "pointer" : "default" }}>
                            <div className="flex-between" style={{ alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)" }}>{client.name}</span>
                                        <span style={{
                                            padding: "0.15rem 0.4rem",
                                            borderRadius: "99px",
                                            fontSize: "0.6rem",
                                            fontWeight: 700,
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.text,
                                            border: `1px solid ${statusStyle.border}`,
                                            textTransform: "uppercase"
                                        }}>
                                            {client.status}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>CNPJ: {client.cnpj || "---"}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Rep: {client.representative?.name || "N/A"}</span>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Cadastrado em {new Date(client.createdAt).toLocaleDateString("pt-BR")}</span>
                                </div>
                                <span style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}>
                                    {client._count.operations} op.
                                </span>
                            </div>
                            
                            {isAdminOrManager && (
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                                    {client.status === "PENDENTE" && (
                                        <>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleStatusUpdate(e, client.id, "APROVADO")}
                                                className="btn-primary" 
                                                style={{ flex: 1, padding: "0.5rem", fontSize: "0.75rem" }}
                                            >
                                                Aprovar
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleStatusUpdate(e, client.id, "REPROVADO")}
                                                style={{ flex: 1, padding: "0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}
                                            >
                                                Reprovar
                                            </button>
                                        </>
                                    )}
                                    {client.status !== "PENDENTE" && (
                                        <button 
                                            type="button"
                                            onClick={(e) => handleStatusUpdate(e, client.id, client.status === "ATIVO" ? "INATIVO" : "ATIVO")}
                                            className={client.status === "ATIVO" ? "btn-secondary" : "btn-primary"} 
                                            style={{ flex: 1, padding: "0.5rem", fontSize: "0.75rem" }}
                                        >
                                            {client.status === "ATIVO" ? "Inativar" : "Ativar"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingClient ? "Editar Cedente" : "Novo Cedente"}</h3>

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

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>CNPJ</label>
                                <input className="glass-input" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                            </div>

                            <div style={{ display: "flex", gap: "1rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Fator a.m. (%)</label>
                                    <NumericFormat className="glass-input" value={taxaFator} thousandSeparator="." decimalSeparator="," decimalScale={4} placeholder="Ex: 6,5" onValueChange={(v: any) => setTaxaFator(v.floatValue !== undefined ? String(v.floatValue) : "")} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Ad Valorem (%)</label>
                                    <NumericFormat className="glass-input" value={taxaAdValorem} thousandSeparator="." decimalSeparator="," decimalScale={4} placeholder="Ex: 0,5" onValueChange={(v: any) => setTaxaAdValorem(v.floatValue !== undefined ? String(v.floatValue) : "")} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Tarifas / XML (R$)</label>
                                    <NumericFormat className="glass-input" value={taxaTarifa} thousandSeparator="." decimalSeparator="," decimalScale={2} placeholder="Ex: 3,50" onValueChange={(v: any) => setTaxaTarifa(v.floatValue !== undefined ? String(v.floatValue) : "")} />
                                </div>
                            </div>

                            {!isComercial && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Representante (Comercial/Manager)</label>
                                    <select 
                                        className="glass-input" 
                                        value={representativeId} 
                                        onChange={e => setRepresentativeId(e.target.value)}
                                        style={{ 
                                            backgroundColor: "var(--bg-secondary, #1a1a1a)", 
                                            color: "var(--text-primary, #ffffff)",
                                            borderColor: "var(--glass-border, rgba(255,255,255,0.1))"
                                        }}
                                    >
                                        <option value="" style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>Selecione um representante</option>
                                        {representatives.map(rep => (
                                            <option key={rep.id} value={rep.id} style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                                                {rep.name} ({rep.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {isComercial && (
                                <input type="hidden" value={representativeId} />
                            )}

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                                <div>
                                    {editingClient && (editingClient._count.operations === 0 && editingClient._count.agreements === 0) && (
                                        <button 
                                            type="button" 
                                            onClick={(e) => handleDelete(e, editingClient.id)}
                                            style={{ 
                                                padding: "0.5rem 1rem", 
                                                fontSize: "0.875rem", 
                                                backgroundColor: confirmingId === editingClient.id ? "var(--accent-red)" : "transparent",
                                                color: confirmingId === editingClient.id ? "white" : "var(--accent-red)",
                                                border: "1px solid var(--accent-red)",
                                                borderRadius: "var(--radius-sm)",
                                                fontWeight: 600
                                            }}
                                            disabled={loading}
                                        >
                                            {confirmingId === editingClient.id ? "Tem certeza?" : "Excluir Cedente"}
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .hover-row:hover { background-color: var(--glass-bg-hover); }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
                }
            `}} />
        </div>
    );
}

"use client";

import { useState } from "react";
import { NumericFormat } from 'react-number-format';
import { updateGlobalSettings } from "./actions";

export default function SettingsForm({ initialData }: { initialData: any }) {
    const defaultTarifas = [
        { id: '1', nome: "Entrada de título", valor: "85", active: false },
        { id: '2', nome: "Instrução bancária de título", valor: "10", active: false },
        { id: '3', nome: "Manutenção de título bancário", valor: "15", active: false },
        { id: '4', nome: "Tarifa de aditivo", valor: "10", active: false },
        { id: '5', nome: "Tarifa de cobrança e notificação", valor: "60", active: false },
        { id: '6', nome: "Tarifa de contrato", valor: "200", active: false }
    ];

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        defaultFator: initialData?.defaultFator?.toString() || "8.5",
        defaultAdValorem: initialData?.defaultAdValorem?.toString() || "",
        defaultIof: initialData?.defaultIof?.toString() || "",
        defaultIofAdicional: initialData?.defaultIofAdicional?.toString() || "",
        defaultTarifas: (initialData?.defaultTarifas && initialData.defaultTarifas.length > 0) ? initialData.defaultTarifas : defaultTarifas
    });

    const addTarifa = () => {
        setFormData(prev => ({
            ...prev,
            defaultTarifas: [
                ...prev.defaultTarifas,
                { id: Math.random().toString(), nome: "Nova Tarifa Bancária", valor: "0", active: false }
            ]
        }));
    };

    const deleteTarifa = (id: string) => {
        setFormData(prev => ({
            ...prev,
            defaultTarifas: prev.defaultTarifas.filter((t: any) => t.id !== id)
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateGlobalSettings(formData);
            alert("Configurações atualizadas com sucesso!");
        } catch(err) {
            alert("Erro ao salvar.");
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            <div style={{ padding: "1.5rem", border: "1px dashed var(--glass-border)", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem" }}>Taxas Padronizadas (%)</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", marginBottom: "1.5rem" }}>Estas taxas atuarão como preenchimento rápido se o Cedente não possuir Histórico anterior nem preenchimento individual na sua ficha de cadastro.</p>
                <div className="form-grid-2">
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Fator Padrão (%)</label>
                        <NumericFormat className="glass-input" value={formData.defaultFator} thousandSeparator="." decimalSeparator="," decimalScale={4} onValueChange={(v: any) => setFormData({ ...formData, defaultFator: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Ad Valorem Padrão (%)</label>
                        <NumericFormat className="glass-input" value={formData.defaultAdValorem} thousandSeparator="." decimalSeparator="," decimalScale={4} onValueChange={(v: any) => setFormData({ ...formData, defaultAdValorem: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF Diário Padrão (%)</label>
                        <NumericFormat className="glass-input" value={formData.defaultIof} thousandSeparator="." decimalSeparator="," decimalScale={6} onValueChange={(v: any) => setFormData({ ...formData, defaultIof: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF Adicional Padrão (%)</label>
                        <NumericFormat className="glass-input" value={formData.defaultIofAdicional} thousandSeparator="." decimalSeparator="," decimalScale={6} onValueChange={(v: any) => setFormData({ ...formData, defaultIofAdicional: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                    </div>
                </div>
            </div>

            <div style={{ padding: "1.5rem", border: "1px dashed var(--glass-border)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)" }}>Regras de Tarifas Constantes (R$)</h3>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>O menu que aparece disponível para marcar na criação da Nova Operação.</p>
                    </div>
                    <button type="button" onClick={addTarifa} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.75rem" }}>
                        + Criar Padrão
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {formData.defaultTarifas.map((t: any) => (
                        <div key={t.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                            <input 
                                type="text" 
                                className="glass-input" 
                                value={t.nome} 
                                onChange={(e) => setFormData(prev => ({ ...prev, defaultTarifas: prev.defaultTarifas.map((x:any) => x.id === t.id ? { ...x, nome: e.target.value } : x) }))} 
                                style={{ flex: 1, padding: "0.5rem", fontSize: "0.875rem", border: "none", borderBottom: "1px solid var(--glass-border)", borderRadius: 0 }} 
                                placeholder="Nome da Tarifa"
                            />
                            <NumericFormat 
                                className="glass-input" 
                                value={t.valor} 
                                thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " 
                                onValueChange={(v: any) => setFormData(prev => ({ ...prev, defaultTarifas: prev.defaultTarifas.map((x:any) => x.id === t.id ? { ...x, valor: v.floatValue !== undefined ? String(v.floatValue) : "" } : x) }))} 
                                style={{ width: "150px", padding: "0.5rem", fontSize: "0.875rem", border: "none", borderBottom: "1px solid var(--glass-border)", borderRadius: 0 }} 
                            />
                            <button type="button" onClick={() => deleteTarifa(t.id)} style={{ padding: "0.5rem", background: "transparent", color: "var(--accent-red)", cursor: "pointer", border: "none" }} title="Remover regra">
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: "200px" }}>
                    {loading ? "Gravando Padrões..." : "Salvar Configurações Mestra"}
                </button>
            </div>
        </form>
    );
}

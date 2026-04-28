"use client";

import { useState } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { createAgreement } from "./actions";

interface Client {
  id: string;
  name: string;
}

interface NewAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export function NewAgreementModal({ isOpen, onClose, clients, onSuccess }: NewAgreementModalProps) {
  const [clientId, setClientId] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [installmentValue, setInstallmentValue] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate installment value if total and count are provided
  const handleCalculateInstallment = () => {
    const cleanTotal = totalValue.replace(/[^\d.,]/g, '');
    const total = parseFloat(cleanTotal.replace(/\./g, '').replace(',', '.'));
    const count = parseInt(installmentsCount);
    
    if (!isNaN(total) && !isNaN(count) && count > 0) {
      const calculated = (total / count).toFixed(2).replace('.', ',');
      setInstallmentValue(calculated);
    }
  };

  const handleTotalValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !totalValue || !installmentsCount || !installmentValue || !firstDueDate) {
      alert("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    
    // Convert formatted money strings to float, stripping R$ and spaces
    const cleanTotal = totalValue.replace(/[^\d.,]/g, '');
    const cleanInst = installmentValue.replace(/[^\d.,]/g, '');
    
    const totalValFloat = parseFloat(cleanTotal.replace(/\./g, "").replace(",", "."));
    const instValFloat = parseFloat(cleanInst.replace(/\./g, "").replace(",", "."));
    const countInt = parseInt(installmentsCount);
    
    if (isNaN(totalValFloat) || isNaN(instValFloat)) {
        setIsSubmitting(false);
        alert("Valores inválidos. Digite apenas números, pontos e vírgulas.");
        return;
    }
    
    // Ensure date is treated correctly without timezone shifting issues
    const dateObj = new Date(firstDueDate + "T12:00:00Z");

    const result = await createAgreement({
        clientId,
        totalValue: totalValFloat,
        installmentsCount: countInt,
        installmentValue: instValFloat,
        firstDueDate: dateObj
    });

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
      onClose();
      // Reset form
      setClientId("");
      setTotalValue("");
      setInstallmentsCount("");
      setInstallmentValue("");
      setFirstDueDate("");
    } else {
      alert(result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="flex-between" style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Novo Acordo</h2>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "0.5rem" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Cliente
            </label>
            <select
              required
              className="glass-input"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Selecione um cliente</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Valor Total do Acordo
              </label>
              <input
                required
                type="text"
                className="glass-input"
                placeholder="Ex: 5000,00"
                value={totalValue}
                onChange={handleTotalValueChange}
                onBlur={handleCalculateInstallment}
              />
            </div>
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Número de Parcelas
              </label>
              <input
                required
                type="number"
                min="1"
                className="glass-input"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(e.target.value)}
                onBlur={handleCalculateInstallment}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Valor da Parcela
              </label>
              <input
                required
                type="text"
                className="glass-input"
                placeholder="Ex: 1000,00"
                value={installmentValue}
                onChange={(e) => setInstallmentValue(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Data da 1ª Parcela
              </label>
              <input
                required
                type="date"
                className="glass-input"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", marginBottom: "1rem" }}>
              As próximas {installmentsCount ? parseInt(installmentsCount) - 1 : 'X'} parcelas serão geradas automaticamente com vencimentos mensais a partir da primeira data.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Acordo"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}

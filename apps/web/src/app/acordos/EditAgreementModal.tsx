"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { editAgreement } from "./actions";

interface Client {
  id: string;
  name: string;
}

interface Installment {
  id: string;
  value: number;
  dueDate: Date;
  status: string;
  paidAt: Date | null;
}

interface Agreement {
  id: string;
  client: { name: string };
  clientId?: string; // We need clientId to pre-fill
  totalValue: number;
  installmentsCount: number;
  status: string;
  installments: Installment[];
}

interface EditAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  agreement: Agreement | null;
  onSuccess: () => void;
}

export function EditAgreementModal({ isOpen, onClose, clients, agreement, onSuccess }: EditAgreementModalProps) {
  const [clientId, setClientId] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [installmentValue, setInstallmentValue] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (agreement && isOpen) {
        // Find the clientId from the full original prop if possible, or we have to rely on a passed ID
        // Assuming AgreementList can pass it, or we find it by name for now
        const matchedClient = clients.find(c => c.name === agreement.client.name);
        setClientId(matchedClient?.id || "");
        
        const formatMoney = (val: number) => val.toFixed(2).replace('.', ',');
        setTotalValue(formatMoney(agreement.totalValue));
        setInstallmentsCount(agreement.installmentsCount.toString());
        
        if (agreement.installments.length > 0) {
            setInstallmentValue(formatMoney(agreement.installments[0].value));
            // Form needs YYYY-MM-DD
            const firstDateObj = new Date(agreement.installments[0].dueDate);
            setFirstDueDate(firstDateObj.toISOString().split('T')[0]);
        }
    }
  }, [agreement, isOpen, clients]);

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
    if (!agreement?.id) return;
    if (!clientId || !totalValue || !installmentsCount || !installmentValue || !firstDueDate) {
      alert("Preencha todos os campos");
      return;
    }

    if (!confirm("ATENÇÃO: Ao editar o acordo, todas as parcelas antigas serão excluídas e o status de pagamento retornará para 'Pendente'. Deseja continuar?")) {
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

    const result = await editAgreement(agreement.id, {
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
    } else {
      alert(result.error);
    }
  };

  if (!isOpen || !agreement) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '600px', width: '90%', zIndex: 100000 }}>
        <div className="flex-between" style={{ marginBottom: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Editar Acordo</h2>
            <p style={{ color: "var(--accent-red)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                Aviso: Salvar irá recriar todas as parcelas como "Pendentes".
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: "0.5rem" }}>
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
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
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
          z-index: 10000;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}

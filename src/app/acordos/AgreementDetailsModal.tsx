"use client";

import { useState } from "react";
import { X, CheckCircle, Circle, Edit2, Trash2 } from "lucide-react";
import { toggleInstallmentStatus, deleteAgreement } from "./actions";
import { EditAgreementModal } from "./EditAgreementModal";

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
  clientId?: string;
  totalValue: number;
  installmentsCount: number;
  status: string;
  installments: Installment[];
}

interface AgreementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: Agreement | null;
  clients: Client[];
  onSuccess: () => void;
}

export function AgreementDetailsModal({ isOpen, onClose, agreement, clients, onSuccess }: AgreementDetailsModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !agreement) return null;

  const handleToggleStatus = async (installmentId: string) => {
    const result = await toggleInstallmentStatus(installmentId);
    if (result.success) {
        onSuccess(); // Ensure parent refreshes its data
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este acordo? Essa ação não pode ser desfeita e todas as parcelas serão perdidas.")) {
        setIsSubmitting(true);
        const result = await deleteAgreement(agreement.id);
        setIsSubmitting(false);
        if (result.success) {
            onSuccess();
            onClose();
        } else {
            alert(result.error);
        }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const paidCount = agreement.installments.filter(i => i.status === "PAID").length;
  const progressPercentage = (paidCount / agreement.installmentsCount) * 100;

  return (
    <>
    <div className="modal-overlay">
      <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Acordo - {agreement.client.name}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Total: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatCurrency(agreement.totalValue)}</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setIsEditModalOpen(true)} className="btn-secondary" style={{ padding: "0.5rem", color: "var(--text-secondary)" }} title="Editar Acordo">
              <Edit2 size={18} />
            </button>
            <button onClick={handleDelete} disabled={isSubmitting} className="btn-secondary" style={{ padding: "0.5rem", color: "var(--accent-red)", borderColor: "rgba(239, 68, 68, 0.2)" }} title="Excluir Acordo">
              <Trash2 size={18} />
            </button>
            <div style={{ width: "1px", background: "var(--card-border)", margin: "0 0.25rem" }} />
            <button onClick={onClose} className="btn-secondary" style={{ padding: "0.5rem" }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: "2rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }}>
          <div className="flex-between" style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Progresso</span>
            <span style={{ fontWeight: 600, color: progressPercentage === 100 ? "var(--accent-primary)" : "var(--text-primary)" }}>
              {paidCount} de {agreement.installmentsCount} pagas ({Math.round(progressPercentage)}%)
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "var(--card-border)", borderRadius: "4px", overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                width: `${progressPercentage}%`, 
                background: "var(--accent-primary)", 
                transition: "width 0.3s ease" 
              }} 
            />
          </div>
        </div>

        {/* Installments List */}
        <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }} className="installments-list">
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-secondary)" }}>Parcelas</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {agreement.installments.map((installment, index) => {
              const isPaid = installment.status === "PAID";
              const isOverdue = !isPaid && new Date(installment.dueDate) < new Date() && new Date(installment.dueDate).toDateString() !== new Date().toDateString();

              return (
                <div 
                  key={installment.id} 
                  className="glass-card flex-between" 
                  style={{ 
                    padding: "1rem", 
                    borderColor: isPaid ? "rgba(16, 185, 129, 0.3)" : (isOverdue ? "rgba(239, 68, 68, 0.3)" : "var(--card-border)"),
                    background: isPaid ? "rgba(16, 185, 129, 0.05)" : "var(--card-bg)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ 
                      width: "32px", height: "32px", borderRadius: "50%", 
                      background: "rgba(255,255,255,0.05)", display: "flex", 
                      alignItems: "center", justifyContent: "center",
                      color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 600
                    }}>
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatCurrency(installment.value)}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: isOverdue ? "var(--accent-red)" : "var(--text-tertiary)", marginTop: "0.25rem" }}>
                        Vencimento: {new Date(installment.dueDate).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}
                        {isOverdue && " (Atrasada)"}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleToggleStatus(installment.id)}
                    className="status-btn"
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.5rem 1rem", borderRadius: "var(--radius-xs)",
                      background: isPaid ? "rgba(16, 185, 129, 0.1)" : (isOverdue ? "rgba(239, 68, 68, 0.1)" : "transparent"),
                      color: isPaid ? "var(--accent-primary)" : (isOverdue ? "var(--accent-red)" : "var(--text-secondary)"),
                      border: `1px solid ${isPaid ? "var(--accent-primary)" : (isOverdue ? "var(--accent-red)" : "var(--card-border)")}`,
                      transition: "all 0.2s ease"
                    }}
                  >
                    {isPaid ? <CheckCircle size={16} /> : <Circle size={16} />}
                    {isPaid ? "Paga" : (isOverdue ? "Atrasada (Pagar)" : "Marcar como Paga")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
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

        .installments-list::-webkit-scrollbar {
          width: 6px;
        }
        .installments-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .installments-list::-webkit-scrollbar-thumb {
          background: var(--card-border);
          border-radius: 4px;
        }

        .status-btn:hover {
          background: rgba(255,255,255,0.05) !important;
        }
      `}</style>
    </div>

    {isEditModalOpen && (
        <EditAgreementModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            clients={clients}
            agreement={agreement}
            onSuccess={() => {
                setIsEditModalOpen(false);
                onSuccess();
            }}
        />
    )}
    </>
  );
}

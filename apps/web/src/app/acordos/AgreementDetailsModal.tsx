"use client";

import { useState } from "react";
import { X, CheckCircle, Circle, Edit2, Trash2, Plus, Clock } from "lucide-react";
import { toggleInstallmentStatus, deleteAgreement, updateInstallmentPayment, addInstallment } from "./actions";
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
  paidValue: number;
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
  
  // Payment edit states
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [editPaidValue, setEditPaidValue] = useState<string>("");

  // Add installment states
  const [isAddingInstallment, setIsAddingInstallment] = useState(false);
  const [newInstallmentValue, setNewInstallmentValue] = useState("");
  const [newInstallmentDueDate, setNewInstallmentDueDate] = useState("");

  if (!isOpen || !agreement) return null;

  const handleToggleStatus = async (installmentId: string) => {
    setIsSubmitting(true);
    const result = await toggleInstallmentStatus(installmentId);
    setIsSubmitting(false);
    if (result.success) {
      onSuccess(); // Ensure parent refreshes its data
    } else {
      alert(result.error);
    }
  };

  const handleSavePayment = async (installmentId: string) => {
    const cleanValue = editPaidValue.replace(/[^\d.,]/g, '');
    const val = parseFloat(cleanValue.replace(/\./g, "").replace(",", "."));
    if (isNaN(val) || val < 0) {
      alert("Por favor, insira um valor válido.");
      return;
    }
    
    setIsSubmitting(true);
    const result = await updateInstallmentPayment(installmentId, val);
    setIsSubmitting(false);
    
    if (result.success) {
      setEditingInstallmentId(null);
      onSuccess();
    } else {
      alert(result.error);
    }
  };

  const handleStartAddInstallment = () => {
    const totalPaidVal = agreement.installments.reduce((sum, inst) => sum + (inst.paidValue || 0), 0);
    const remaining = Math.max(0, agreement.totalValue - totalPaidVal);
    setNewInstallmentValue(remaining.toFixed(2).replace('.', ','));
    
    if (agreement.installments.length > 0) {
      const dates = agreement.installments.map(i => new Date(i.dueDate).getTime());
      const maxDate = new Date(Math.max(...dates));
      const nextMonthDate = new Date(maxDate);
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
      setNewInstallmentDueDate(nextMonthDate.toISOString().split('T')[0]);
    } else {
      setNewInstallmentDueDate(new Date().toISOString().split('T')[0]);
    }
    
    setIsAddingInstallment(true);
  };

  const handleConfirmAddInstallment = async () => {
    if (!newInstallmentValue || !newInstallmentDueDate) {
      alert("Preencha todos os campos");
      return;
    }
    
    const cleanValue = newInstallmentValue.replace(/[^\d.,]/g, '');
    const val = parseFloat(cleanValue.replace(/\./g, "").replace(",", "."));
    if (isNaN(val) || val <= 0) {
      alert("Insira um valor válido maior que zero.");
      return;
    }
    
    const dateObj = new Date(newInstallmentDueDate + "T12:00:00Z");
    
    setIsSubmitting(true);
    const result = await addInstallment(agreement.id, val, dateObj);
    setIsSubmitting(false);
    
    if (result.success) {
      setIsAddingInstallment(false);
      onSuccess();
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
  const progressPercentage = agreement.installmentsCount > 0 ? (paidCount / agreement.installmentsCount) * 100 : 0;
  
  const totalPaid = agreement.installments.reduce((sum, inst) => sum + (inst.paidValue || 0), 0);
  const totalRemaining = Math.max(0, agreement.totalValue - totalPaid);

  return (
    <>
    <div className="modal-overlay">
      <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Acordo - {agreement.client.name}</h2>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div>
                Total: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatCurrency(agreement.totalValue)}</span>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.125rem" }}>
                <span>Pago: <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>{formatCurrency(totalPaid)}</span></span>
                <span>Restante: <span style={{ color: totalRemaining > 0 ? "var(--accent-orange)" : "var(--text-secondary)", fontWeight: 600 }}>{formatCurrency(totalRemaining)}</span></span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setIsEditModalOpen(true)} className="btn-secondary" style={{ padding: "0.5rem", color: "var(--text-secondary)" }} title="Editar Acordo">
              <Edit2 size={18} />
            </button>
            <button onClick={handleDelete} disabled={isSubmitting} className="btn-secondary" style={{ padding: "0.5rem", color: "var(--accent-red)", borderColor: "rgba(239, 68, 68, 0.2)" }} title="Excluir Acordo">
              <Trash2 size={18} />
            </button>
            <div style={{ width: "1px", background: "var(--card-border)", margin: "0 0.25rem", display: "none" }} />
            <button onClick={onClose} className="btn-secondary" style={{ padding: "0.5rem" }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }}>
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
          <h3 style={{ fontSize: "1.00rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-secondary)" }}>Parcelas</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {agreement.installments.map((installment, index) => {
              const isPaid = installment.status === "PAID";
              const isPartial = installment.status === "PARTIAL";
              const isOverdue = !isPaid && !isPartial && new Date(installment.dueDate) < new Date() && new Date(installment.dueDate).toDateString() !== new Date().toDateString();
              const isEditing = editingInstallmentId === installment.id;

              return (
                <div 
                  key={installment.id} 
                  className="glass-card" 
                  style={{ 
                    display: "flex", flexDirection: "column", gap: "1rem",
                    padding: "1rem", 
                    borderColor: isPaid ? "rgba(16, 185, 129, 0.3)" : (isPartial ? "rgba(245, 158, 11, 0.3)" : (isOverdue ? "rgba(239, 68, 68, 0.3)" : "var(--card-border)")),
                    background: isPaid ? "rgba(16, 185, 129, 0.05)" : (isPartial ? "rgba(245, 158, 11, 0.03)" : "var(--card-bg)")
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        Registrar Pagamento - Parcela {index + 1}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Valor Pago:</span>
                          <input
                            type="text"
                            className="glass-input"
                            style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem", width: "130px" }}
                            value={editPaidValue}
                            onChange={(e) => setEditPaidValue(e.target.value)}
                            placeholder="Ex: 500,00"
                            autoFocus
                          />
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button 
                            onClick={() => handleSavePayment(installment.id)}
                            disabled={isSubmitting}
                            className="btn-primary"
                            style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem" }}
                          >
                            Salvar
                          </button>
                          <button 
                            onClick={() => setEditingInstallmentId(null)}
                            className="btn-secondary"
                            style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
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
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {formatCurrency(installment.value)}
                            </div>
                            {isPartial && (
                              <div style={{ fontSize: "0.75rem", color: "var(--accent-orange)" }}>
                                Pago Parcial: {formatCurrency(installment.paidValue)} (Faltam {formatCurrency(installment.value - installment.paidValue)})
                              </div>
                            )}
                            {isPaid && installment.paidValue < installment.value && (
                              <div style={{ fontSize: "0.75rem", color: "var(--accent-primary)" }}>
                                Pago Parcial: {formatCurrency(installment.paidValue)}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: isOverdue ? "var(--accent-red)" : "var(--text-tertiary)", marginTop: "0.25rem" }}>
                            Vencimento: {new Date(installment.dueDate).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}
                            {isOverdue && " (Atrasada)"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button 
                          onClick={() => handleToggleStatus(installment.id)}
                          className="status-btn"
                          disabled={isSubmitting}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            padding: "0.5rem 0.75rem", borderRadius: "var(--radius-xs)",
                            background: isPaid ? "rgba(16, 185, 129, 0.1)" : (isPartial ? "rgba(245, 158, 11, 0.1)" : (isOverdue ? "rgba(239, 68, 68, 0.1)" : "transparent")),
                            color: isPaid ? "var(--accent-primary)" : (isPartial ? "var(--accent-orange)" : (isOverdue ? "var(--accent-red)" : "var(--text-secondary)")),
                            border: `1px solid ${isPaid ? "var(--accent-primary)" : (isPartial ? "var(--accent-orange)" : (isOverdue ? "var(--accent-red)" : "var(--card-border)"))}`,
                            transition: "all 0.2s ease"
                          }}
                        >
                          {isPaid ? <CheckCircle size={16} /> : (isPartial ? <Clock size={16} /> : <Circle size={16} />)}
                          {isPaid ? "Paga" : (isPartial ? "Pago Parcial" : (isOverdue ? "Atrasada (Pagar)" : "Marcar como Paga"))}
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditingInstallmentId(installment.id);
                            setEditPaidValue(installment.paidValue ? installment.paidValue.toFixed(2).replace('.', ',') : installment.value.toFixed(2).replace('.', ','));
                          }}
                          className="btn-secondary"
                          style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" }}
                          title="Registrar pagamento parcial ou alterar valor pago"
                        >
                          <Edit2 size={14} />
                          <span>Pagar Parcial</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Installment Section */}
          {isAddingInstallment ? (
            <div className="glass-card animate-fade-in" style={{ padding: "1.25rem", border: "1px dashed var(--accent-primary)", marginTop: "1.5rem" }}>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>Adicionar Parcela</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-grid-2" style={{ gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>Valor da Parcela</label>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ padding: "0.5rem 0.75rem" }}
                      placeholder="Ex: 1000,00"
                      value={newInstallmentValue}
                      onChange={(e) => setNewInstallmentValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>Data de Vencimento</label>
                    <input
                      type="date"
                      className="glass-input"
                      style={{ padding: "0.5rem 0.75rem" }}
                      value={newInstallmentDueDate}
                      onChange={(e) => setNewInstallmentDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button onClick={() => setIsAddingInstallment(false)} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                    Cancelar
                  </button>
                  <button onClick={handleConfirmAddInstallment} disabled={isSubmitting} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                    {isSubmitting ? "Adicionando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleStartAddInstallment}
              className="btn-secondary" 
              style={{ 
                width: "100%", padding: "0.75rem", border: "1px dashed var(--card-border)", 
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                marginTop: "1.5rem", color: "var(--accent-primary)", borderRadius: "var(--radius-sm)"
              }}
            >
              <Plus size={16} />
              <span>Adicionar Outra Parcela (Refinanciar em Aberto)</span>
            </button>
          )}
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

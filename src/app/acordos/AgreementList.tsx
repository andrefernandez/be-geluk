"use client";

import { useState } from "react";
import { Plus, ChevronRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { NewAgreementModal } from "./NewAgreementModal";
import { AgreementDetailsModal } from "./AgreementDetailsModal";

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
  totalValue: number;
  installmentsCount: number;
  status: string;
  installments: Installment[];
  createdAt: Date;
}

interface Client {
  id: string;
  name: string;
}

interface AgreementListProps {
  initialAgreements: Agreement[];
  clients: Client[];
}

export default function AgreementList({ initialAgreements, clients }: AgreementListProps) {
  const [agreements, setAgreements] = useState(initialAgreements);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getProgress = (agreement: Agreement) => {
    const paid = agreement.installments.filter(i => i.status === "PAID").length;
    return { paid, total: agreement.installmentsCount };
  };

  // Force re-fetch by doing a hard reload. In a real app we'd use SWR or server actions revalidation better
  const handleSuccess = () => {
    window.location.reload();
  };

  return (
    <>
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Todos os Acordos</h2>
        <button className="btn-primary" onClick={() => setIsNewModalOpen(true)}>
          <Plus size={18} />
          <span>Novo Acordo</span>
        </button>
      </div>

      <div style={{ overflowX: "auto", padding: "0 1.5rem 1.5rem 1.5rem" }}>
        <div className="desktop-only">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)", background: "rgba(255,255,255,0.02)" }}>
                <th style={{ textAlign: "left", padding: "1rem 1.5rem", color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Cedente</th>
                <th style={{ textAlign: "left", padding: "1rem 1.5rem", color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Data</th>
                <th style={{ textAlign: "right", padding: "1rem 1.5rem", color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Valor Total</th>
                <th style={{ textAlign: "center", padding: "1rem 1.5rem", color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Progresso</th>
                <th style={{ textAlign: "center", padding: "1rem 1.5rem", color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                <th style={{ width: "50px", padding: "1rem 1.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((agreement) => {
                const { paid, total } = getProgress(agreement);
                const percentage = (paid / total) * 100;
                const isCompleted = agreement.status === "COMPLETED" || paid === total;
                const hasOverdue = !isCompleted && agreement.installments.some(inst => 
                  inst.status !== "PAID" && new Date(inst.dueDate) < new Date() && new Date(inst.dueDate).toDateString() !== new Date().toDateString()
                );

                return (
                  <tr 
                    key={agreement.id} 
                    style={{ 
                      borderBottom: "1px solid var(--card-border)",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    className="agreement-row"
                    onClick={() => setSelectedAgreement(agreement)}
                  >
                    <td style={{ padding: "1rem 1.5rem", fontWeight: 500, color: "var(--text-primary)" }}>
                      {agreement.client.name}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {new Date(agreement.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatCurrency(agreement.totalValue)}
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", width: "100%", maxWidth: "120px", margin: "0 auto" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{paid} de {total} pagas</div>
                        <div style={{ width: "100%", height: "4px", background: "var(--card-border)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${percentage}%`, height: "100%", background: isCompleted ? "var(--accent-primary)" : "var(--accent-secondary)" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                      <span style={{ 
                        display: "inline-flex", alignItems: "center", gap: "0.375rem",
                        padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.75rem", fontWeight: 600,
                        background: isCompleted ? "rgba(16, 185, 129, 0.1)" : (hasOverdue ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)"),
                        color: isCompleted ? "var(--accent-primary)" : (hasOverdue ? "var(--accent-red)" : "var(--accent-orange)")
                      }}>
                        {isCompleted ? <CheckCircle size={12} /> : (hasOverdue ? <AlertCircle size={12} /> : <Clock size={12} />)}
                        {isCompleted ? "Concluído" : (hasOverdue ? "Atrasado" : "Ativo")}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right", color: "var(--text-tertiary)" }}>
                      <ChevronRight size={18} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {agreements.map((agreement) => {
            const { paid, total } = getProgress(agreement);
            const percentage = (paid / total) * 100;
            const isCompleted = agreement.status === "COMPLETED" || paid === total;
            const hasOverdue = !isCompleted && agreement.installments.some(inst => 
              inst.status !== "PAID" && new Date(inst.dueDate) < new Date() && new Date(inst.dueDate).toDateString() !== new Date().toDateString()
            );

            return (
              <div 
                key={agreement.id}
                className="glass-card"
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem", cursor: "pointer", padding: "1.25rem", border: "1px solid var(--card-border)", borderRadius: "var(--radius-sm)" }}
                onClick={() => setSelectedAgreement(agreement)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1rem", marginBottom: "0.25rem" }}>{agreement.client.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{new Date(agreement.createdAt).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1.125rem", textAlign: "right", whiteSpace: "nowrap" }}>
                    {formatCurrency(agreement.totalValue)}
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
                  <div style={{ flex: 1, marginRight: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                      <span>Progresso</span>
                      <span>{paid}/{total}</span>
                    </div>
                    <div style={{ width: "100%", height: "4px", background: "var(--card-border)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${percentage}%`, height: "100%", background: isCompleted ? "var(--accent-primary)" : "var(--accent-secondary)" }} />
                    </div>
                  </div>
                  
                  <span style={{ 
                    display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.25rem 0.75rem", borderRadius: "1rem", fontSize: "0.75rem", fontWeight: 600,
                    background: isCompleted ? "rgba(16, 185, 129, 0.1)" : (hasOverdue ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)"),
                    color: isCompleted ? "var(--accent-primary)" : (hasOverdue ? "var(--accent-red)" : "var(--accent-orange)")
                  }}>
                    {isCompleted ? <CheckCircle size={12} /> : (hasOverdue ? <AlertCircle size={12} /> : <Clock size={12} />)}
                    {isCompleted ? "Concluído" : (hasOverdue ? "Atrasado" : "Ativo")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {agreements.length === 0 && (
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
            <p style={{ marginBottom: "1rem" }}>Nenhum acordo registrado.</p>
            <button className="btn-secondary" onClick={() => setIsNewModalOpen(true)}>
              Criar Primeiro Acordo
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .agreement-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>

      {isNewModalOpen && (
        <NewAgreementModal 
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          clients={clients}
          onSuccess={handleSuccess}
        />
      )}

      {selectedAgreement && (
        <AgreementDetailsModal
          isOpen={!!selectedAgreement}
          onClose={() => {
            setSelectedAgreement(null);
            handleSuccess(); // Refresh to get updated statuses from modal action
          }}
          agreement={selectedAgreement}
          clients={clients}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

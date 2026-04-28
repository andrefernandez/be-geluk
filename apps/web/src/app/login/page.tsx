"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError("Credenciais inválidas");
        } else {
            router.push("/");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <img src="https://www.gelukbank.com.br/logo.svg" alt="Geluk Logo" className="login-logo" />
                    <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>SISTEMA DE GESTÃO</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem", fontWeight: 500, marginTop: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Acesso Restrito</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label>E-mail Corporativo</label>
                        <input
                            type="email"
                            required
                            className="glass-input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Chave de Acesso</label>
                        <input
                            type="password"
                            required
                            className="glass-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: "1rem", height: "3rem", fontSize: "0.875rem", fontWeight: 700 }}>
                        ACESSAR PAINEL
                    </button>
                </form>
            </div>

            <style jsx>{`
                .login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-primary);
                }

                .login-card {
                    width: 100%;
                    max-width: 400px;
                    padding: 3rem 2rem;
                    background: var(--bg-secondary);
                    border: 1px solid var(--card-border);
                    border-radius: var(--radius-md);
                }

                .login-logo {
                    width: 70px;
                    height: auto;
                    margin-bottom: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .error-message {
                    padding: 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: var(--radius-sm);
                    color: var(--accent-red);
                    font-size: 0.75rem;
                    text-align: center;
                    font-weight: 700;
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
}

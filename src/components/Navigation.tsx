"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();

    if (!session) return null;

    const navItems = [
        { name: "Dashboard", path: "/" },
        { name: "Operações", path: "/operacoes" },
        { name: "Clientes", path: "/clientes" },
        { name: "Investidores", path: "/investidores" },
        { name: "Custos", path: "/custos" },
        { name: "Usuários", path: "/usuarios" },
    ];

    return (
        <nav className="nav-sidebar">
            <div className="nav-logo">
                <img src="https://www.gelukbank.com.br/logo.svg" alt="Geluk Logo" className="logo-img" />
            </div>

            <div className="nav-links">
                {navItems.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <Link key={item.path} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
                            <span className="nav-link-dot"></span>
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div className="nav-footer">
                <div className="user-profile">
                    <div className="avatar">
                        {session.user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="user-info">
                        <p className="user-name">{session.user?.name}</p>
                        <p className="user-role">{session.user?.email}</p>
                    </div>
                </div>
                <button onClick={() => signOut()} className="logout-btn">
                    Sair
                </button>
            </div>

            <style jsx>{`
                .nav-sidebar {
                    width: 260px;
                    background: var(--bg-tertiary);
                    border-right: 1px solid var(--card-border);
                    display: flex;
                    flex-direction: column;
                    padding: 2.5rem 1.25rem;
                    position: sticky;
                    top: 0;
                    height: 100vh;
                    z-index: 100;
                }

                .nav-logo {
                    margin-bottom: 3rem;
                    display: flex;
                    justify-content: center;
                }

                .logo-img {
                    width: 80px;
                    height: auto;
                }

                .nav-links {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    flex: 1;
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius-sm);
                    color: var(--text-tertiary);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    transition: all var(--transition-fast);
                    border: 1px solid transparent;
                }

                .nav-link:hover {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.05);
                }

                .nav-link.active {
                    color: var(--accent-primary);
                    background: rgba(16, 185, 129, 0.05);
                    border-color: rgba(16, 185, 129, 0.1);
                }

                .nav-link-dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: currentColor;
                }

                .nav-footer {
                    margin-top: 2rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--card-border);
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--bg-primary);
                    border: 1px solid var(--card-border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.75rem;
                    color: var(--accent-primary);
                }

                .user-name {
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .user-role {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }

                .logout-btn {
                    width: 100%;
                    padding: 0.625rem;
                    border-radius: var(--radius-sm);
                    background: transparent;
                    color: var(--accent-red);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    transition: all var(--transition-fast);
                }

                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.4);
                }

                @media (max-width: 1024px) {
                    .nav-sidebar {
                        width: 100%;
                        height: auto;
                        flex-direction: row;
                        align-items: center;
                        padding: 0.75rem 1rem;
                        position: relative;
                        border-right: none;
                        border-bottom: 1px solid var(--card-border);
                    }

                    .nav-logo {
                        margin-bottom: 0;
                        margin-right: 1.5rem;
                    }

                    .logo-img {
                        width: 40px;
                    }

                    .nav-links {
                        flex-direction: row;
                        overflow-x: auto;
                        gap: 0.5rem;
                    }

                    .nav-link {
                         padding: 0.5rem 0.75rem;
                         white-space: nowrap;
                    }

                    .nav-footer {
                        margin-top: 0;
                        padding-top: 0;
                        border-top: none;
                        flex-direction: row;
                        padding-left: 1.5rem;
                    }

                    .user-info, .logout-btn {
                         display: none;
                    }
                }
            `}</style>
        </nav>
    );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";

export function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!session) return null;

    const isAdminOrManager = (session.user as any).role === "ADMIN" || (session.user as any).role === "MANAGER";
    const isInvestor = (session.user as any).role === "INVESTOR";

    const navItems = isInvestor ? [] : [
        { name: "Dashboard", path: "/" },
        { name: "Operações", path: "/operacoes" },
        { name: "Acordos", path: "/acordos" },
        { name: "Clientes", path: "/clientes" },
        { name: "Investidores", path: "/investidores" },
        { name: "Custos", path: "/custos" },
        ...(isAdminOrManager ? [{ name: "Usuários", path: "/usuarios" }] : []),
    ];

    return (
        <div style={{ display: 'contents' }}>
            {/* Mobile Topbar */}
            <div className="mobile-only mobile-topbar">
                <img src="https://www.gelukbank.com.br/logo.svg" alt="Geluk Logo" className="logo-img-mobile" />
                <button onClick={() => setIsMobileMenuOpen(true)} className="menu-btn" aria-label="Abrir menu">
                    <Menu size={24} color="var(--text-primary)" />
                </button>
            </div>

            {/* Drawer Backdrop */}
            {isMobileMenuOpen && (
                <div className="mobile-only drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar / Drawer */}
            <nav className={`nav-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="nav-logo flex-between" style={{ alignItems: "center" }}>
                    <img src="https://www.gelukbank.com.br/logo.svg" alt="Geluk Logo" className="logo-img" />
                    <button onClick={() => setIsMobileMenuOpen(false)} className="mobile-only close-btn" aria-label="Fechar menu">
                        <X size={24} color="var(--text-primary)" />
                    </button>
                </div>

                <div className="nav-links">
                    {navItems.map(item => {
                        const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
                        return (
                            <Link 
                                key={item.path} 
                                href={item.path} 
                                onClick={() => setIsMobileMenuOpen(false)} 
                                className={`nav-link ${isActive ? 'active' : ''}`}
                                style={{
                                    paddingLeft: '2.5rem',
                                    ...(isActive ? { backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#1c1c1f', borderColor: 'transparent', fontWeight: 700 } : {})
                                }}
                            >
                                <span className="nav-text">{item.name}</span>
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
            </nav>

            <style jsx>{`
                .nav-sidebar {
                    width: 260px;
                    background: var(--bg-tertiary);
                    border-right: 1px solid var(--card-border);
                    display: flex;
                    flex-direction: column;
                    padding: 2.5rem 0;
                    position: sticky;
                    top: 0;
                    height: 100vh;
                    z-index: 100;
                }

                .nav-logo {
                    margin-bottom: 3rem;
                    display: flex;
                    justify-content: center;
                    padding: 0 1.25rem;
                }

                .logo-img {
                    width: 80px;
                    height: auto;
                }

                .nav-links {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    flex: 1;
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1.125rem 1.25rem 1.125rem 2.5rem; /* top right bottom left */
                    border-radius: 0;
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
                    color: var(--accent-primary) !important;
                    background: rgba(16, 185, 129, 0.2) !important;
                    border-color: rgba(16, 185, 129, 0.4) !important;
                }



                .nav-footer {
                    margin-top: 2rem;
                    padding: 2rem 1.25rem 0 1.25rem;
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
                        width: 280px;
                        height: 100vh;
                        position: fixed;
                        top: 0;
                        left: 0;
                        flex-direction: column;
                        justify-content: flex-start;
                        background: rgba(20, 20, 22, 0.98);
                        backdrop-filter: blur(16px);
                        border-right: 1px solid var(--card-border);
                        border-top: none;
                        z-index: 10001;
                        padding: 2.5rem 0;
                        transform: translateX(-100%);
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .nav-sidebar.open {
                        transform: translateX(0);
                    }

                    .nav-logo, .nav-footer {
                        display: flex;
                        padding-left: 1.25rem;
                        padding-right: 1.25rem;
                    }
                    
                    .nav-logo {
                        margin-bottom: 3rem;
                        justify-content: space-between;
                        width: 100%;
                    }

                    .nav-links {
                        width: 100%;
                        height: auto;
                        flex-direction: column;
                        justify-content: flex-start;
                        align-items: stretch;
                        gap: 0.75rem;
                        overflow-y: auto;
                    }

                    .nav-link {
                         padding: 1.125rem 1.25rem 1.125rem 2.5rem;
                         flex-direction: row;
                         justify-content: flex-start;
                         height: auto;
                         flex: none;
                         font-size: 0.8125rem;
                         text-align: left;
                         gap: 0.75rem;
                    }

                    .nav-icon {
                        display: none !important;
                    }

                    .nav-link.active {
                        background: rgba(16, 185, 129, 0.2) !important;
                        color: var(--accent-primary) !important;
                    }
                }

                .mobile-topbar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    background: rgba(20, 20, 22, 0.95);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid var(--card-border);
                    z-index: 9990;
                }

                .logo-img-mobile {
                    width: 90px;
                    height: auto;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                }

                .menu-btn {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                }

                .menu-btn, .close-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius-sm);
                    transition: background var(--transition-fast);
                }

                .menu-btn:hover, .close-btn:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .drawer-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(2px);
                    z-index: 10000;
                    opacity: 1;
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

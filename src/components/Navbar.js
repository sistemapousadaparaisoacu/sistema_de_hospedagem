import React from 'react';
import { Link } from 'react-router-dom';
import BackendStatus from './BackendStatus';

const Navbar = ({ loggedIn, currentUser, onLogout, onToggleSidebar, onToggleSidebarDesktop, onToggleSidebarCompact, isLoginRoute }) => {
  return (
    <nav className={`navbar navbar-expand-lg navbar-dark navbar-theme`}>
      <div className="container-fluid">
        <div className="d-flex align-items-center">
          {loggedIn && currentUser?.papel !== 'cozinha' && currentUser?.papel !== 'garcom' && (
            <button
              className="btn btn-outline-light brand-hover me-2 navbar-menu-toggle"
              type="button"
              aria-label="Alternar menu"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth >= 992) {
                  // Em telas grandes, colapsa/expande sidebar fixa
                  onToggleSidebarDesktop && onToggleSidebarDesktop();
                } else {
                  // Em telas pequenas, abre/fecha painel deslizante
                  onToggleSidebar && onToggleSidebar();
                }
              }}
            >
              <span aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z"/></svg>
              </span>
            </button>
          )}
          <Link className="navbar-brand text-white navbar-brand-centered" to="/">TechBox - Sistema de Hospedagem</Link>
        </div>
        {/* Nav direita: exibe tipo de login e ações */}
        <div className="navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item me-3">
              <BackendStatus />
            </li>
            {loggedIn ? (
              <>
                {!isLoginRoute && (
                  <>
                    <li className="nav-item me-2">
                      <button
                        className="btn btn-outline-light brand-hover"
                        type="button"
                        aria-label="Sair"
                        title="Sair"
                        onClick={() => {
                          try {
                            const ok = window.confirm('Tem certeza que deseja sair?');
                            if (ok && onLogout) onLogout();
                          } catch {
                            if (onLogout) onLogout();
                          }
                        }}
                      >
                        <span aria-hidden>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 3a1 1 0 0 0-1 1v4h2V6h8v12H11v-2H9v4a1 1 0 0 0 1 1h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H10Zm.7 6.3L8 12l2.7 2.7L9.3 16l-4-4 4-4 1.4 1.3Z"/></svg>
                        </span>
                      </button>
                    </li>
                  </>
                )}
              </>
            ) : (
              !isLoginRoute ? (
                <li className="nav-item me-2">
                  <Link className="btn btn-outline-light" to="/login" aria-label="Login" title="Login">
                    <span className="me-1" aria-hidden>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17v2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5v2H5v10h5Zm10-7-4-4v3H9v2h7v3l4-4Z"/></svg>
                    </span>
                    Login
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
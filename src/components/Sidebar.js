import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../services/api';

const Sidebar = ({ currentUser, collapsed = false, open = false, compact = false, onLogout }) => {
  const avatarDefault = (process.env.PUBLIC_URL || '') + '/avatar-default.svg';
  const [cliente, setCliente] = useState({
    nome: 'Pousada Paraíso Açu',
    cnpj: '03.286.756/0001-37',
    // Evita erro 404 inicial: usa avatar padrão até carregar logo
    fotoUrl: avatarDefault
  });

  useEffect(() => {
    let isMounted = true;

    // 1) Perfil salvo localmente
    const savedPerfil = localStorage.getItem('cliente_perfil');
    if (savedPerfil) {
      try {
        const parsed = JSON.parse(savedPerfil);
        if (isMounted) setCliente(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        // mantém padrão se JSON inválido
      }
    }

    // 2) Configuração local (fallback quando backend indisponível)
    try {
      const savedCfg = JSON.parse(localStorage.getItem('cliente_config') || '{}');
      if (isMounted && savedCfg?.logoDataUrl) {
        setCliente(prev => ({ ...prev, fotoUrl: savedCfg.logoDataUrl }));
      }
      if (isMounted && savedCfg?.nome) {
        setCliente(prev => ({ ...prev, nome: savedCfg.nome }));
      }
      if (isMounted && savedCfg?.cnpj) {
        setCliente(prev => ({ ...prev, cnpj: savedCfg.cnpj }));
      }
    } catch {}

    // 3) Tenta carregar do backend, caso disponível
    (async () => {
      try {
        const cfg = await api.getConfig();
        if (!isMounted || !cfg) return;
        const next = {};
        if (cfg.logoDataUrl) next.fotoUrl = cfg.logoDataUrl;
        if (cfg.nome) next.nome = cfg.nome;
        if (cfg.cnpj) next.cnpj = cfg.cnpj;
        if (Object.keys(next).length) {
          setCliente(prev => ({ ...prev, ...next }));
        }
      } catch {}
    })();

    // 4) Garantir persistência dos padrões (nome/CNPJ) para outros módulos
    try {
      const perfilStr = localStorage.getItem('cliente_perfil');
      const perfil = perfilStr ? JSON.parse(perfilStr) : {};
      const nextPerfil = { ...perfil };
      if (!nextPerfil.nome) nextPerfil.nome = 'Pousada Paraíso Açu';
      if (!nextPerfil.cnpj) nextPerfil.cnpj = '03.286.756/0001-37';
      localStorage.setItem('cliente_perfil', JSON.stringify(nextPerfil));
    } catch {}
    try {
      const cfgStr = localStorage.getItem('cliente_config');
      const cfg = cfgStr ? JSON.parse(cfgStr) : {};
      let changed = false;
      if (!cfg.nome) { cfg.nome = 'Pousada Paraíso Açu'; changed = true; }
      if (!cfg.cnpj) { cfg.cnpj = '03.286.756/0001-37'; changed = true; }
      if (changed) localStorage.setItem('cliente_config', JSON.stringify(cfg));
    } catch {}

    return () => { isMounted = false; };
  }, []);

  // Removido controle de logout da Sidebar; permanece apenas no header

  const isGarcom = currentUser?.papel === 'garcom';
  const getTipoLabel = () => {
    const papel = (currentUser && currentUser.papel) || '';
    switch (papel) {
      case 'administrador': return 'Administrador';
      case 'gerente': return 'Gerente';
      case 'garcom': return 'Garçom';
      case 'relatorios': return 'Relatórios';
      default: return papel ? papel.charAt(0).toUpperCase() + papel.slice(1) : 'Usuário';
    }
  };

  return (
    <div className={`sidebar d-flex flex-column p-2 ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''} ${compact ? 'compact' : ''}`}>
      <div className="sidebar-profile d-flex flex-column align-items-center text-center mb-3">
        <img
          src={cliente.fotoUrl || avatarDefault}
          alt="Logo do Cliente"
          className="sidebar-avatar sidebar-avatar-large mb-2"
          onError={(e) => { e.currentTarget.src = avatarDefault; }}
        />
        <div className="sidebar-profile-text">
          <div className="sidebar-profile-name">{cliente.nome}</div>
          <div className="sidebar-profile-cnpj">CNPJ: {cliente.cnpj}</div>
        </div>
      </div>
      {/* Tipo de conta removido do sidebar conforme solicitação */}
      <ul className="nav nav-pills flex-column mb-auto">
        {/* Link de Acesso (QR) removido conforme solicitação */}
        {!isGarcom && (
        <li className="nav-item mb-2">
          <NavLink to="/" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M3 10.5l9-7 9 7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">Dashboard</span>
          </NavLink>
        </li>
        )}
        {!isGarcom && currentUser && currentUser.papel === 'administrador' && (
          <li className="nav-item mb-2">
            <NavLink to="/usuarios" className="nav-link text-white">
              <span className="nav-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 1a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.34-6 3v2h8v-2c0-1.66-2.67-3-6-3Zm8 0c-1.1 0-2.13.18-3 .5A5.22 5.22 0 0 1 16 16c3.33 0 6 1.34 6 3v2h-8v-2c0-1.66 2.67-3 6-3Z" fill="currentColor"/></svg>
              </span>
              <span className="nav-label">Usuários</span>
            </NavLink>
          </li>
        )}
        {!isGarcom && (
        <li className="nav-item mb-2">
          <NavLink to="/pms" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h18v4H3zM3 10h18v10H3z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">PMS (Quartos)</span>
          </NavLink>
        </li>
        )}
        {!isGarcom && (
        <li className="nav-item mb-2">
          <NavLink to="/pdv" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 4h10l1 4H6l1-4Zm-2 6h14l1 9H4l1-9Zm6 2v5h2v-5h-2Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">PDV (Vendas)</span>
          </NavLink>
        </li>
        )}
        {!isGarcom && (
        <li className="nav-item mb-2">
          <NavLink to="/stocks" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7Zm9 2 6-2-6-2-6 2 6 2Zm-7 2 7 3 7-3v4l-7 3-7-3v-4Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">Estoque</span>
          </NavLink>
        </li>
        )}
        {!isGarcom && (
        <li className="nav-item mb-2">
          <NavLink to="/eventos" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 2v2H5a2 2 0 0 0-2 2v1h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-4 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9H3Zm4 3h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">Eventos</span>
          </NavLink>
        </li>
        )}
        {!isGarcom && (!currentUser || (currentUser.papel !== 'gerente' && currentUser.papel !== 'relatorios')) && (
          <li className="nav-item mb-2">
            <NavLink to="/financeiro" className="nav-link text-white">
              <span className="nav-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v12H3V6Zm2 2v8h14V8H5Zm3 2h8v4H8v-4Z" fill="currentColor"/></svg>
              </span>
              <span className="nav-label">Financeiro</span>
            </NavLink>
          </li>
        )}
        {!isGarcom && (
        <li className="nav-item mb-2">
          <NavLink to="/relatorios" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h18v2H3V3Zm2 4h4v12H5V7Zm6 4h4v8h-4v-8Zm6-6h4v14h-4V5Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">Relatórios</span>
          </NavLink>
        </li>
        )}
        <li className="nav-item mb-2">
          <NavLink to="/restaurante" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 2h2v8a3 3 0 0 1-2 2v10H5V12a3 3 0 0 1-2-2V2h2v5h2V2Zm10 0h2v8h-2l-2 4v8h-2v-8l-2-4h2V2h2Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">Restaurante</span>
          </NavLink>
        </li>
        <li className="nav-item mb-2">
          <NavLink to="/cozinha" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h2v8H6V2Zm4 0h2v8h-2V2Zm4 0h2v8h-2V2Zm-8 10h10l-2 10H10L8 12Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">Cozinha</span>
          </NavLink>
        </li>
        {!isGarcom && (
        <li className="nav-item mb-2">
          <NavLink to="/configuracoes" className="nav-link text-white">
            <span className="nav-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9.4 4a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.5-2.4.5a7.9 7.9 0 0 0-1.7-1l-.4-2.5H11l-.4 2.5c-.6.2-1.1.5-1.7 1l-2.4-.5-2 3.5 2 1.5c0 .3-.1.7-.1 1s.1.7.1 1l-2 1.5 2 3.5 2.4-.5c.5.4 1.1.8 1.7 1l.4 2.5h4.8l.4-2.5c.6-.2 1.1-.5 1.7-1l2.4.5 2-3.5-2-1.5c.1-.3.2-.7.2-1Z" fill="currentColor"/></svg>
            </span>
            <span className="nav-label">Configurações</span>
          </NavLink>
        </li>
        )}
        {/* Logout removido do menu lateral */}
      </ul>
      {/* Modal de confirmação de logout removido */}
    </div>
  );
};

export default Sidebar;
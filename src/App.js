import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Configuracoes from './pages/Configuracoes';
import PMS from './pages/PMS';
import PDV from './pages/PDV';
import Stocks from './pages/Stocks';
import Eventos from './pages/Eventos';
import Financeiro from './pages/Financeiro';
import Restaurante from './pages/Restaurante';
// Removidos: páginas de QR Code
import TrackPedido from './pages/TrackPedido';
import Cozinha from './pages/Cozinha';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Relatorios from './pages/Relatorios';
import './App.css';
import './theme.css';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import LogoutOff from './pages/LogoutOff';
import ToastContainer from './components/ToastContainer';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // visibilidade móvel
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Detecta tipo de navegação para diferenciar reload de primeira abertura
    const navEntry = (typeof performance !== 'undefined' && performance.getEntriesByType) ? performance.getEntriesByType('navigation')[0] : null;
    const navType = navEntry?.type || 'navigate';
    const saved = localStorage.getItem('auth_logged_in') === 'true';
    const userStr = localStorage.getItem('auth_user');

    if (navType === 'reload') {
      // Reload da página: preserva sessão existente
      setLoggedIn(saved);
      if (userStr && saved) setCurrentUser(JSON.parse(userStr));
      if (!saved) navigate('/login');
    } else {
      // Navegação inicial (nova aba/abertura): exige login
      try {
        localStorage.setItem('auth_logged_in', 'false');
        localStorage.removeItem('auth_user');
      } catch {}
      setLoggedIn(false);
      setCurrentUser(null);
      // Permitir acesso público direto a rotas específicas (ex.: tracking)
      const publicPaths = ['/track'];
      const path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
      if (!publicPaths.includes(path)) {
        navigate('/login');
      }
    }
    const savedTheme = localStorage.getItem('site_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    const savedCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    // Em telas grandes, mantém menu aberto por padrão
    if (typeof window !== 'undefined' && window.innerWidth >= 992) {
      setSidebarCollapsed(false);
      localStorage.setItem('sidebar_collapsed', 'false');
    } else {
      setSidebarCollapsed(savedCollapsed);
    }
    const savedCompact = localStorage.getItem('sidebar_compact') === 'true';
    setSidebarCompact(savedCompact);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('site_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const toggleSidebarMobile = () => {
    setSidebarOpen(prev => !prev);
  };

  const toggleSidebarCompact = () => {
    const next = !sidebarCompact;
    setSidebarCompact(next);
    localStorage.setItem('sidebar_compact', String(next));
  };

  const handleLogin = (user) => {
    localStorage.setItem('auth_logged_in', 'true');
    localStorage.setItem('auth_user', JSON.stringify(user));
    setLoggedIn(true);
    setCurrentUser(user);
    if (user?.papel === 'cozinha') {
      navigate('/cozinha');
    } else if (user?.papel === 'garcom') {
      navigate('/restaurante');
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.setItem('auth_logged_in', 'false');
    localStorage.removeItem('auth_user');
    setLoggedIn(false);
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div className="App">
      <Navbar
        loggedIn={loggedIn}
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleSidebar={toggleSidebarMobile}
        onToggleSidebarDesktop={toggleSidebar}
        onToggleSidebarCompact={toggleSidebarCompact}
        isLoginRoute={location.pathname === '/login' || location.pathname === '/logoutoff' || location.pathname === '/track'}
      />
      <div className="container-fluid">
        <div className="row app-row">
          {loggedIn && currentUser?.papel !== 'cozinha' && currentUser?.papel !== 'garcom' && (
            <div className={'col-auto p-0 h-100'}>
      <Sidebar currentUser={currentUser} collapsed={sidebarCollapsed} open={sidebarOpen} compact={sidebarCompact} onLogout={handleLogout} />
            </div>
          )}
          <div className={loggedIn && currentUser?.papel !== 'cozinha' && currentUser?.papel !== 'garcom' ? `col main-content ${sidebarCollapsed ? 'with-sidebar-collapsed' : 'with-sidebar'} h-100` : 'col-12 main-content h-100'}>
            {loggedIn ? (
              currentUser?.papel === 'cozinha' ? (
                <Routes>
                  <Route path="/cozinha" element={<Cozinha />} />
                  <Route path="/logoutoff" element={<LogoutOff onLogout={handleLogout} />} />
                  <Route path="*" element={<Navigate to="/cozinha" replace />} />
                </Routes>
              ) : currentUser?.papel === 'garcom' ? (
                <Routes>
                  <Route path="/restaurante" element={<Restaurante />} />
                  <Route path="/cozinha" element={<Cozinha />} />
                  <Route path="/track" element={<TrackPedido />} />
                  <Route path="/logoutoff" element={<LogoutOff onLogout={handleLogout} />} />
                  <Route path="*" element={<Navigate to="/restaurante" replace />} />
                </Routes>
              ) : (
                <Routes>
                  <Route path="/" element={<Dashboard currentUser={currentUser} />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/pms" element={<PMS />} />
                  <Route path="/pdv" element={<PDV />} />
                  <Route path="/stocks" element={<Stocks />} />
                  <Route path="/eventos" element={<Eventos />} />
                  {(currentUser?.papel !== 'gerente' && currentUser?.papel !== 'relatorios') ? (
                    <Route path="/financeiro" element={<Financeiro />} />
                  ) : (
                    <Route path="/financeiro" element={<Navigate to="/" replace />} />
                  )}
                  <Route path="/restaurante" element={<Restaurante />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/track" element={<TrackPedido />} />
                  <Route path="/cozinha" element={<Cozinha />} />
                  <Route path="/logoutoff" element={<LogoutOff onLogout={handleLogout} />} />
                  {currentUser?.papel === 'administrador' && (
                    <Route path="/usuarios" element={<Usuarios currentUser={currentUser} />} />
                  )}
                  <Route path="/login" element={<Navigate to="/" replace />} />
                </Routes>
              )
            ) : (
              <Routes>
                <Route path="/track" element={<TrackPedido />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/logoutoff" element={<LogoutOff onLogout={handleLogout} />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            )}
          </div>
        </div>
      </div>
      {/* Overlay para mobile quando sidebar aberto */}
      {loggedIn && currentUser?.papel !== 'cozinha' && currentUser?.papel !== 'garcom' && (
        <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      )}
      <Footer />
      <ToastContainer />
      {loggedIn && location.pathname !== '/login' && location.pathname !== '/logoutoff' && (
        <ChatWidget />
      )}
    </div>
  );
}

export default App;
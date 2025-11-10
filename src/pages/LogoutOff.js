import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LogoutOff = ({ onLogout }) => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Se existir handler central, usa-o
      if (typeof onLogout === 'function') {
        onLogout();
      } else {
        // Fallback: limpa storage e vai para login
        localStorage.setItem('auth_logged_in', 'false');
        localStorage.removeItem('auth_user');
        navigate('/login', { replace: true });
      }
    } catch {
      navigate('/login', { replace: true });
    }
  }, [onLogout, navigate]);

  return (
    <div className="container py-5 text-center">
      <p>Saindo...</p>
    </div>
  );
};

export default LogoutOff;
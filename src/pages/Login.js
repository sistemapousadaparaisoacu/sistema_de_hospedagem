import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const Login = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const users = await api.list('users');
      const found = users.find(u => (u.usuario === usuario || u.username === usuario) && u.senha === password);
    if (found) {
      onLogin && onLogin(found);
    } else {
      alert('Credenciais inválidas.');
    }
    } catch (err) {
      alert('Falha ao consultar usuários na API. Verifique o backend.');
      console.error(err);
    }
  };

  return (
    <div className="container-fluid login-wrapper">
      <div className="row w-100 justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
          <div className="card login-card shadow-lg">
            <div className="card-header text-white login-card-header">
              <h5 className="m-0">Login</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Usuário ou Email</label>
                  <input
                    type="text"
                    className="form-control"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Ex.: admin"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Senha</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">Entrar</button>
                <div className="mt-3 text-center">
                  <Link to="/acesso" className="btn btn-outline-secondary w-100" aria-label="Acesso (QR)" title="Acesso (QR)">
                    <span className="me-1" aria-hidden>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm10 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z"/></svg>
                    </span>
                    Acesso (QR)
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
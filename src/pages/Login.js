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
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

// Valores internos permanecem os mesmos; rótulos exibidos são amigáveis.
const ROLES = [
  { value: 'garcom', label: 'Balcão' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'cozinha', label: 'Cozinha' },
];

const roleLabel = (value) => {
  const r = ROLES.find(r => r.value === value);
  return r ? r.label : value;
};

const Usuarios = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState('gerente');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFields, setEditFields] = useState({ nome: '', usuario: '', papel: '', senha: '' });
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let es;
    const load = async () => {
      try {
        const list = await api.list('users');
        setUsers(list);
      } catch (err) {
        console.error('Erro ao carregar usuários da API', err);
      }
    };
    load();
    // SSE para atualizações instantâneas
    try {
      const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
      es = new EventSource(`${base}/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.resource === 'users') {
            if (msg.action === 'create' && msg.item) {
              setUsers(prev => {
                const exists = prev.some(u => String(u.id) === String(msg.item.id));
                return exists ? prev.map(u => (String(u.id) === String(msg.item.id) ? msg.item : u)) : [...prev, msg.item];
              });
            } else if (msg.action === 'update' && msg.item) {
              setUsers(prev => prev.map(u => (String(u.id) === String(msg.item.id) ? msg.item : u)));
            } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
              setUsers(prev => prev.filter(u => String(u.id) !== String(msg.id)));
            }
          }
        } catch (e) {
          // Ignora mensagens malformadas
        }
      };
    } catch (err) {
      console.error('Falha ao iniciar SSE para usuários', err);
    }
    return () => {
      if (es) {
        try { es.close(); } catch {}
      }
    };
  }, []);

  const validateForm = () => {
    const errs = {};
    if (!nome.trim()) errs.nome = 'Informe o nome.';
    if (!usuario.trim()) {
      errs.usuario = 'Informe o usuário.';
    } else if (users.some(u => u.usuario === usuario)) {
      errs.usuario = 'Usuário já existente.';
    }
    if (!senha) errs.senha = 'Informe a senha.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const newUser = { nome, usuario, senha, papel };
    try {
      const created = await api.create('users', newUser);
      setUsers(prev => [...prev, created]);
    } catch (err) {
      console.error('Erro ao criar usuário', err);
      setFeedback({ type: 'danger', message: 'Falha ao criar usuário. Verifique o backend.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    setNome('');
    setUsuario('');
    setSenha('');
    setPapel('gerente');
    setErrors({});
    setFeedback({ type: 'success', message: 'Usuário criado com sucesso.' });
    setTimeout(() => setFeedback(null), 2500);
  };

  const removeUser = async (idx) => {
    const user = users[idx];
    // Não permitir remover admin padrão
    if (user.usuario === 'admin' && user.papel === 'administrador') {
      alert('Não é permitido remover o administrador padrão.');
      return;
    }
    if (!window.confirm(`Excluir usuário "${user.usuario}"?`)) {
      return;
    }
    try {
      await api.remove('users', user.id);
      const updated = users.filter((_, i) => i !== idx);
      setUsers(updated);
    } catch (err) {
      console.error('Erro ao excluir usuário', err);
      setFeedback({ type: 'danger', message: 'Falha ao excluir usuário.' });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    setFeedback({ type: 'success', message: 'Usuário excluído com sucesso.' });
    setTimeout(() => setFeedback(null), 2500);
  };

  const startEdit = (idx) => {
    const u = users[idx];
    setEditingIndex(idx);
    setEditFields({ nome: u.nome, usuario: u.usuario, papel: u.papel, senha: '' });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditFields({ nome: '', usuario: '', papel: '', senha: '' });
  };

  const saveEdit = async () => {
    const idx = editingIndex;
    if (idx === null) return;
    const current = users[idx];
    if (!editFields.nome.trim()) {
      setFeedback({ type: 'danger', message: 'Informe o nome.' });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    if (editFields.usuario === 'admin' && editFields.papel !== 'administrador') {
      setFeedback({ type: 'danger', message: 'Não é permitido alterar o papel do administrador padrão.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    const updatedUser = {
      ...current,
      nome: editFields.nome,
      papel: editFields.papel,
      senha: editFields.senha ? editFields.senha : current.senha,
    };
    try {
      const saved = await api.update('users', current.id, { nome: updatedUser.nome, papel: updatedUser.papel, senha: updatedUser.senha });
      const updated = users.map((u, i) => (i === idx ? saved : u));
      setUsers(updated);
    } catch (err) {
      console.error('Erro ao salvar usuário', err);
      setFeedback({ type: 'danger', message: 'Falha ao salvar alterações.' });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    setFeedback({ type: 'success', message: 'Usuário atualizado com sucesso.' });
    setTimeout(() => setFeedback(null), 2500);
    cancelEdit();
  };

  if (!currentUser || currentUser.papel !== 'administrador') {
    return (
      <div className="container-fluid">
        <div className="page-header mb-4"><h2 className="m-0">Usuários</h2></div>
        <div className="alert alert-warning">Acesso restrito ao administrador.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="page-header mb-3"><h2 className="m-0">Usuários</h2></div>
      {feedback && (
        <div className={`alert alert-${feedback.type} alert-dismissible fade show`} role="alert">
          {feedback.message}
          <button type="button" className="btn-close" onClick={() => setFeedback(null)} aria-label="Close"></button>
        </div>
      )}
      <div className="row">
        <div className="col-md-6">
          <div className="card dashboard-card mb-3">
            <div className="card-body">
              <h5 className="card-title">Cadastrar novo usuário</h5>
              <form onSubmit={addUser}>
                <div className="mb-2">
                  <label className="form-label">Nome</label>
                  <input className={`form-control form-control-sm ${errors.nome ? 'is-invalid' : ''}`} value={nome} onChange={e => setNome(e.target.value)} />
                  {errors.nome && <div className="form-text text-danger">{errors.nome}</div>}
                </div>
                <div className="row g-2">
                  <div className="col-sm-6">
                    <div className="mb-2">
                      <label className="form-label">Usuário</label>
                      <input className={`form-control form-control-sm ${errors.usuario ? 'is-invalid' : ''}`} value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Ex.: gerente01" />
                      {errors.usuario && <div className="form-text text-danger">{errors.usuario}</div>}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="mb-2">
                      <label className="form-label">Senha</label>
                      <div className="position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control form-control-sm ${errors.senha ? 'is-invalid' : ''}`}
                          value={senha}
                          onChange={e => setSenha(e.target.value)}
                          style={{ paddingRight: '2rem' }}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(s => !s)}
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showPassword ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-7 11-7c2.3 0 4.4.6 6.3 1.6" />
                              <path d="M23 12s-4 7-11 7c-2.3 0-4.4-.6-6.3-1.6" />
                              <circle cx="12" cy="12" r="3" />
                              <path d="M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.senha && <div className="form-text text-danger">{errors.senha}</div>}
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">Papel</label>
                  <select className="form-select form-select-sm" value={papel} onChange={e => setPapel(e.target.value)}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" type="submit">Adicionar</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Usuários cadastrados</h5>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Usuário</th>
                      <th>Papel</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={`${u.usuario}-${idx}`}>
                        {editingIndex === idx ? (
                          <>
                            <td>
                              <input className="form-control form-control-sm" value={editFields.nome} onChange={e => setEditFields({ ...editFields, nome: e.target.value })} />
                            </td>
                            <td>
                              <input className="form-control form-control-sm" value={editFields.usuario} disabled />
                            </td>
                            <td>
                              <div className="d-flex gap-2 align-items-center">
                                <select className="form-select form-select-sm" value={editFields.papel} onChange={e => setEditFields({ ...editFields, papel: e.target.value })} disabled={editFields.usuario === 'admin'}>
                                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                                <input type="password" className="form-control form-control-sm" placeholder="Nova senha (opcional)" value={editFields.senha} onChange={e => setEditFields({ ...editFields, senha: e.target.value })} />
                              </div>
                            </td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm" role="group">
                                <button className="btn btn-secondary" onClick={saveEdit}>Salvar</button>
                                <button className="btn btn-light" onClick={cancelEdit}>Cancelar</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{u.nome}</td>
                            <td>{u.usuario}</td>
                            <td>{roleLabel(u.papel)}</td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm" role="group">
                                <button className="btn btn-outline-secondary" onClick={() => startEdit(idx)}>Editar</button>
                                <button className="btn btn-danger" onClick={() => removeUser(idx)}>Excluir</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
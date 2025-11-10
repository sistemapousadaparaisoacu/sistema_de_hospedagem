import React, { useEffect, useState } from 'react';
import { api, Resources } from '../services/api';

const Stocks = () => {
  // Estado inicial dos produtos em estoque
  const [produtos, setProdutos] = useState([
    { id: 1, nome: 'Toalha', categoria: 'Quarto', quantidade: 50, minimo: 20, unidade: 'un' },
    { id: 2, nome: 'Sabonete', categoria: 'Higiene', quantidade: 15, minimo: 30, unidade: 'un' },
    { id: 3, nome: 'Shampoo', categoria: 'Higiene', quantidade: 25, minimo: 20, unidade: 'un' },
    { id: 4, nome: 'Papel Higiênico', categoria: 'Higiene', quantidade: 40, minimo: 30, unidade: 'rolos' },
    { id: 5, nome: 'Lençol', categoria: 'Quarto', quantidade: 35, minimo: 20, unidade: 'un' },
    { id: 6, nome: 'Travesseiro', categoria: 'Quarto', quantidade: 18, minimo: 15, unidade: 'un' },
    { id: 7, nome: 'Água Mineral', categoria: 'Bebidas', quantidade: 80, minimo: 50, unidade: 'garrafas' },
    { id: 8, nome: 'Refrigerante', categoria: 'Bebidas', quantidade: 45, minimo: 30, unidade: 'latas' },
    { id: 9, nome: 'Café', categoria: 'Alimentos', quantidade: 10, minimo: 15, unidade: 'kg' },
    { id: 10, nome: 'Açúcar', categoria: 'Alimentos', quantidade: 8, minimo: 10, unidade: 'kg' },
  ]);

  const [produtoEditando, setProdutoEditando] = useState(null);
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    categoria: '',
    quantidade: 0,
    minimo: 0,
    unidade: ''
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  // Carregar estoque do backend
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const list = await api.list(Resources.Inventory);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setProdutos(list);
        }
      } catch {
        // Mantém seed local caso backend indisponível
      }
    })();
    // SSE: atualizações instantâneas do recurso inventory
    let es;
    try {
      const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
      es = new EventSource(`${base}/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.resource === 'inventory') {
            if (msg.action === 'create' && msg.item) {
              setProdutos(prev => {
                const exists = prev.some(p => String(p.id) === String(msg.item.id));
                return exists ? prev.map(p => (String(p.id) === String(msg.item.id) ? msg.item : p)) : [...prev, msg.item];
              });
            } else if (msg.action === 'update' && msg.item) {
              setProdutos(prev => prev.map(p => (String(p.id) === String(msg.item.id) ? msg.item : p)));
            } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
              setProdutos(prev => prev.filter(p => String(p.id) !== String(msg.id)));
            }
          }
        } catch {}
      };
    } catch {}
    return () => { isMounted = false; if (es) { try { es.close(); } catch {} } };
  }, []);

  // Filtrar produtos
  const produtosFiltrados = produtos
    .filter(produto => {
      if (filtro === 'todos') return true;
      if (filtro === 'criticos') return produto.quantidade <= produto.minimo;
      return false;
    })
    .filter(produto => 
      produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
      produto.categoria.toLowerCase().includes(busca.toLowerCase())
    );

  // Adicionar novo produto
  const adicionarProduto = async (e) => {
    e.preventDefault();
    const payload = { ...novoProduto };
    try {
      const created = await api.create(Resources.Inventory, payload);
      setProdutos([...produtos, created]);
    } catch {
      const id = produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
      setProdutos([...produtos, { ...payload, id }]);
      alert('Backend indisponível. Produto adicionado apenas localmente.');
    }
    setNovoProduto({ nome: '', categoria: '', quantidade: 0, minimo: 0, unidade: '' });
    setMostrarFormulario(false);
  };

  // Iniciar edição de produto
  const iniciarEdicao = (produto) => {
    setProdutoEditando({ ...produto });
  };

  // Salvar edição de produto
  const salvarEdicao = async () => {
    try {
      const updated = await api.update(Resources.Inventory, produtoEditando.id, produtoEditando);
      setProdutos(produtos.map(p => p.id === updated.id ? updated : p));
    } catch {
      setProdutos(produtos.map(p => p.id === produtoEditando.id ? produtoEditando : p));
      alert('Falha ao salvar no backend. Alteração aplicada somente localmente.');
    }
    setProdutoEditando(null);
  };

  // Cancelar edição
  const cancelarEdicao = () => {
    setProdutoEditando(null);
  };

  // Excluir produto
  const excluirProduto = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.remove(Resources.Inventory, id);
    } catch {
      // Ignora erro de backend; remove localmente mesmo assim
    }
    setProdutos(produtos.filter(p => p.id !== id));
    try { window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Produto de estoque excluído.' } })); } catch {}
  };

  // Atualizar campo do produto em edição
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setProdutoEditando({
      ...produtoEditando,
      [name]: name === 'quantidade' || name === 'minimo' ? parseInt(value) : value
    });
  };

  // Atualizar campo do novo produto
  const handleNovoChange = (e) => {
    const { name, value } = e.target;
    setNovoProduto({
      ...novoProduto,
      [name]: name === 'quantidade' || name === 'minimo' ? parseInt(value) : value
    });
  };

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Controle de Estoque</h2>
      
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h5 className="card-title">Total de Produtos</h5>
              <h3>{produtos.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-danger text-white">
            <div className="card-body">
              <h5 className="card-title">Produtos Críticos</h5>
              <h3>{produtos.filter(p => p.quantidade <= p.minimo).length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-success text-white">
            <div className="card-body">
              <h5 className="card-title">Produtos OK</h5>
              <h3>{produtos.filter(p => p.quantidade > p.minimo).length}</h3>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card mb-4">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <button 
                className={`btn btn-sm me-2 ${filtro === 'todos' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFiltro('todos')}
              >
                Todos
              </button>
              <button 
                className={`btn btn-sm ${filtro === 'criticos' ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => setFiltro('criticos')}
              >
                Críticos
              </button>
            </div>
            <div className="d-flex">
              <input
                type="text"
                className="form-control form-control-sm me-2"
                placeholder="Buscar produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <button 
                className="btn btn-success btn-sm"
                onClick={() => setMostrarFormulario(true)}
              >
                Novo Produto
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body">
          <div className="table-container">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Quantidade</th>
                  <th>Mínimo</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map(produto => (
                  <tr key={produto.id} className={produto.quantidade <= produto.minimo ? 'stock-alert' : ''}>
                    <td>{produto.id}</td>
                    <td>{produto.nome}</td>
                    <td>{produto.categoria}</td>
                    <td>{produto.quantidade}</td>
                    <td>{produto.minimo}</td>
                    <td>{produto.unidade}</td>
                    <td>
                      {produto.quantidade <= produto.minimo ? (
                        <span className="badge bg-danger">Crítico</span>
                      ) : (
                        <span className="badge bg-success">OK</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary me-1"
                        onClick={() => iniciarEdicao(produto)}
                      >
                        Editar
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => excluirProduto(produto.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Modal para adicionar novo produto */}
      {mostrarFormulario && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Novo Produto</h5>
                <button type="button" className="btn-close" onClick={() => setMostrarFormulario(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={adicionarProduto}>
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="nome" 
                      value={novoProduto.nome}
                      onChange={handleNovoChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Categoria</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="categoria" 
                      value={novoProduto.categoria}
                      onChange={handleNovoChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Quantidade</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="quantidade" 
                      value={novoProduto.quantidade}
                      onChange={handleNovoChange}
                      required
                      min="0"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Quantidade Mínima</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="minimo" 
                      value={novoProduto.minimo}
                      onChange={handleNovoChange}
                      required
                      min="0"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Unidade</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="unidade" 
                      value={novoProduto.unidade}
                      onChange={handleNovoChange}
                      required
                    />
                  </div>
                  
                  <div className="d-flex justify-content-end">
                    <button type="button" className="btn btn-secondary me-2" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Adicionar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {mostrarFormulario && <div className="modal-backdrop fade show"></div>}
      
      {/* Modal para editar produto */}
      {produtoEditando && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Editar Produto</h5>
                <button type="button" className="btn-close" onClick={cancelarEdicao}></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="nome" 
                      value={produtoEditando.nome}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Categoria</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="categoria" 
                      value={produtoEditando.categoria}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Quantidade</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="quantidade" 
                      value={produtoEditando.quantidade}
                      onChange={handleEditChange}
                      required
                      min="0"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Quantidade Mínima</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="minimo" 
                      value={produtoEditando.minimo}
                      onChange={handleEditChange}
                      required
                      min="0"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Unidade</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="unidade" 
                      value={produtoEditando.unidade}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <button type="button" className="btn btn-outline-danger" onClick={() => { excluirProduto(produtoEditando.id); setProdutoEditando(null); }}>Excluir</button>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-secondary" onClick={cancelarEdicao}>Cancelar</button>
                      <button type="button" className="btn btn-primary" onClick={salvarEdicao}>Salvar</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {produtoEditando && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Stocks;
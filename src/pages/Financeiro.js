import React, { useEffect, useState } from 'react';
import { api, Resources } from '../services/api';

const Financeiro = () => {
  // Estado inicial das transações financeiras
  const [transacoes, setTransacoes] = useState([
    { 
      id: 1, 
      tipo: 'receita', 
      categoria: 'Hospedagem', 
      descricao: 'Reserva quarto 101 - João Silva', 
      valor: 350.00, 
      data: '2023-05-01',
      formaPagamento: 'Cartão de Crédito',
      status: 'confirmado'
    },
    { 
      id: 2, 
      tipo: 'receita', 
      categoria: 'Restaurante', 
      descricao: 'Consumo restaurante - Mesa 5', 
      valor: 175.50, 
      data: '2023-05-01',
      formaPagamento: 'Dinheiro',
      status: 'confirmado'
    },
    { 
      id: 3, 
      tipo: 'despesa', 
      categoria: 'Fornecedores', 
      descricao: 'Compra de insumos para cozinha', 
      valor: 850.75, 
      data: '2023-05-02',
      formaPagamento: 'Transferência',
      status: 'confirmado'
    },
    { 
      id: 4, 
      tipo: 'despesa', 
      categoria: 'Manutenção', 
      descricao: 'Reparo ar-condicionado quarto 203', 
      valor: 320.00, 
      data: '2023-05-03',
      formaPagamento: 'Boleto',
      status: 'pendente'
    },
    { 
      id: 5, 
      tipo: 'receita', 
      categoria: 'Eventos', 
      descricao: 'Aluguel salão para conferência', 
      valor: 2500.00, 
      data: '2023-05-05',
      formaPagamento: 'Transferência',
      status: 'confirmado'
    }
  ]);

  // Carregar transações do backend na inicialização (sobrescreve mock)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const server = await api.list(Resources.Transactions);
        if (isMounted && Array.isArray(server)) setTransacoes(server);
      } catch {
        // mantém mock local
      }
    })();
    // SSE: atualizações instantâneas do recurso transactions
    let es;
    try {
      const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
      es = new EventSource(`${base}/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.resource === 'transactions') {
            if (msg.action === 'create' && msg.item) {
              setTransacoes(prev => {
                const exists = prev.some(t => String(t.id) === String(msg.item.id));
                return exists ? prev.map(t => (String(t.id) === String(msg.item.id) ? msg.item : t)) : [...prev, msg.item];
              });
            } else if (msg.action === 'update' && msg.item) {
              setTransacoes(prev => prev.map(t => (String(t.id) === String(msg.item.id) ? msg.item : t)));
            } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
              setTransacoes(prev => prev.filter(t => String(t.id) !== String(msg.id)));
            }
          }
        } catch {}
      };
    } catch {}
    return () => { isMounted = false; if (es) { try { es.close(); } catch {} } };
  }, []);

  // Estado para nova transação
  const [novaTransacao, setNovaTransacao] = useState({
    tipo: 'receita',
    categoria: '',
    descricao: '',
    valor: '',
    data: '',
    formaPagamento: '',
    status: 'confirmado'
  });

  // Estado para filtros
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    dataInicio: '',
    dataFim: '',
    status: 'todos'
  });

  // Estado para modo de edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [transacaoEditando, setTransacaoEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Opções para categorias
  const categorias = {
    receita: ['Hospedagem', 'Restaurante', 'Bar', 'Eventos', 'Serviços', 'Outros'],
    despesa: ['Fornecedores', 'Funcionários', 'Manutenção', 'Utilidades', 'Impostos', 'Marketing', 'Outros']
  };

  // Opções para formas de pagamento
  const formasPagamento = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência', 'PIX', 'Boleto', 'Faturado'];

  // Função para abrir formulário de nova transação
  const abrirFormularioTransacao = () => {
    setModoEdicao(false);
    setTransacaoEditando(null);
    setNovaTransacao({
      tipo: 'receita',
      categoria: '',
      descricao: '',
      valor: '',
      data: '',
      formaPagamento: '',
      status: 'confirmado'
    });
    setMostrarFormulario(true);
  };

  // Função para abrir formulário de edição
  const editarTransacao = (transacao) => {
    setModoEdicao(true);
    setTransacaoEditando(transacao);
    setNovaTransacao({ ...transacao });
    setMostrarFormulario(true);
  };

  // Função para salvar transação
  const salvarTransacao = async (e) => {
    e.preventDefault();
    
    const transacaoParaSalvar = {
      ...novaTransacao,
      valor: parseFloat(novaTransacao.valor)
    };
    
    if (modoEdicao) {
      // Atualizar transação existente
      try {
        const updated = await api.update(Resources.Transactions, transacaoEditando.id, transacaoParaSalvar);
        setTransacoes(transacoes.map(t => t.id === transacaoEditando.id ? updated : t));
      } catch {
        // fallback local
        setTransacoes(transacoes.map(t => 
          t.id === transacaoEditando.id ? { ...transacaoParaSalvar, id: t.id } : t
        ));
      }
    } else {
      // Adicionar nova transação
      try {
        const created = await api.create(Resources.Transactions, transacaoParaSalvar);
        setTransacoes([...transacoes, created]);
      } catch {
        const id = transacoes.length > 0 ? Math.max(...transacoes.map(t => t.id)) + 1 : 1;
        setTransacoes([...transacoes, { ...transacaoParaSalvar, id }]);
      }
    }
    
    setMostrarFormulario(false);
  };

  // Função para excluir transação
  const excluirTransacao = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        await api.remove(Resources.Transactions, id);
      } catch {}
      setTransacoes(transacoes.filter(t => t.id !== id));
    }
  };

  // Função para alternar status da transação
  const alternarStatus = async (id) => {
    const atual = transacoes.find(t => t.id === id);
    if (!atual) return;
    const novo = { ...atual, status: atual.status === 'confirmado' ? 'pendente' : 'confirmado' };
    try {
      const updated = await api.update(Resources.Transactions, id, { status: novo.status });
      setTransacoes(transacoes.map(t => t.id === id ? updated : t));
    } catch {
      setTransacoes(transacoes.map(t => t.id === id ? novo : t));
    }
  };

  // Função para atualizar campos da nova transação
  const handleTransacaoChange = (e) => {
    const { name, value } = e.target;
    setNovaTransacao({
      ...novaTransacao,
      [name]: value
    });
  };

  // Função para atualizar filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: value
    });
  };

  // Função para aplicar filtros às transações
  const transacoesFiltradas = transacoes.filter(transacao => {
    // Filtro por tipo
    if (filtros.tipo !== 'todos' && transacao.tipo !== filtros.tipo) {
      return false;
    }
    
    // Filtro por data de início
    if (filtros.dataInicio && new Date(transacao.data) < new Date(filtros.dataInicio)) {
      return false;
    }
    
    // Filtro por data de fim
    if (filtros.dataFim && new Date(transacao.data) > new Date(filtros.dataFim)) {
      return false;
    }
    
    // Filtro por status
    if (filtros.status !== 'todos' && transacao.status !== filtros.status) {
      return false;
    }
    
    return true;
  });

  // Cálculo de totais
  const totalReceitas = transacoesFiltradas
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + t.valor, 0);
    
  const totalDespesas = transacoesFiltradas
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + t.valor, 0);
    
  const saldo = totalReceitas - totalDespesas;

  // Lista simples de funcionários (mock)
  const funcionarios = [
    { id: 'f1', nome: 'Ana Souza', cargo: 'Recepção' },
    { id: 'f2', nome: 'Bruno Lima', cargo: 'Cozinha' },
    { id: 'f3', nome: 'Carla Mendes', cargo: 'Limpeza' },
    { id: 'f4', nome: 'Diego Santos', cargo: 'Manutenção' },
  ];

  const [pagFuncionario, setPagFuncionario] = useState({
    funcionarioId: '',
    valor: '',
    data: '',
    formaPagamento: '',
    status: 'confirmado',
  });
  const handlePagFuncionarioChange = (e) => {
    const { name, value } = e.target;
    setPagFuncionario(prev => ({ ...prev, [name]: value }));
  };
  const pagarFuncionario = (e) => {
    e.preventDefault();
    const func = funcionarios.find(f => f.id === pagFuncionario.funcionarioId);
    if (!func || !pagFuncionario.valor || !pagFuncionario.data || !pagFuncionario.formaPagamento) {
      alert('Preencha funcionário, valor, data e forma de pagamento.');
      return;
    }
    const id = transacoes.length > 0 ? Math.max(...transacoes.map(t => t.id)) + 1 : 1;
    const nova = {
      id,
      tipo: 'despesa',
      categoria: 'Funcionários',
      descricao: `Pagamento salário - ${func.nome} (${func.cargo})`,
      valor: parseFloat(pagFuncionario.valor),
      data: pagFuncionario.data,
      formaPagamento: pagFuncionario.formaPagamento,
      status: pagFuncionario.status || 'confirmado',
    };
    setTransacoes(prev => [...prev, nova]);
    setPagFuncionario({ funcionarioId: '', valor: '', data: '', formaPagamento: '', status: 'confirmado' });
    alert('Pagamento de funcionário lançado como despesa.');
  };

  return (
    <div className="container-fluid">
      <div className="page-header">
        <h2 className="m-0">Gestão Financeira</h2>
      </div>
      
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card bg-success text-white">
            <div className="card-body">
              <h5 className="card-title">Total de Receitas</h5>
              <h3 className="card-text">R$ {totalReceitas.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-danger text-white">
            <div className="card-body">
              <h5 className="card-title">Total de Despesas</h5>
              <h3 className="card-text">R$ {totalDespesas.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h5 className="card-title">Saldo</h5>
              <h3 className="card-text">R$ {saldo.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        {/* Pagamentos de Funcionários */}
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5>Pagamentos de Funcionários</h5>
            </div>
            <div className="card-body">
              <form onSubmit={pagarFuncionario}>
                <div className="row g-3 align-items-end">
                  <div className="col-md-3">
                    <label className="form-label">Funcionário</label>
                    <select className="form-select" name="funcionarioId" value={pagFuncionario.funcionarioId} onChange={handlePagFuncionarioChange} required>
                      <option value="">Selecione</option>
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.id}>{f.nome} - {f.cargo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Valor (R$)</label>
                    <input type="number" className="form-control" name="valor" value={pagFuncionario.valor} onChange={handlePagFuncionarioChange} step="0.01" min="0.01" required />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Data</label>
                    <input type="date" className="form-control" name="data" value={pagFuncionario.data} onChange={handlePagFuncionarioChange} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Forma de Pagamento</label>
                    <select className="form-select" name="formaPagamento" value={pagFuncionario.formaPagamento} onChange={handlePagFuncionarioChange} required>
                      <option value="">Selecione</option>
                      {formasPagamento.map(forma => (
                        <option key={forma} value={forma}>{forma}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <button type="submit" className="btn btn-primary w-100">Pagar Funcionário</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5>Filtros</h5>
              <button 
                className="btn btn-success"
                onClick={abrirFormularioTransacao}
              >
                Nova Transação
              </button>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-3">
                  <label className="form-label">Tipo</label>
                  <select 
                    className="form-select" 
                    name="tipo" 
                    value={filtros.tipo}
                    onChange={handleFiltroChange}
                  >
                    <option value="todos">Todos</option>
                    <option value="receita">Receitas</option>
                    <option value="despesa">Despesas</option>
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Data Início</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    name="dataInicio" 
                    value={filtros.dataInicio}
                    onChange={handleFiltroChange}
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Data Fim</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    name="dataFim" 
                    value={filtros.dataFim}
                    onChange={handleFiltroChange}
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select" 
                    name="status" 
                    value={filtros.status}
                    onChange={handleFiltroChange}
                  >
                    <option value="todos">Todos</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Transações</h5>
            </div>
            <div className="card-body">
              {transacoesFiltradas.length === 0 ? (
                <p className="text-center">Nenhuma transação encontrada</p>
              ) : (
                <div className="table-container">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Categoria</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Forma de Pagamento</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacoesFiltradas.map(transacao => (
                        <tr key={transacao.id}>
                          <td>{transacao.data}</td>
                          <td>
                            <span className={`badge ${transacao.tipo === 'receita' ? 'bg-success' : 'bg-danger'}`}>
                              {transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td>{transacao.categoria}</td>
                          <td>{transacao.descricao}</td>
                          <td>R$ {transacao.valor.toFixed(2)}</td>
                          <td>{transacao.formaPagamento}</td>
                          <td>
                            <span 
                              className={`badge ${transacao.status === 'confirmado' ? 'bg-success' : 'bg-warning'}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => alternarStatus(transacao.id)}
                            >
                              {transacao.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-primary me-1"
                              onClick={() => editarTransacao(transacao)}
                            >
                              Editar
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => excluirTransacao(transacao.id)}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal para adicionar/editar transação */}
      {mostrarFormulario && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modoEdicao ? 'Editar Transação' : 'Nova Transação'}</h5>
                <button type="button" className="btn-close" onClick={() => setMostrarFormulario(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={salvarTransacao}>
                  <div className="mb-3">
                    <label className="form-label">Tipo</label>
                    <select 
                      className="form-select" 
                      name="tipo" 
                      value={novaTransacao.tipo}
                      onChange={handleTransacaoChange}
                      required
                    >
                      <option value="receita">Receita</option>
                      <option value="despesa">Despesa</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Categoria</label>
                    <select 
                      className="form-select" 
                      name="categoria" 
                      value={novaTransacao.categoria}
                      onChange={handleTransacaoChange}
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias[novaTransacao.tipo].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Descrição</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="descricao" 
                      value={novaTransacao.descricao}
                      onChange={handleTransacaoChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Valor (R$)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="valor" 
                      value={novaTransacao.valor}
                      onChange={handleTransacaoChange}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Data</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      name="data" 
                      value={novaTransacao.data}
                      onChange={handleTransacaoChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Forma de Pagamento</label>
                    <select 
                      className="form-select" 
                      name="formaPagamento" 
                      value={novaTransacao.formaPagamento}
                      onChange={handleTransacaoChange}
                      required
                    >
                      <option value="">Selecione uma forma de pagamento</option>
                      {formasPagamento.map(forma => (
                        <option key={forma} value={forma}>{forma}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-select" 
                      name="status" 
                      value={novaTransacao.status}
                      onChange={handleTransacaoChange}
                      required
                    >
                      <option value="confirmado">Confirmado</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>
                  
                  <div className="d-flex justify-content-end">
                    <button type="button" className="btn btn-secondary me-2" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Salvar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {mostrarFormulario && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Financeiro;
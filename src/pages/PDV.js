import React, { useState, useEffect, useRef } from 'react';
import { api, Resources } from '../services/api';
import { limparNumero, gerarLinkWhatsApp, obterWhatsAppPrincipalDoQuartoId, montarReciboMsg } from '../utils/whatsapp';

const PDV = () => {
  // Produtos disponíveis para venda
  const [produtos, setProdutos] = useState([
    { id: 1, nome: 'Toalha Extra', categoria: 'Quarto', preco: 25.00, estoque: 50 },
    { id: 2, nome: 'Kit Amenities', categoria: 'Quarto', preco: 35.00, estoque: 40 },
    { id: 3, nome: 'Roupão', categoria: 'Quarto', preco: 80.00, estoque: 30 },
    { id: 4, nome: 'Água Mineral', categoria: 'Bebidas', preco: 6.00, estoque: 100 },
    { id: 5, nome: 'Refrigerante', categoria: 'Bebidas', preco: 8.00, estoque: 80 },
    { id: 6, nome: 'Chocolate', categoria: 'Alimentos', preco: 7.50, estoque: 60 },
    { id: 7, nome: 'Sanduíche', categoria: 'Alimentos', preco: 18.00, estoque: 25 },
    { id: 8, nome: 'Adaptador de Tomada', categoria: 'Eletrônicos', preco: 15.00, estoque: 20 },
    { id: 9, nome: 'Carregador USB', categoria: 'Eletrônicos', preco: 45.00, estoque: 15 },
    { id: 10, nome: 'Escova de Dentes', categoria: 'Higiene', preco: 12.00, estoque: 40 },
    { id: 11, nome: 'Kit Dental', categoria: 'Higiene', preco: 18.00, estoque: 35 },
    { id: 12, nome: 'Chinelo', categoria: 'Quarto', preco: 28.00, estoque: 45 },
  ]);

  // Estado para o carrinho
  const [carrinho, setCarrinho] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [quartoSelecionado, setQuartoSelecionado] = useState('');
  const [busca, setBusca] = useState('');
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('');
  const [compradorNome, setCompradorNome] = useState('');
  const [vendas, setVendas] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('produtos'); // 'produtos' | 'vendas'
  const searchRef = useRef(null);

  // Máscara amigável para visualização do WhatsApp (sem alterar lógica interna)
  const formatWhatsAppMask = (raw) => {
    const d = limparNumero(raw);
    if (!d) return '';
    if (d.startsWith('55')) {
      const rest = d.slice(2);
      const ddd = rest.slice(0, 2);
      const num = rest.slice(2);
      if (!ddd) return '55';
      if (!num) return `55 ${ddd}`;
      if (num.length <= 4) return `55 ${ddd} ${num}`;
      if (num.length <= 8) return `55 ${ddd} ${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
      return `55 ${ddd} ${num.slice(0, 5)}-${num.slice(5, 9)}`;
    }
    // Sem 55, formata com DDD básico
    const ddd = d.slice(0, 2);
    const num = d.slice(2);
    if (!ddd) return d;
    if (!num) return ddd;
    if (num.length <= 4) return `${ddd} ${num}`;
    if (num.length <= 8) return `${ddd} ${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
    return `${ddd} ${num.slice(0, 5)}-${num.slice(5, 9)}`;
  };

  // Foco inicial e atalhos de teclado
  useEffect(() => {
    if (searchRef.current) {
      try { searchRef.current.focus(); } catch {}
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = String(e.key || '').toLowerCase();
      // Ctrl+K: focar busca
      if (e.ctrlKey && key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // Ctrl+P: imprimir lista quando houver itens
      if (e.ctrlKey && key === 'p') {
        e.preventDefault();
        if (carrinho.length > 0) {
          window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Impressão iniciada.' } }));
          handlePrint();
        }
      }
      // Ctrl+W: enviar recibo via WhatsApp
      if (e.ctrlKey && key === 'w') {
        e.preventDefault();
        if (carrinho.length > 0) {
          handleEnviarWhatsApp();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [carrinho, metodoPagamento, quartoSelecionado, numeroWhatsApp]);
  // Sincronização: inventário e vendas em tempo real via SSE
  useEffect(() => {
    let es;
    // Carrega inventário do backend, se disponível, e mescla com produtos atuais
    (async () => {
      try {
        const inv = await api.list(Resources.Inventory);
        if (Array.isArray(inv) && inv.length) {
          setProdutos(prev => {
            const byName = (name) => prev.find(p => String(p.nome).toLowerCase() === String(name).toLowerCase());
            const next = [...prev];
            inv.forEach(item => {
              const nome = item.nome || item.name || '';
              const found = byName(nome);
              const preco = Number(item.preco ?? item.price ?? (found ? found.preco : 0));
              const estoque = Number(item.estoque ?? item.stock ?? (found ? found.estoque : 0));
              const categoria = item.categoria || item.category || (found ? found.categoria : 'Outros');
              if (found) {
                Object.assign(found, { preco, estoque, categoria });
              } else {
                next.push({ id: Number(item.id) || (next.length ? Math.max(...next.map(x => Number(x.id) || 0)) + 1 : 1), nome, categoria, preco, estoque });
              }
            });
            return next;
          });
        }
      } catch {}
      // Carregar vendas existentes
      try {
        const vs = await api.list(Resources.Sales);
        if (Array.isArray(vs)) setVendas(vs);
      } catch {}
      // Inicia SSE
      try {
        const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
        es = new EventSource(`${base}/stream`);
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (!msg) return;
            if (msg.resource === Resources.Inventory) {
              // Eventos de inventário: atualizar produtos
              if (msg.action === 'create' && msg.item) {
                setProdutos(prev => {
                  const exists = prev.some(p => String(p.id) === String(msg.item.id) || String(p.nome).toLowerCase() === String(msg.item.nome || msg.item.name || '').toLowerCase());
                  if (exists) {
                    return prev.map(p => (String(p.id) === String(msg.item.id) || String(p.nome).toLowerCase() === String(msg.item.nome || msg.item.name || '').toLowerCase())
                      ? { ...p, preco: Number(msg.item.preco ?? msg.item.price ?? p.preco), estoque: Number(msg.item.estoque ?? msg.item.stock ?? p.estoque), categoria: msg.item.categoria || msg.item.category || p.categoria }
                      : p);
                  }
                  return [...prev, {
                    id: Number(msg.item.id) || (prev.length ? Math.max(...prev.map(x => Number(x.id) || 0)) + 1 : 1),
                    nome: msg.item.nome || msg.item.name || 'Novo produto',
                    categoria: msg.item.categoria || msg.item.category || 'Outros',
                    preco: Number(msg.item.preco ?? msg.item.price ?? 0),
                    estoque: Number(msg.item.estoque ?? msg.item.stock ?? 0),
                  }];
                });
              } else if (msg.action === 'update' && msg.item) {
                setProdutos(prev => prev.map(p => (String(p.id) === String(msg.item.id) || String(p.nome).toLowerCase() === String(msg.item.nome || msg.item.name || '').toLowerCase())
                  ? { ...p, preco: Number(msg.item.preco ?? msg.item.price ?? p.preco), estoque: Number(msg.item.estoque ?? msg.item.stock ?? p.estoque), categoria: msg.item.categoria || msg.item.category || p.categoria }
                  : p));
              } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
                setProdutos(prev => prev.filter(p => String(p.id) !== String(msg.id)));
              }
            } else if (msg.resource === Resources.Sales) {
              // Vendas: reduzir estoque conforme itens vendidos por outros caixas
              if (msg.action === 'create' && msg.item && Array.isArray(msg.item.itens)) {
                const itens = msg.item.itens;
                setProdutos(prev => prev.map(p => {
                  const vendido = itens.find(i => String(i.id) === String(p.id) || String(i.nome).toLowerCase() === String(p.nome).toLowerCase());
                  if (vendido) {
                    const novoEstoque = Math.max(0, Number(p.estoque) - Number(vendido.quantidade || 0));
                    return { ...p, estoque: novoEstoque };
                  }
                  return p;
                }));
                // Atualizar lista de vendas em tempo real
                setVendas(prev => {
                  const exists = prev.some(v => String(v.id) === String(msg.item.id));
                  return exists ? prev.map(v => (String(v.id) === String(msg.item.id) ? msg.item : v)) : [msg.item, ...prev];
                });
              } else if (msg.action === 'update' && msg.item) {
                setVendas(prev => prev.map(v => (String(v.id) === String(msg.item.id) ? msg.item : v)));
              } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
                setVendas(prev => prev.filter(v => String(v.id) !== String(msg.id)));
              }
            }
          } catch {}
        };
      } catch {}
    })();
    return () => { if (es) { try { es.close(); } catch {} } };
  }, []);
  const [printTimestamp, setPrintTimestamp] = useState('');
  const [clienteNome, setClienteNome] = useState('Pousada Paraíso Açu');
  const [clienteCnpj, setClienteCnpj] = useState('03.286.756/0001-37');

  // Rótulos amigáveis para método de pagamento e utilitário de quarto
  const metodoLabels = {
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    pix: 'PIX',
    faturar_quarto: 'Faturar no Quarto',
  };
  const getQuartoSelecionadoLabel = () => {
    if (!quartoSelecionado) return '';
    const q = quartos.find(q => q.id === Number(quartoSelecionado));
    return q ? `${q.nome} - ${q.id}` : `Quarto ${quartoSelecionado}`;
  };

  useEffect(() => {
    try {
      const perfil = JSON.parse(localStorage.getItem('cliente_perfil') || '{}');
      if (perfil?.nome) setClienteNome(perfil.nome);
      if (perfil?.cnpj) setClienteCnpj(perfil.cnpj);
    } catch {}
    try {
      const cfg = JSON.parse(localStorage.getItem('cliente_config') || '{}');
      if (cfg?.nome) setClienteNome(cfg.nome);
      if (cfg?.cnpj) setClienteCnpj(cfg.cnpj);
    } catch {}
  }, []);

  // Lista de quartos
  const quartos = Array.from({ length: 22 }, (_, i) => ({ id: i + 1, nome: [
    'Orquídea', 'Rosa', 'Tulipa', 'Girassol', 'Margarida', 'Lírio', 'Violeta', 
    'Cravo', 'Azaleia', 'Begônia', 'Camélia', 'Dália', 'Frésia', 'Gardênia', 
    'Hortênsia', 'Íris', 'Jasmim', 'Lavanda', 'Magnólia', 'Narciso', 'Petúnia', 'Zínia'
  ][i] }));

  // Obter categorias únicas
  const categorias = ['Todos', ...new Set(produtos.map(item => item.categoria))];

  // Filtrar produtos por categoria e busca
  const produtosFiltrados = produtos
    .filter(produto => categoriaAtiva === 'Todos' || produto.categoria === categoriaAtiva)
    .filter(produto => produto.nome.toLowerCase().includes(busca.toLowerCase()));

  // Sugestões de busca (ignora categoria ativa)
  const sugestoes = busca.trim().length >= 2
    ? produtos
        .filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
        .slice(0, 6)
    : [];

  // Utilitário para destacar o termo buscado em negrito
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const highlightMatch = (text, query) => {
    if (!query || query.trim().length < 2) return text;
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => (
      index % 2 === 1 ? <span key={index} className="search-highlight">{part}</span> : part
    ));
  };

  // Adicionar produto ao carrinho
  const adicionarAoCarrinho = (produto) => {
    const itemNoCarrinho = carrinho.find(item => item.id === produto.id);
    
    if (itemNoCarrinho) {
      setCarrinho(carrinho.map(item => 
        item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
      ));
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    }
  };

  // Remover produto do carrinho
  const removerDoCarrinho = (id) => {
    const item = carrinho.find(item => item.id === id);
    
    if (item.quantidade > 1) {
      setCarrinho(carrinho.map(item => 
        item.id === id ? { ...item, quantidade: item.quantidade - 1 } : item
      ));
    } else {
      setCarrinho(carrinho.filter(item => item.id !== id));
    }
  };

  // Calcular total da venda
  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  // Finalizar venda
  const finalizarVenda = () => {
    if (carrinho.length === 0 || !metodoPagamento) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Adicione produtos ao carrinho e selecione um método de pagamento.' } }));
      return;
    }
    if (metodoPagamento === 'faturar_quarto' && !quartoSelecionado) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Selecione o quarto para faturar.' } }));
      return;
    }

    // Snapshot dos itens e total antes de limpar carrinho
    const itensPayload = carrinho.map(item => ({ id: item.id, nome: item.nome, quantidade: item.quantidade, preco: item.preco }));
    const totalPayload = Number(calcularTotal().toFixed(2));
    const quartoLabel = getQuartoSelecionadoLabel() || null;

    // Atualizar estoque
    const produtosAtualizados = produtos.map(produto => {
      const itemVendido = carrinho.find(item => item.id === produto.id);
      if (itemVendido) {
        return { ...produto, estoque: produto.estoque - itemVendido.quantidade };
      }
      return produto;
    });

    setProdutos(produtosAtualizados);
    
    // Limpar carrinho após a venda
    setCarrinho([]);
    setMetodoPagamento('');
    setQuartoSelecionado('');
    
    // Persistir venda no backend
    try {
      const vendaPayload = {
        itens: itensPayload,
        total: totalPayload,
        formaPagamento: metodoPagamento,
        quarto: quartoLabel,
        status: 'concluida',
        data: new Date().toISOString(),
        comprador: {
          nome: (compradorNome || '').trim() || null,
          whatsapp: numeroWhatsApp.trim() ? limparNumero(numeroWhatsApp) : null,
        },
        origem: 'PDV',
      };
      api.create(Resources.Sales, vendaPayload).catch(() => {});
      // Lançar receita no Financeiro
      const tx = {
        tipo: 'receita',
        categoria: 'PDV',
        descricao: `Venda PDV${compradorNome ? ' - ' + compradorNome : ''}${quartoLabel ? ' (Quarto ' + quartoLabel + ')' : ''}`,
        valor: totalPayload,
        data: new Date().toISOString().slice(0,10),
        formaPagamento: metodoLabels[metodoPagamento] || metodoPagamento,
        status: 'confirmado',
      };
      api.create(Resources.Transactions, tx).catch(() => {});
    } catch {}

    // Opcional: enviar recibo por WhatsApp automaticamente se tivermos número ou quarto selecionado
    enviarWhatsAppRecibo(itensPayload, totalPayload, metodoPagamento, quartoLabel, numeroWhatsApp).catch(() => {});

    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Venda finalizada com sucesso.' } }));
  };

  // Helpers WhatsApp (util)
  const enviarWhatsAppRecibo = async (itens, total, metodo, quarto, numeroManual) => {
    try {
      let numero = limparNumero(numeroManual || '');
      if (!numero && metodo === 'faturar_quarto' && quartoSelecionado) {
        numero = limparNumero(await obterWhatsAppPrincipalDoQuartoId(quartoSelecionado));
      }
      if (!numero) return; // sem número, não envia automaticamente
      // Montar link público para acompanhamento (rota geral /track)
      let publicUrl = null;
      try {
        const host = await api.getHost();
        publicUrl = host?.url || null;
      } catch {}
      if (!publicUrl) { try { publicUrl = localStorage.getItem('public_app_url') || null; } catch {} }
      const baseUrl = (publicUrl || window.location.origin).replace(/\/+$/, '');
      const linkTracking = `${baseUrl}/track`;
      const msg = montarReciboMsg(itens, total, metodoLabels[metodo] || metodo, quarto, linkTracking);
      const url = gerarLinkWhatsApp(numero, msg);
      if (url) window.open(url, '_blank');
    } catch {}
  };

  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const handlePrint = () => {
    setPrintTimestamp(new Date().toLocaleString('pt-BR'));
    window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Impressão iniciada.' } }));
    window.print();
  };

  // Enviar recibo via WhatsApp com validação amigável
  const handleEnviarWhatsApp = async () => {
    const itens = carrinho.map(item => ({ id: item.id, nome: item.nome, quantidade: item.quantidade, preco: item.preco }));
    const total = Number(calcularTotal().toFixed(2));
    const quarto = metodoPagamento === 'faturar_quarto' ? getQuartoSelecionadoLabel() || null : null;

    let limpo = limparNumero(numeroWhatsApp);
    if (numeroWhatsApp.trim()) {
      if (!limpo.startsWith('55') || limpo.length < 12) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Número de WhatsApp inválido. Use 55 + DDD + número.' } }));
        return;
      }
    } else if (metodoPagamento === 'faturar_quarto') {
      limpo = limparNumero(await obterWhatsAppPrincipalDoQuartoId(quartoSelecionado));
      if (!limpo) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'WhatsApp do quarto não encontrado.' } }));
        return;
      }
    } else {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Informe um WhatsApp válido ou selecione Faturar no Quarto.' } }));
      return;
    }

    // Link geral de acompanhamento (não há pedido do restaurante no PDV)
    let publicUrl = null;
    try { const host = await api.getHost(); publicUrl = host?.url || null; } catch {}
    if (!publicUrl) { try { publicUrl = localStorage.getItem('public_app_url') || null; } catch {} }
    const baseUrl = (publicUrl || window.location.origin).replace(/\/+$/, '');
    const linkTracking = `${baseUrl}/track`;
    const msg = montarReciboMsg(itens, total, metodoLabels[metodoPagamento] || metodoPagamento, quarto, linkTracking);
    const url = gerarLinkWhatsApp(limpo, msg);
    if (url) {
      try { window.open(url, '_blank'); } catch {}
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Abrindo WhatsApp para envio do recibo.' } }));
    }
  };

  return (
    <div className="container-fluid pdv-print">
      <div className="pdv-header mb-3"><h2 className="m-0">PDV - Sistema de Vendas</h2></div>
      {/* Abas do PDV */}
      <div className="mb-3 d-print-none">
        <div className="btn-group" role="group">
          <button className={`btn ${abaAtiva === 'produtos' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setAbaAtiva('produtos')}>Produtos</button>
          <button className={`btn ${abaAtiva === 'vendas' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setAbaAtiva('vendas')}>Vendas realizadas</button>
        </div>
      </div>
      {/* Cabeçalho da impressão (visível somente no modo print) */}
      <div className="print-header">
        <h4 className="mb-1">{clienteNome}</h4>
        <small className="d-block">CNPJ: {clienteCnpj}</small>
        <small className="d-block">Data/Hora: {printTimestamp || new Date().toLocaleString('pt-BR')}</small>
        <h5 className="mt-2">PDV — Lista do Carrinho</h5>
      </div>
      
      {abaAtiva === 'produtos' ? (
      <div className="row">
        {/* Lista de Produtos */}
        <div className="col-md-8">
            <div className="card mb-4 pdv-product-card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                <h5 className="m-0">Produtos</h5>
                <div className="pdv-header-input flex-grow-1" style={{ maxWidth: '420px' }}>
                  <div className="pdv-search-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar produto..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setBusca('');
                        if (e.key === 'Enter' && sugestoes.length > 0) {
                          adicionarAoCarrinho(sugestoes[0]);
                          setBusca('');
                          setCategoriaAtiva('Todos');
                        }
                      }}
                      ref={searchRef}
                     />
                    <small className="text-muted d-block mt-1">Atalhos: Ctrl+K buscar, Ctrl+P imprimir, Ctrl+W WhatsApp.</small>
                    {busca.trim().length >= 2 && sugestoes.length > 0 && (
                      <ul className="list-group pdv-suggestions">
                        {sugestoes.map(s => (
                          <li
                            key={s.id}
                            className="list-group-item"
                            onClick={() => { setBusca(s.nome); setCategoriaAtiva('Todos'); }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="item-left">
                              <strong>{highlightMatch(s.nome, busca)}</strong>
                              <small className="ms-2">{s.categoria}</small>
                            </div>
                            <div className="d-flex align-items-center">
                              <span className="me-2">R$ {s.preco.toFixed(2)}</span>
                              <button
                                className="btn btn-sm btn-secondary suggest-add"
                                onClick={(e) => { e.stopPropagation(); adicionarAoCarrinho(s); setBusca(''); }}
                              >
                                Adicionar
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="d-flex flex-wrap mt-2 pdv-category">
                {categorias.map(categoria => (
                  <button 
                    key={categoria} 
                    className={`btn btn-sm ${categoriaAtiva === categoria ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setCategoriaAtiva(categoria)}
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="card-body">
              <div className="row">
                {produtosFiltrados.map(produto => (
                  <div key={produto.id} className="col-md-4 mb-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <h5 className="card-title d-flex justify-content-between align-items-center">
                          <span>{highlightMatch(produto.nome, busca)}</span>
                          <span className="badge bg-secondary">{produto.categoria}</span>
                        </h5>
                        <div className="price-stock">
                          <span className="price-tag">R$ {produto.preco.toFixed(2)}</span>
                          <span className="badge-stock">Estoque: {produto.estoque}</span>
                        </div>
                        <button 
                          className="btn btn-sm btn-secondary add-btn"
                          onClick={() => adicionarAoCarrinho(produto)}
                          disabled={produto.estoque <= 0}
                        >
                          {produto.estoque <= 0 ? 'Sem estoque' : 'Adicionar ao Carrinho'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Carrinho */}
        <div className="col-md-4">
          <div className="card pdv-cart">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="m-0">Carrinho <span className="badge bg-secondary ms-2">{totalItens}</span></h5>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handlePrint}
                  disabled={carrinho.length === 0}
                >
                  Imprimir Lista
                </button>
              </div>
            </div>
            <div className="card-body">
              {carrinho.length === 0 ? (
                <p className="text-center">Carrinho vazio</p>
              ) : (
                <>
                  {carrinho.map(item => (
                    <div key={item.id} className="pdv-cart-item">
                      <div className="d-flex justify-content-between">
                        <div>
                          <h6>{item.nome}</h6>
                          <small className="text-muted">R$ {item.preco.toFixed(2)} x {item.quantidade}</small>
                          <div className="print-subtotal">
                            <small><strong>Subtotal:</strong> R$ {(item.preco * item.quantidade).toFixed(2)}</small>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <button 
                            className="btn btn-sm btn-outline-danger me-2 qty-btn"
                            onClick={() => removerDoCarrinho(item.id)}
                          >
                            -
                          </button>
                          <span>{item.quantidade}</span>
                          <button 
                            className="btn btn-sm btn-secondary ms-2 qty-btn"
                            onClick={() => adicionarAoCarrinho(item)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Linha de impressão estilo lista de compras */}
                      <div className="print-line">
                        <span className="item-name">{item.nome}</span>
                        <span className="dots" aria-hidden="true"></span>
                        <span className="item-info">{item.quantidade} x R$ {item.preco.toFixed(2)}</span>
                        <span className="item-subtotal">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  
                  <hr />
                  
                  <div className="mb-3">
                    <label className="form-label">Método de Pagamento</label>
                    <select 
                      className="form-select"
                      value={metodoPagamento}
                      onChange={(e) => setMetodoPagamento(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="pix">PIX</option>
                      <option value="faturar_quarto">Faturar no Quarto</option>
                    </select>
                  </div>
                  
                  {metodoPagamento === 'faturar_quarto' && (
                    <div className="mb-3">
                      <label className="form-label">Selecione o Quarto</label>
                      <select 
                        className="form-select"
                        value={quartoSelecionado}
                        onChange={(e) => setQuartoSelecionado(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {quartos.map(quarto => (
                          <option key={quarto.id} value={quarto.id}>
                            {quarto.nome} - {quarto.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="total-row mb-3">
                    <h5>Total:</h5>
                    <h5>R$ {calcularTotal().toFixed(2)}</h5>
                  </div>
                  <div className="print-footer text-center">
                    {metodoPagamento && (
                      <div><small><strong>Método de Pagamento:</strong> {metodoLabels[metodoPagamento] || metodoPagamento}</small></div>
                    )}
                    {metodoPagamento === 'faturar_quarto' && quartoSelecionado && (
                      <div><small><strong>Quarto:</strong> {getQuartoSelecionadoLabel()}</small></div>
                    )}
                  </div>

                  {/* Dados do comprador */}
                  <div className="mb-3">
                    <label className="form-label">Nome do Cliente (opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex.: João da Silva"
                      value={compradorNome}
                      onChange={(e) => setCompradorNome(e.target.value)}
                    />
                  </div>

                  {/* WhatsApp: enviar recibo */}
                  <div className="mb-3">
                    <label className="form-label">WhatsApp do Cliente (opcional)</label>
                    <div className="d-flex gap-2">
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="Ex.: 55 22 99999-0000"
                        value={numeroWhatsApp}
                        onChange={(e) => setNumeroWhatsApp(formatWhatsAppMask(e.target.value))}
                      />
                      <button
                        type="button"
                        className="btn btn-success"
                        disabled={carrinho.length === 0}
                        onClick={handleEnviarWhatsApp}
                        title={(metodoPagamento === 'faturar_quarto' && !numeroWhatsApp ? 'Usa o WhatsApp principal do quarto selecionado, se existir. ' : '') + 'Atalho: Ctrl+W'}
                      >
                        Enviar no WhatsApp
                      </button>
                    </div>
                    <small className="text-muted d-block mt-1">Use 55 + DDD + número. Ex.: 55 22 99999-0000. Se vazio e faturado no quarto, usa o WhatsApp principal cadastrado.</small>
                  </div>
                  
                  <button 
                    className="btn btn-secondary w-100"
                    onClick={finalizarVenda}
                    disabled={
                      carrinho.length === 0 || 
                      !metodoPagamento || 
                      (metodoPagamento === 'faturar_quarto' && !quartoSelecionado)
                    }
                  >
                    Finalizar Venda
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="m-0">Vendas realizadas</h5>
                <small className="text-muted">Atualiza em tempo real</small>
              </div>
              <div className="card-body">
                {(!vendas || vendas.length === 0) ? (
                  <p className="text-center">Nenhuma venda registrada</p>
                ) : (
                  <div className="table-container">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Data/Hora</th>
                          <th>Comprador</th>
                          <th>Forma</th>
                          <th>Quarto</th>
                          <th>Itens</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendas
                          .slice()
                          .sort((a,b) => String(b.data||'').localeCompare(String(a.data||'')))
                          .map((v) => (
                            <tr key={v.id || v.data+String(v.total)}>
                              <td>{(v.data || '').replace('T',' ').replace('Z','')}</td>
                              <td>{(v.comprador && v.comprador.nome) ? v.comprador.nome : '-'}</td>
                              <td>{v.formaPagamento || '-'}</td>
                              <td>{v.quarto || '-'}</td>
                              <td>{Array.isArray(v.itens) ? v.itens.reduce((acc,i)=>acc + Number(i.quantidade||0),0) : 0}</td>
                              <td>R$ {Number(v.total||0).toFixed(2)}</td>
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
      )}
    </div>
  );
};

export default PDV;
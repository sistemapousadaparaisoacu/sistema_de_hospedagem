import React, { useState, useEffect, useRef } from 'react';
import { normalizeText as normalize } from '../utils/strings';
import { api, Resources } from '../services/api';
import jsPDF from 'jspdf';
import { limparNumero, gerarLinkWhatsApp } from '../utils/whatsapp';

const Restaurante = () => {
  // Dados do cardápio (padrão)
  const menuItems = [
    { id: 1, nome: 'Filé Mignon', categoria: 'Carnes', preco: 89.90, descricao: 'Filé mignon grelhado com molho madeira e batatas' },
    { id: 2, nome: 'Salmão Grelhado', categoria: 'Peixes', preco: 78.50, descricao: 'Salmão grelhado com ervas e legumes' },
    { id: 3, nome: 'Risoto de Funghi', categoria: 'Massas', preco: 65.00, descricao: 'Risoto cremoso com funghi e parmesão' },
    { id: 4, nome: 'Salada Caesar', categoria: 'Entradas', preco: 42.00, descricao: 'Alface americana, croutons, parmesão e molho caesar' },
    { id: 5, nome: 'Bruschetta', categoria: 'Entradas', preco: 35.00, descricao: 'Pão italiano com tomate, manjericão e azeite' },
    { id: 6, nome: 'Espaguete à Carbonara', categoria: 'Massas', preco: 58.00, descricao: 'Espaguete com molho carbonara tradicional' },
    { id: 7, nome: 'Picanha', categoria: 'Carnes', preco: 92.00, descricao: 'Picanha grelhada com farofa e vinagrete' },
    { id: 8, nome: 'Tiramisu', categoria: 'Sobremesas', preco: 28.00, descricao: 'Sobremesa italiana com café e mascarpone' },
    { id: 9, nome: 'Água Mineral', categoria: 'Bebidas', preco: 6.00, descricao: 'Água mineral sem gás 500ml' },
    { id: 10, nome: 'Refrigerante', categoria: 'Bebidas', preco: 8.00, descricao: 'Refrigerante lata 350ml' },
    { id: 11, nome: 'Suco Natural', categoria: 'Bebidas', preco: 12.00, descricao: 'Suco de frutas naturais 300ml' },
    { id: 12, nome: 'Vinho Tinto', categoria: 'Bebidas', preco: 120.00, descricao: 'Garrafa de vinho tinto seco 750ml' },
  ];

  // Lista de quartos/mesas
  const quartos = Array.from({ length: 22 }, (_, i) => ({ 
    id: i + 1, 
    nome: [
      'Orquídea', 'Rosa', 'Tulipa', 'Girassol', 'Margarida', 'Lírio', 'Violeta', 
      'Cravo', 'Azaleia', 'Begônia', 'Camélia', 'Dália', 'Frésia', 'Gardênia', 
      'Hortênsia', 'Íris', 'Jasmim', 'Lavanda', 'Magnólia', 'Narciso', 'Petúnia', 'Zínia'
    ][i],
    status: Math.random() > 0.7 ? 'ocupado' : 'livre' // Status aleatório para demonstração
  }));

  // Estados
  const [carrinho, setCarrinho] = useState([]);
  const [quartoSelecionado, setQuartoSelecionado] = useState(null);
  const [observacoes, setObservacoes] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [statusPedido, setStatusPedido] = useState('pendente'); // pendente, aceito, preparando, entregue
  const [localEntrega, setLocalEntrega] = useState('quarto'); // quarto ou mesa
  const [pedidoId, setPedidoId] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('pedido'); // 'pedido' | 'historico'
  const [historicoPedidos, setHistoricoPedidos] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [detalhesVisivel, setDetalhesVisivel] = useState(false);
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('');
  const [buscaPedido, setBuscaPedido] = useState('');
  const [filtroStatusPedidos, setFiltroStatusPedidos] = useState('todos');

  // Estado do cardápio dinâmico e itens personalizados
  const [menuCustom, setMenuCustom] = useState([]);
  const [menuState, setMenuState] = useState(menuItems);
  const [mostrarFormMenu, setMostrarFormMenu] = useState(false);
  const [novoItemMenu, setNovoItemMenu] = useState({ nome: '', categoria: '', preco: '', descricao: '' });
  const [mostrarEditarItem, setMostrarEditarItem] = useState(false);
  const [itemEdicao, setItemEdicao] = useState(null);
  
  // Helpers: identificar item personalizado
  const isCustomItem = (id) => menuCustom.some(i => Number(i.id) === Number(id));
  // Helpers de status padronizado
  const getStatusLabel = (s) => {
    const k = String(s || 'pendente').toLowerCase();
    if (k === 'aceito') return 'Aceito';
    if (k === 'preparando') return 'Em preparo';
    if (k === 'entregue') return 'Entregue';
    return 'Pendente';
  };
  const getStatusClass = (s) => {
    const k = String(s || 'pendente').toLowerCase();
    if (k === 'aceito') return 'status-aceito';
    if (k === 'preparando') return 'status-preparando';
    if (k === 'entregue') return 'status-entregue';
    return 'status-pendente';
  };
  
  // Obter WhatsApp principal do quarto a partir do PMS
  const obterWhatsAppPrincipal = (quartoNome) => {
    try {
      const quartosLS = JSON.parse(localStorage.getItem('pms_quartos') || '[]');
      const q = quartosLS.find((x) => x && x.nome === quartoNome);
      const numero = q?.whatsappPrincipal || (q?.hospedes || []).find(h => h && h.whatsapp)?.whatsapp || '';
      return numero;
    } catch {
      return '';
    }
  };
  
  // Estados para hóspedes
  const [numeroHospedes, setNumeroHospedes] = useState(1);
  const [hospedes, setHospedes] = useState([
    { nome: '', cpf: '', whatsapp: '' },
    { nome: '', cpf: '', whatsapp: '' },
    { nome: '', cpf: '', whatsapp: '' },
    { nome: '', cpf: '', whatsapp: '' }
  ]);

  // Obter categorias únicas do estado atual do cardápio
  const categorias = ['Todos', ...new Set(menuState.map(item => item.categoria))];

  // Filtrar itens por categoria
  const itensFiltrados = categoriaAtiva === 'Todos' 
    ? menuState 
    : menuState.filter(item => item.categoria === categoriaAtiva);

  // Canal de broadcast para sincronização em tempo real (entre abas/devices)
  const broadcastRef = useRef(null);
  useEffect(() => {
    // Inicializa estado com localStorage
    const pedidosDoStorage = JSON.parse(localStorage.getItem('pedidos_cozinha') || '[]');
    setHistoricoPedidos(pedidosDoStorage);

    // Carregar itens personalizados e overrides do cardápio
    try {
      const savedCustom = JSON.parse(localStorage.getItem('menu_custom') || '[]');
      const listCustom = Array.isArray(savedCustom) ? savedCustom : [];
      const savedOverrides = JSON.parse(localStorage.getItem('menu_overrides') || '[]');
      const listOverrides = Array.isArray(savedOverrides) ? savedOverrides : [];
      const baseWithOverrides = menuItems
        .filter(item => {
          const ov = listOverrides.find(o => Number(o.id) === Number(item.id));
          return !(ov && ov.deleted === true);
        })
        .map(item => {
          const ov = listOverrides.find(o => Number(o.id) === Number(item.id));
          return ov ? { ...item, ...ov, id: item.id } : item;
        });
      setMenuCustom(listCustom);
      setMenuState([...baseWithOverrides, ...listCustom]);
    } catch {
      setMenuState(menuItems);
    }

    // BroadcastChannel (se suportado)
    try {
      broadcastRef.current = new window.BroadcastChannel('pedidos_cozinha');
      broadcastRef.current.onmessage = (event) => {
        if (event?.data?.type === 'SYNC_PEDIDOS' && Array.isArray(event.data.payload)) {
          setHistoricoPedidos(event.data.payload);
        }
      };
    } catch (e) {
      // fallback silencioso
    }

    // Listener de storage para mudanças em outras abas
    const onStorage = (e) => {
      if (e.key === 'pedidos_cozinha') {
        try {
          const data = JSON.parse(e.newValue || '[]');
          setHistoricoPedidos(Array.isArray(data) ? data : []);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (broadcastRef.current) {
        try { broadcastRef.current.close(); } catch {}
      }
    };
  }, []);

  // Carregar pedidos do backend e integrar SSE para atualizações em tempo real
  useEffect(() => {
    let isMounted = true;
    let es;
    (async () => {
      try {
        const list = await api.list(Resources.Orders);
        if (isMounted && Array.isArray(list)) {
          setHistoricoPedidos(list);
        }
      } catch {
        // mantém localStorage se backend indisponível
      }
      // SSE: escuta eventos do recurso "orders"
      try {
        const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
        es = new EventSource(`${base}/stream`);
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.resource === 'orders') {
              if (msg.action === 'create' && msg.item) {
                setHistoricoPedidos(prev => {
                  const exists = prev.some(p => String(p.id) === String(msg.item.id));
                  return exists ? prev.map(p => (String(p.id) === String(msg.item.id) ? msg.item : p)) : [...prev, msg.item];
                });
              } else if (msg.action === 'update' && msg.item) {
                setHistoricoPedidos(prev => prev.map(p => (String(p.id) === String(msg.item.id) ? msg.item : p)));
              } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
                setHistoricoPedidos(prev => prev.filter(p => String(p.id) !== String(msg.id)));
              }
            }
          } catch {}
        };
      } catch {}
    })();
    return () => { isMounted = false; if (es) { try { es.close(); } catch {} } };
  }, []);

  // Gerar ID único para o pedido
  useEffect(() => {
    if (!pedidoId) {
      setPedidoId(Math.floor(Math.random() * 10000) + 1);
    }
  }, [pedidoId]);

  // Adicionar item ao carrinho
  const adicionarAoCarrinho = (item) => {
    const itemNoCarrinho = carrinho.find(i => i.id === item.id);
    
    if (itemNoCarrinho) {
      setCarrinho(carrinho.map(i => 
        i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setCarrinho([...carrinho, { ...item, quantidade: 1 }]);
    }
  };

  // Manipulação do formulário de novo item do cardápio
  const handleNovoItemMenuChange = (e) => {
    const { name, value } = e.target;
    setNovoItemMenu(prev => ({
      ...prev,
      [name]: name === 'preco' ? value.replace(',', '.') : value
    }));
  };

  const adicionarItemMenu = (e) => {
    e.preventDefault();
    const nome = String(novoItemMenu.nome || '').trim();
    const categoria = String(novoItemMenu.categoria || '').trim();
    const descricao = String(novoItemMenu.descricao || '').trim();
    const precoNum = Number(novoItemMenu.preco);
    if (!nome || !categoria || !descricao || !Number.isFinite(precoNum) || precoNum <= 0) {
      alert('Preencha todos os campos corretamente. Preço deve ser maior que zero.');
      return;
    }
    const nextId = menuState.length ? Math.max(...menuState.map(i => Number(i.id) || 0)) + 1 : 1;
    const novo = { id: nextId, nome, categoria, descricao, preco: Number(precoNum.toFixed(2)) };
    const customNext = [...menuCustom, novo];
    setMenuCustom(customNext);
    setMenuState(prev => [...prev, novo]);
    try { localStorage.setItem('menu_custom', JSON.stringify(customNext)); } catch {}
    setNovoItemMenu({ nome: '', categoria: '', preco: '', descricao: '' });
    setMostrarFormMenu(false);
  };

  // Edição de item do cardápio
  const abrirEdicaoItem = (item) => {
    setItemEdicao({ ...item, preco: String(item.preco) });
    setMostrarEditarItem(true);
  };

  const handleEditarItemChange = (e) => {
    const { name, value } = e.target;
    setItemEdicao(prev => ({
      ...prev,
      [name]: name === 'preco' ? value.replace(',', '.') : value
    }));
  };

  const salvarEdicaoItem = (e) => {
    e.preventDefault();
    if (!itemEdicao) return;
    const nome = String(itemEdicao.nome || '').trim();
    const categoria = String(itemEdicao.categoria || '').trim();
    const descricao = String(itemEdicao.descricao || '').trim();
    const precoNum = Number(itemEdicao.preco);
    if (!nome || !categoria || !descricao || !Number.isFinite(precoNum) || precoNum <= 0) {
      alert('Preencha todos os campos corretamente. Preço deve ser maior que zero.');
      return;
    }
    const edited = { ...itemEdicao, preco: Number(precoNum.toFixed(2)) };

    // Atualiza persistência: custom ou override
    const isCustom = menuCustom.some(i => Number(i.id) === Number(edited.id));
    if (isCustom) {
      const customNext = menuCustom.map(i => (Number(i.id) === Number(edited.id) ? edited : i));
      setMenuCustom(customNext);
      try { localStorage.setItem('menu_custom', JSON.stringify(customNext)); } catch {}
    } else {
      try {
        const savedOverrides = JSON.parse(localStorage.getItem('menu_overrides') || '[]');
        const listOverrides = Array.isArray(savedOverrides) ? savedOverrides : [];
        const idx = listOverrides.findIndex(o => Number(o.id) === Number(edited.id));
        if (idx >= 0) {
          listOverrides[idx] = { ...listOverrides[idx], ...edited };
        } else {
          listOverrides.push({ id: edited.id, nome: edited.nome, categoria: edited.categoria, descricao: edited.descricao, preco: edited.preco });
        }
        localStorage.setItem('menu_overrides', JSON.stringify(listOverrides));
      } catch {}
    }

    // Atualiza estado consolidado
    setMenuState(prev => prev.map(i => (Number(i.id) === Number(edited.id) ? { ...i, ...edited } : i)));
    setMostrarEditarItem(false);
    setItemEdicao(null);
  };

  // Excluir item do cardápio (suporta padrão via override deleted e custom removendo da lista)
  const excluirItemMenu = (id) => {
    const isCustom = isCustomItem(id);
    const ok = window.confirm('Excluir este item do cardápio? Esta ação não pode ser desfeita.');
    if (!ok) return;
    if (isCustom) {
      excluirItemCustom(id);
      return;
    }
    try {
      const savedOverrides = JSON.parse(localStorage.getItem('menu_overrides') || '[]');
      const listOverrides = Array.isArray(savedOverrides) ? savedOverrides : [];
      const idx = listOverrides.findIndex(o => Number(o.id) === Number(id));
      if (idx >= 0) {
        listOverrides[idx] = { ...listOverrides[idx], id, deleted: true };
      } else {
        listOverrides.push({ id, deleted: true });
      }
      localStorage.setItem('menu_overrides', JSON.stringify(listOverrides));
    } catch {}
    // Atualiza estado removendo item
    setMenuState(prev => prev.filter(i => Number(i.id) !== Number(id)));
    // Remover do carrinho, se existir
    const existsInCart = carrinho.some(i => Number(i.id) === Number(id));
    if (existsInCart) {
      setCarrinho(prev => prev.filter(i => Number(i.id) !== Number(id)));
      try { window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Item excluído removido do carrinho.' } })); } catch {}
    }
    try { window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Item do cardápio excluído.' } })); } catch {}
    setMostrarEditarItem(false);
    setItemEdicao(null);
  };

  

  // Excluir item personalizado
  const excluirItemCustom = (id) => {
    if (!isCustomItem(id)) return;
    const ok = window.confirm('Excluir item personalizado? Esta ação não pode ser desfeita.');
    if (!ok) return;
    const inCartCount = carrinho.filter(i => Number(i.id) === Number(id)).length;
    const nextCustom = menuCustom.filter(i => Number(i.id) !== Number(id));
    setMenuCustom(nextCustom);
    try { localStorage.setItem('menu_custom', JSON.stringify(nextCustom)); } catch {}
    setMenuState(prev => prev.filter(i => Number(i.id) !== Number(id)));
    // Remover do carrinho, se existir
    if (inCartCount > 0) {
      setCarrinho(prev => prev.filter(i => Number(i.id) !== Number(id)));
      try {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Item excluído removido do carrinho.' } }));
      } catch {}
    }
    try {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Item personalizado excluído.' } }));
    } catch {}
    if (itemEdicao && Number(itemEdicao.id) === Number(id)) {
      setMostrarEditarItem(false);
      setItemEdicao(null);
    }
  };

  // Remover item do carrinho
  const removerDoCarrinho = (id) => {
    const item = carrinho.find(i => i.id === id);
    
    if (item.quantidade > 1) {
      setCarrinho(carrinho.map(i => 
        i.id === id ? { ...i, quantidade: i.quantidade - 1 } : i
      ));
    } else {
      setCarrinho(carrinho.filter(i => i.id !== id));
    }
  };

  // Calcular total do pedido
  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  // Atualizar status do pedido
  const atualizarStatusPedido = (novoStatus) => {
    setStatusPedido(novoStatus);
  };

  // Finalizar pedido
  const finalizarPedido = () => {
    if (!quartoSelecionado) {
      alert('Por favor, selecione um quarto/mesa para entrega');
      return;
    }
    
    if (carrinho.length === 0) {
      alert('Seu carrinho está vazio');
      return;
    }
    
    setPedidoFinalizado(true);
    setStatusPedido('pendente');
    const novoPedido = {
      id: pedidoId,
      pedidoId,
      quarto: quartoSelecionado?.nome || '',
      localEntrega,
      itens: carrinho.map(item => `${item.quantidade}x ${item.nome}`),
      total: calcularTotal().toFixed(2),
      status: 'pendente',
      observacoes,
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      criadoEm: new Date().toLocaleTimeString(),
      whatsappPrincipal: obterWhatsAppPrincipal(quartoSelecionado?.nome || '')
    };
    
    // Salvar no histórico local
    setHistoricoPedidos(prev => [...prev, novoPedido]);
    setPedidoSelecionado(novoPedido);
    setAbaAtiva('historico');
    
    // Persistir e sincronizar com a Cozinha
    const pedidosExistentes = JSON.parse(localStorage.getItem('pedidos_cozinha') || '[]');
    const novosPedidos = [...pedidosExistentes, novoPedido];
    localStorage.setItem('pedidos_cozinha', JSON.stringify(novosPedidos));
    try {
      broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: novosPedidos });
    } catch {}
    // Persistir no backend (orders)
    try {
      api.create(Resources.Orders, novoPedido).catch(() => {});
    } catch {}

    // Disparar WhatsApp imediatamente para o responsável do quarto (quando aplicável)
    try {
      enviarWhatsAppPedidoRecebido(novoPedido);
    } catch {}

    // Status agora é controlado manualmente pela Cozinha
  };

  // Reiniciar pedido
  const reiniciarPedido = () => {
    setCarrinho([]);
    setQuartoSelecionado(null);
    setObservacoes('');
    setPedidoFinalizado(false);
    setStatusPedido('pendente');
    setLocalEntrega('quarto');
    setPedidoId(Math.floor(Math.random() * 10000) + 1);
  };

  // Selecionar quarto/mesa
  const selecionarQuarto = (quarto) => {
    setQuartoSelecionado(quarto);
  };

  // Atualizar dados dos hóspedes
  const atualizarHospede = (index, campo, valor) => {
    const novosHospedes = [...hospedes];
    novosHospedes[index] = { ...novosHospedes[index], [campo]: valor };
    setHospedes(novosHospedes);
  };

  // Helper simples para aplicar tokens em templates
  const formatTemplate = (template, data) => {
    try {
      const tpl = String(template || '');
      return tpl.replace(/\{(\w+)\}/g, (_, key) => {
        const val = data[key];
        return typeof val === 'undefined' || val === null ? '' : String(val);
      });
    } catch { return String(template || ''); }
  };

  const obterUsuarioAtual = () => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
  };

  // Enviar WhatsApp na criação do pedido (recibo inicial)
  const enviarWhatsAppPedidoRecebido = async (pedido) => {
    try {
      if (numeroWhatsApp) {
        const limpo = limparNumero(numeroWhatsApp);
        if (!limpo.startsWith('55') || limpo.length < 12) {
          window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Número de WhatsApp inválido. Use 55 + DDD + número.' } }));
          return;
        }
      }
      // Prioriza número digitado; senão PMS; senão fallback sem número
      const override = limparNumero(numeroWhatsApp);
      const numero = override || (pedido?.whatsappPrincipal) || obterWhatsAppPrincipal(pedido?.quarto);
      const limpo = limparNumero(numero);
      const localLabel = pedido?.localEntrega === 'quarto' ? `Quarto ${pedido?.quarto}` : `Mesa ${pedido?.quarto}`;
      const itens = (pedido?.itens || []).join(', ');
      const tempoEst = estimarTempoPreparoMin(pedido);
      // Resolve origem pública para link clicável fora da rede local
      let publicUrl = null;
      try {
        const host = await api.getHost();
        if (host?.ip) {
          const originObj = new URL(window.location.origin);
          const port = originObj.port || host?.frontendPort || '';
          publicUrl = `http://${host.ip}${port ? `:${port}` : ''}`;
        } else {
          publicUrl = host?.url || null;
        }
        if (publicUrl) { try { localStorage.setItem('public_app_url', publicUrl); } catch {} }
      } catch {}
      if (!publicUrl) { try { publicUrl = localStorage.getItem('public_app_url') || null; } catch {} }
      const baseUrl = (publicUrl || window.location.origin).replace(/\/+$/, '');
      const pedidoIdLink = pedido?.id ?? pedido?.pedidoId;
      const linkTracking = `${baseUrl}/track?pedido=${encodeURIComponent(pedidoIdLink || '')}`;
      // Carrega template configurado (ou usa padrão)
      const cfg = (() => { try { return JSON.parse(localStorage.getItem('cliente_config') || '{}'); } catch { return {}; } })();
      const tplBase = cfg?.msgNew || 'Recebemos seu pedido!\n{local}\nItens: {itens}\nTotal: R$ {total}\nHorário: {horario}\nPrevisão: ~ {previsao} min\nAcompanhe: {link}';
      const tpl = pedido?.localEntrega === 'quarto' ? (cfg?.msgNewQuarto || tplBase) : (cfg?.msgNewMesa || tplBase);
      const usuario = obterUsuarioAtual();
      const msg = formatTemplate(tpl, {
        local: localLabel,
        itens,
        total: pedido?.total,
        horario: pedido?.horario,
        previsao: tempoEst,
        link: linkTracking,
        numeroPedido: pedido?.id || pedido?.pedidoId,
        responsavel: usuario?.usuario || usuario?.nome || ''
      });
      const url = gerarLinkWhatsApp(limpo, msg);
      window.open(url, '_blank');
    } catch {}
  };

  const copiarLinkPedido = async (id) => {
    let publicUrl = null;
    try { const host = await api.getHost(); publicUrl = host?.url || null; } catch {}
    if (!publicUrl) { try { publicUrl = localStorage.getItem('public_app_url') || null; } catch {} }
    const baseUrl = (publicUrl || window.location.origin).replace(/\/+$/, '');
    const link = `${baseUrl}/track?pedido=${encodeURIComponent(id || '')}`;
    try {
      navigator.clipboard.writeText(link);
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Link de acompanhamento copiado.' } }));
    } catch {
      window.prompt('Copie o link abaixo:', link);
    }
  };

  // Estimar tempo de preparo de forma simples
  const estimarTempoPreparoMin = (pedido) => {
    try {
      // Buscar tempo médio configurado
      const cfg = (() => { try { return JSON.parse(localStorage.getItem('cliente_config') || '{}'); } catch { return {}; } })();
      const base = Number(cfg?.kitchenAvgMinutes) || 25; // base em minutos
      const itensCount = (pedido?.itens || []).length;
      const extra = Math.min(20, itensCount * 4); // +4 min por item, máx 20
      return base + extra;
    } catch {
      return 25;
    }
  };

  // Abrir/fechar modal de detalhes do pedido
  const abrirDetalhes = (pedido) => {
    setPedidoSelecionado(pedido);
    setDetalhesVisivel(true);
    try {
      const prefill = obterWhatsAppPrincipal(pedido?.quarto) || '';
      setNumeroWhatsApp(limparNumero(prefill));
    } catch {
      setNumeroWhatsApp('');
    }
  };

  const fecharDetalhes = () => {
    setDetalhesVisivel(false);
  };

  // Imprimir pedido para a cozinha (ticket simplificado)
  const imprimirPedido = (pedido) => {
    try {
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) return;
      const clientePerfil = (() => { try { return JSON.parse(localStorage.getItem('cliente_perfil')||'{}'); } catch { return {}; } })();
      const clienteConfig = (() => { try { return JSON.parse(localStorage.getItem('cliente_config')||'{}'); } catch { return {}; } })();
      const nomeHotel = clientePerfil?.nome || 'Pousada';
      const cnpjHotel = clientePerfil?.cnpj || '';
      const logo = clienteConfig?.logoDataUrl || '';
      const itensHtml = (pedido?.itens || []).map((i) => `<li style="margin:4px 0;">${i}</li>`).join('');
      const obsHtml = pedido?.observacoes ? `<p><strong>Obs:</strong> ${pedido.observacoes}</p>` : '';
      const horario = pedido?.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const localStr = `${pedido?.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} ${pedido?.quarto || ''}`;
      const docHtml = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Pedido #${pedido?.pedidoId || pedido?.id}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            .header { display: flex; align-items: center; margin-bottom: 12px; }
            .header .brand { margin-left: 12px; }
            .header .brand .nome { font-size: 16px; font-weight: 700; }
            .header .brand .cnpj { font-size: 12px; color: #555; }
            .logo { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #eee; }
            h1 { font-size: 18px; margin: 8px 0 12px; }
            .meta { font-size: 13px; color: #333; margin-bottom: 8px; }
            ul { padding-left: 18px; }
            .total { font-weight: 700; margin-top: 8px; }
            .footer { margin-top: 12px; font-size: 11px; color: #777; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${logo ? `<img src="${logo}" class="logo" />` : ''}
            <div class="brand">
              <div class="nome">${nomeHotel}</div>
              ${cnpjHotel ? `<div class="cnpj">CNPJ: ${cnpjHotel}</div>` : ''}
            </div>
          </div>
          <h1>Cozinha • Pedido #${pedido?.pedidoId || pedido?.id}</h1>
          <div class="meta"><strong>Local:</strong> ${localStr}</div>
          <div class="meta"><strong>Horário:</strong> ${horario}</div>
          <div class="meta"><strong>Status:</strong> ${pedido?.status || 'pendente'}</div>
          <h3>Itens</h3>
          <ul>${itensHtml}</ul>
          ${obsHtml}
          <div class="total">Total: R$ ${pedido?.total || '0,00'}</div>
          <div class="footer">Impressão para preparo na cozinha</div>
          <script>
            // Aguarda renderização antes de imprimir para evitar páginas em branco
            (function(){
              try {
                var doPrint = function(){
                  try { window.focus && window.focus(); } catch {}
                  try { window.print && window.print(); } catch {}
                };
                if (document.readyState === 'complete') {
                  setTimeout(doPrint, 300);
                } else {
                  window.addEventListener('load', function(){ setTimeout(doPrint, 300); });
                }
              } catch {}
            })();
          </script>
        </body>
        </html>`;
      w.document.open();
      w.document.write(docHtml);
      w.document.close();
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Impressão iniciada.' } }));
    } catch {}
  };

  // Gerar PDF direto com jsPDF (evita branco ao salvar como PDF)
  const imprimirPedidoPdf = (pedido) => {
    try {
      const styles = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : { getPropertyValue: () => '' };
      const text = (styles.getPropertyValue('--bs-body-color') || '#212529').trim();
      const muted = (styles.getPropertyValue('--bs-secondary') || '#6c757d').trim();

      // Formato recibo tipo máquina de cartão (largura ~58–80mm)
      const pageW = 210; // ~80mm em pt (3.15in * 72)
      const headerH = 110;
      const itemsCount = (pedido?.itens || []).length;
      const baseH = 220;
      const extraObs = pedido?.observacoes ? 40 : 0;
      const pageH = baseH + (itemsCount * 20) + extraObs + 80;
      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: [pageW, pageH] });

      const clientePerfil = (() => { try { return JSON.parse(localStorage.getItem('cliente_perfil')||'{}'); } catch { return {}; } })();
      const clienteConfig = (() => { try { return JSON.parse(localStorage.getItem('cliente_config')||'{}'); } catch { return {}; } })();
      const nomeHotel = clientePerfil?.nome || 'Pousada';
      const cnpjHotel = clientePerfil?.cnpj || '';
      const logo = clienteConfig?.logoDataUrl || '';

      // Logo centralizado (menor para recibo)
      try {
        if (logo && typeof logo === 'string' && logo.startsWith('data:image')) {
          const type = logo.includes('image/png') ? 'PNG' : 'JPEG';
          const centerX = pageW / 2;
          const avatarSize = 36;
          doc.addImage(logo, type, centerX - avatarSize / 2, 20, avatarSize, avatarSize);
        }
      } catch {}

      // Título e cabeçalho em estilo recibo
      doc.setFont('courier', 'normal');
      doc.setTextColor(text);
      doc.setFontSize(13);
      doc.text(nomeHotel, pageW / 2, 72, { align: 'center' });
      if (cnpjHotel) {
        doc.setFontSize(10);
        doc.setTextColor(muted);
        doc.text(`CNPJ: ${cnpjHotel}`, pageW / 2, 88, { align: 'center' });
      }
      doc.setTextColor(text);
      doc.setFontSize(12);
      doc.text(`Cozinha • Pedido #${pedido?.pedidoId || pedido?.id}`, pageW / 2, headerH - 8, { align: 'center' });

      // Metadados
      const localStr = `${pedido?.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} ${pedido?.quarto || ''}`;
      const horario = pedido?.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      doc.setFontSize(10);
      doc.setTextColor(muted);
      doc.text(`Local: ${localStr}`, pageW / 2, headerH + 10, { align: 'center' });
      doc.text(`Horário: ${horario}`, pageW / 2, headerH + 22, { align: 'center' });
      doc.text(`Status: ${pedido?.status || 'pendente'}`, pageW / 2, headerH + 34, { align: 'center' });

      // Itens
      doc.setTextColor(text);
      doc.setFontSize(12);
      doc.text('Itens', pageW / 2, headerH + 52, { align: 'center' });
      let y = headerH + 70;
      (pedido?.itens || []).forEach((i) => {
        doc.setFontSize(11);
        doc.text(String(i), 18, y); // coluna única, uma abaixo da outra
        y += 16;
      });

      // Observações
      if (pedido?.observacoes) {
        doc.setFontSize(11);
        doc.text('Obs:', 18, y + 8);
        const obsLines = doc.splitTextToSize(String(pedido.observacoes), pageW - 36);
        doc.text(obsLines, 18, y + 22);
        y += 22 + (obsLines.length * 12);
      }

      // Total
      doc.setFontSize(12);
      doc.setTextColor(text);
      doc.text('Total', 18, y + 10);
      doc.text(`R$ ${pedido?.total || '0,00'}`, pageW - 18, y + 10, { align: 'right' });

      doc.save(`pedido_cozinha_${pedido?.pedidoId || pedido?.id || Date.now()}.pdf`);
    } catch {}
  };

  // Dados para o QR Code
  // Removido: QR Code

  return (
    <div className="container-fluid mt-4">
      <div className="restaurante-header mb-3">
        <h2 className="titulo">Restaurante</h2>
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${abaAtiva === 'pedido' ? 'active' : ''}`} onClick={() => setAbaAtiva('pedido')}>Novo Pedido</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${abaAtiva === 'historico' ? 'active' : ''}`} onClick={() => setAbaAtiva('historico')}>Pedidos</button>
        </li>
      </ul>

      {abaAtiva === 'pedido' ? (
        !pedidoFinalizado ? (
        <div className="row">
          {/* Coluna do cardápio */}
          <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Cardápio</h5>
                  <div className="d-flex gap-2">
                    <button className="btn btn-light btn-sm" onClick={() => setMostrarFormMenu(true)}>Adicionar Produto</button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {/* Filtro de categorias */}
                <div className="mb-4">
                  <div className="d-flex flex-wrap">
                    {categorias.map(categoria => (
                      <button
                        key={categoria}
                        className={`btn me-2 mb-2 ${categoriaAtiva === categoria ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setCategoriaAtiva(categoria)}
                      >
                        {categoria}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Lista de itens */}
                <div className="row">
                  {itensFiltrados.map(item => (
                    <div key={item.id} className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">{item.nome}</h5>
                          <p className="card-text small">{item.descricao}</p>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-primary fw-bold">R$ {item.preco.toFixed(2)}</span>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => abrirEdicaoItem(item)}
                              >
                                Editar
                              </button>
                              {isCustomItem(item.id) && (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => excluirItemCustom(item.id)}
                                >
                                  Excluir
                                </button>
                              )}
                              <button 
                                className="btn btn-sm btn-success"
                                onClick={() => adicionarAoCarrinho(item)}
                              >
                                Adicionar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Coluna do carrinho */}
          <div className="col-md-4">
            <div className="card mb-4">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Seu Pedido</h5>
              </div>
              <div className="card-body">
                {carrinho.length === 0 ? (
                  <p className="text-muted">Seu carrinho está vazio</p>
                ) : (
                  <>
                    <ul className="list-group mb-3">
                      {carrinho.map(item => (
                        <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold">{item.quantidade}x</span> {item.nome}
                            <div className="text-muted small">R$ {(item.preco * item.quantidade).toFixed(2)}</div>
                          </div>
                          <div className="btn-group">
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removerDoCarrinho(item.id)}
                            >
                              -
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-success"
                              onClick={() => adicionarAoCarrinho(item)}
                            >
                              +
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mb-3">
                      <label className="form-label">Observações:</label>
                      <textarea 
                        className="form-control"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Ex: Sem cebola, molho à parte, etc."
                        rows="2"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Local de Entrega:</label>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="localEntrega"
                          id="entregaQuarto"
                          checked={localEntrega === 'quarto'}
                          onChange={() => setLocalEntrega('quarto')}
                        />
                        <label className="form-check-label" htmlFor="entregaQuarto">
                          Entregar no Quarto
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="localEntrega"
                          id="entregaMesa"
                          checked={localEntrega === 'mesa'}
                          onChange={() => setLocalEntrega('mesa')}
                        />
                        <label className="form-check-label" htmlFor="entregaMesa">
                          Entregar na Mesa
                        </label>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Selecione o {localEntrega === 'quarto' ? 'Quarto' : 'Mesa'}:</label>
                      <select 
                        className="form-select"
                        value={quartoSelecionado ? quartoSelecionado.id : ''}
                        onChange={(e) => {
                          const id = parseInt(e.target.value);
                          const quarto = quartos.find(q => q.id === id);
                          setQuartoSelecionado(quarto);
                        }}
                      >
                        <option value="">Selecione...</option>
                        {quartos
                          .filter(q => localEntrega === 'mesa' || normalize(q.status) === 'ocupado')
                          .map(quarto => (
                            <option key={quarto.id} value={quarto.id}>
                              {quarto.nome} {localEntrega === 'quarto' ? `(${quarto.status})` : ''}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="fw-bold">Total:</span>
                      <span className="text-success fw-bold">R$ {calcularTotal().toFixed(2)}</span>
                    </div>
                    
                    <button 
                      className="btn btn-primary w-100"
                      onClick={finalizarPedido}
                      disabled={!quartoSelecionado}
                    >
                      Finalizar Pedido
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        ) : (
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Pedido Finalizado - #{pedidoId}</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h5>Detalhes do Pedido</h5>
                    <p><strong>Local de Entrega:</strong> {localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {quartoSelecionado.nome}</p>
                    <p><strong>Status:</strong> 
                      <span className={`badge ms-2 ${
                        statusPedido === 'aceito' ? 'bg-info' : 
                        statusPedido === 'preparando' ? 'bg-warning' : 
                        'bg-success'
                      }`}>
                        {statusPedido === 'aceito' ? 'Pedido Aceito' : 
                         statusPedido === 'preparando' ? 'Preparando' : 
                         'Entregue'}
                      </span>
                    </p>
                    
                    <div className="progress mb-3">
                      <div 
                        className={`progress-bar ${
                          statusPedido === 'aceito' ? 'bg-info' : 
                          statusPedido === 'preparando' ? 'bg-warning' : 
                          'bg-success'
                        }`}
                        role="progressbar" 
                        style={{ 
                          width: statusPedido === 'aceito' ? '33%' : 
                                 statusPedido === 'preparando' ? '66%' : 
                                 '100%' 
                        }}
                        aria-valuenow={statusPedido === 'aceito' ? 33 : statusPedido === 'preparando' ? 66 : 100}
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                    
                    <h6>Itens:</h6>
                    <ul className="list-group mb-3">
                      {carrinho.map(item => (
                        <li key={item.id} className="list-group-item d-flex justify-content-between">
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                        </li>
                      ))}
                      <li className="list-group-item d-flex justify-content-between fw-bold">
                        <span>Total</span>
                        <span>R$ {calcularTotal().toFixed(2)}</span>
                      </li>
                    </ul>
                    
                {observacoes && (
                  <div className="mb-3">
                    <h6>Observações:</h6>
                    <p className="mb-0">{observacoes}</p>
                  </div>
                )}

                <div className="d-flex align-items-center gap-2">
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => copiarLinkPedido(pedidoId)}
                  >
                    Copiar link de acompanhamento
                  </button>
                  <button
                    className="btn btn-outline-success"
                    onClick={() => enviarWhatsAppPedidoRecebido(pedidoSelecionado || { id: pedidoId, pedidoId, quarto: quartoSelecionado?.nome, localEntrega, itens: carrinho.map(item => `${item.quantidade}x ${item.nome}`), total: calcularTotal().toFixed(2), observacoes, horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })}
                  >
                    Enviar no WhatsApp
                  </button>
                  <a
                    className="btn btn-outline-primary"
                    href={`${window.location.origin}/track?pedido=${encodeURIComponent(pedidoId)}`}
                    target="_blank" rel="noreferrer"
                  >
                    Abrir acompanhamento
                  </a>
                </div>
                
                <button 
                  className="btn btn-primary mt-3"
                  onClick={reiniciarPedido}
                >
                  Fazer Novo Pedido
                    </button>
                  </div>
                  
                  
                </div>
              </div>
            </div>
          </div>
        </div>
        )
      ) : (
        <div className="row">
          <div className="col-md-6">
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Pedidos Feitos</h5>
              </div>
              <div className="card-body">
                {historicoPedidos.length === 0 ? (
                  <p className="text-muted">Nenhum pedido finalizado ainda.</p>
                ) : (
                  <>
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por número, local, status ou observações"
                        value={buscaPedido}
                        onChange={(e) => setBuscaPedido(e.target.value)}
                      />
                    </div>
                    <div className="d-flex gap-2 mb-3 flex-wrap">
                      {['todos','pendente','aceito','preparando','entregue'].map((s) => (
                        <button
                          key={s}
                          className={`btn btn-sm ${filtroStatusPedidos === s ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setFiltroStatusPedidos(s)}
                        >
                          {s === 'todos' ? 'Todos' : (s === 'pendente' ? 'Pendente' : s === 'aceito' ? 'Aceito' : s === 'preparando' ? 'Em preparo' : 'Entregue')}
                        </button>
                      ))}
                    </div>
                    <div className="row">
                      {historicoPedidos
                        .filter(p => (filtroStatusPedidos === 'todos') || String(p.status || 'pendente') === filtroStatusPedidos)
                        .filter(p => {
                          const q = (buscaPedido || '').toLowerCase().trim();
                          if (!q) return true;
                          const haystack = [
                            String(p.pedidoId || ''),
                            String(p.quarto || ''),
                            p.localEntrega === 'quarto' ? 'quarto' : 'mesa',
                            String(p.status || ''),
                            String(p.observacoes || ''),
                            String((p.itens || []).join(' '))
                          ].join(' ').toLowerCase();
                          return haystack.includes(q);
                        })
                        .map((p) => (
                          <div key={p.pedidoId} className="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                            <div className="card h-100">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start">
                                  <h6 className="card-title mb-1">Pedido #{p.pedidoId}</h6>
                                  <span className={`badge status-badge ${getStatusClass(p.status)}`}>{getStatusLabel(p.status)}</span>
                                </div>
                                <div className="small text-muted mb-2">{p.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {p.quarto}</div>
                                {p.horario && <div className="small text-muted mb-2">Horário: {p.horario}</div>}
                                <div className="mb-2" style={{ minHeight: '2.5em' }}>
                                  <ul className="list-unstyled mb-0 small">
                                    {(p.itens || []).slice(0,3).map((i, idx) => (
                                      <li key={idx}>{i}</li>
                                    ))}
                                    {(p.itens || []).length > 3 && (
                                      <li className="text-muted">+{(p.itens || []).length - 3} itens</li>
                                    )}
                                  </ul>
                                </div>
                                {p.observacoes && <div className="small text-muted mb-2">Obs: {p.observacoes}</div>}
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="fw-bold">R$ {p.total}</span>
                                  <button className="btn btn-sm btn-outline-primary" onClick={() => abrirDetalhes(p)}>Detalhes</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
        </div>
      )}
      {detalhesVisivel && pedidoSelecionado && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalhes do Pedido #{pedidoSelecionado.pedidoId}</h5>
                <button type="button" className="btn-close" onClick={fecharDetalhes}></button>
              </div>
              <div className="modal-body">
                <p><strong>Local:</strong> {pedidoSelecionado.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {pedidoSelecionado.quarto}</p>
                <p><strong>Horário:</strong> {pedidoSelecionado.horario}</p>
                <p><strong>Status atual:</strong> {pedidoSelecionado.status}</p>
                <ul className="list-group mb-2">
                  {(pedidoSelecionado.itens || []).map((i, idx) => (
                    <li key={idx} className="list-group-item">{i}</li>
                  ))}
                </ul>
                {pedidoSelecionado.observacoes && (
                  <p><strong>Obs:</strong> {pedidoSelecionado.observacoes}</p>
                )}
                <div className="d-flex justify-content-between">
                  <span className="fw-bold">Total</span>
                  <span className="fw-bold">R$ {pedidoSelecionado.total}</span>
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-center gap-3">
                <div className="d-flex align-items-center gap-2 me-2">
                  <label htmlFor="wa-num" className="form-label mb-0">WhatsApp</label>
                  <input
                    id="wa-num"
                    type="text"
                    className="form-control"
                    style={{ maxWidth: '220px' }}
                    placeholder="Ex.: 55 22 99999-0000"
                    value={numeroWhatsApp}
                    onChange={(e) => {
                      const d = limparNumero(e.target.value);
                      const with55 = d.startsWith('55');
                      const rest = with55 ? d.slice(2) : d;
                      const ddd = rest.slice(0, 2);
                      const num = rest.slice(2);
                      let masked = with55 ? '55' : '';
                      masked += ddd ? (with55 ? ` ${ddd}` : ddd) : '';
                      if (num) {
                        if (num.length <= 4) masked += with55 ? ` ${num}` : ` ${num}`;
                        else if (num.length <= 8) masked += ` ${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
                        else masked += ` ${num.slice(0, 5)}-${num.slice(5, 9)}`;
                      }
                      setNumeroWhatsApp(masked.trim());
                    }}
                  />
                  <small className="text-muted">Use 55 + DDD + número. Ex.: 55 22 99999-0000.</small>
                </div>
                <button className="btn btn-secondary" onClick={fecharDetalhes}>Fechar</button>
                <button className="btn btn-success" onClick={() => enviarWhatsAppPedidoRecebido(pedidoSelecionado)}>Enviar no WhatsApp</button>
                <button className="btn btn-primary" onClick={() => imprimirPedidoPdf(pedidoSelecionado)}>Imprimir pra cozinha</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Adicionar Produto ao Cardápio */}
      {mostrarFormMenu && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Produto ao Cardápio</h5>
                <button type="button" className="btn-close" onClick={() => setMostrarFormMenu(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={adicionarItemMenu}>
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input type="text" className="form-control" name="nome" value={novoItemMenu.nome} onChange={handleNovoItemMenuChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Categoria</label>
                    <input type="text" className="form-control" name="categoria" value={novoItemMenu.categoria} onChange={handleNovoItemMenuChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Preço (R$)</label>
                    <input type="number" step="0.01" min="0" className="form-control" name="preco" value={novoItemMenu.preco} onChange={handleNovoItemMenuChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descrição</label>
                    <textarea className="form-control" rows="2" name="descricao" value={novoItemMenu.descricao} onChange={handleNovoItemMenuChange} required />
                  </div>
                  <div className="d-flex justify-content-end">
                    <button type="button" className="btn btn-secondary me-2" onClick={() => setMostrarFormMenu(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Adicionar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {mostrarFormMenu && <div className="modal-backdrop fade show"></div>}

      {/* Modal: Editar Produto do Cardápio */}
      {mostrarEditarItem && itemEdicao && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Editar Produto</h5>
                <button type="button" className="btn-close" onClick={() => { setMostrarEditarItem(false); setItemEdicao(null); }}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={salvarEdicaoItem}>
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input type="text" className="form-control" name="nome" value={itemEdicao.nome} onChange={handleEditarItemChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Categoria</label>
                    <input type="text" className="form-control" name="categoria" value={itemEdicao.categoria} onChange={handleEditarItemChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Preço (R$)</label>
                    <input type="number" step="0.01" min="0" className="form-control" name="preco" value={itemEdicao.preco} onChange={handleEditarItemChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descrição</label>
                    <textarea className="form-control" rows="2" name="descricao" value={itemEdicao.descricao} onChange={handleEditarItemChange} required />
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <button type="button" className="btn btn-outline-danger" onClick={() => excluirItemMenu(itemEdicao.id)}>Excluir</button>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => { setMostrarEditarItem(false); setItemEdicao(null); }}>Cancelar</button>
                      <button type="submit" className="btn btn-primary">Salvar</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {mostrarEditarItem && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Restaurante;
import React, { useEffect, useState } from 'react';
import { api, Resources } from '../services/api';
import { normalizeText as normalize } from '../utils/strings';
import { limparNumero, gerarLinkWhatsApp } from '../utils/whatsapp';

const PMS = () => {
  // Dados iniciais dos quartos (22 quartos com nomes de plantas)
  const defaultQuartos = [
    { id: 1, nome: 'Orquídea', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 2, nome: 'Rosa', status: 'ocupado', hospedes: [{ nome: 'João Silva', cpf: '123.456.789-00', whatsapp: '11987654321' }], checkIn: '2023-04-10', checkOut: '2023-04-15' },
    { id: 3, nome: 'Tulipa', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 4, nome: 'Girassol', status: 'reservado', hospedes: [{ nome: 'Maria Santos', cpf: '987.654.321-00', whatsapp: '11912345678' }], checkIn: '2023-04-20', checkOut: '2023-04-25' },
    { id: 5, nome: 'Margarida', status: 'manutenção', hospedes: [], checkIn: '', checkOut: '' },
    { id: 6, nome: 'Lírio', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 7, nome: 'Violeta', status: 'ocupado', hospedes: [{ nome: 'Pedro Alves', cpf: '111.222.333-44', whatsapp: '11955556666' }], checkIn: '2023-04-08', checkOut: '2023-04-12' },
    { id: 8, nome: 'Cravo', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 9, nome: 'Azaleia', status: 'reservado', hospedes: [{ nome: 'Ana Costa', cpf: '444.555.666-77', whatsapp: '11977778888' }], checkIn: '2023-04-18', checkOut: '2023-04-22' },
    { id: 10, nome: 'Begônia', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 11, nome: 'Camélia', status: 'ocupado', hospedes: [{ nome: 'Carlos Mendes', cpf: '888.999.000-11', whatsapp: '11933334444' }], checkIn: '2023-04-05', checkOut: '2023-04-15' },
    { id: 12, nome: 'Dália', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 13, nome: 'Frésia', status: 'manutenção', hospedes: [], checkIn: '', checkOut: '' },
    { id: 14, nome: 'Gardênia', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 15, nome: 'Hortênsia', status: 'ocupado', hospedes: [{ nome: 'Luiza Ferreira', cpf: '222.333.444-55', whatsapp: '11944445555' }], checkIn: '2023-04-07', checkOut: '2023-04-14' },
    { id: 16, nome: 'Íris', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 17, nome: 'Jasmim', status: 'reservado', hospedes: [{ nome: 'Roberto Gomes', cpf: '555.666.777-88', whatsapp: '11966667777' }], checkIn: '2023-04-25', checkOut: '2023-04-30' },
    { id: 18, nome: 'Lavanda', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 19, nome: 'Magnólia', status: 'ocupado', hospedes: [{ nome: 'Teresa Vieira', cpf: '999.000.111-22', whatsapp: '11922223333' }], checkIn: '2023-04-09', checkOut: '2023-04-16' },
    { id: 20, nome: 'Narciso', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
    { id: 21, nome: 'Petúnia', status: 'reservado', hospedes: [{ nome: 'Fernando Lima', cpf: '333.444.555-66', whatsapp: '11911112222' }], checkIn: '2023-04-22', checkOut: '2023-04-27' },
    { id: 22, nome: 'Zínia', status: 'disponível', hospedes: [], checkIn: '', checkOut: '' },
  ];
  const [quartos, setQuartos] = useState(defaultQuartos);

  const [quartoSelecionado, setQuartoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [numeroHospedes, setNumeroHospedes] = useState(1);
  const [principalIndex, setPrincipalIndex] = useState(0);
  // Filtro de status com persistência em localStorage
  const initialFiltroStatus = (() => {
    try {
      return localStorage.getItem('pms_filtro_status') || 'todos';
    } catch {
      return 'todos';
    }
  })();
  const [filtroStatus, setFiltroStatus] = useState(initialFiltroStatus);
  const [openHospedeIndex, setOpenHospedeIndex] = useState(0);

  // Remover duplicados por nome (normalizado) mantendo o último registro
  const dedupeRooms = (list) => {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((r) => {
      const key = normalize(r?.nome);
      map.set(key, r);
    });
    return Array.from(map.values());
  };

  // Carregar quartos do backend; semear se vazio; fallback localStorage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const rooms = await api.list(Resources.Rooms);
        if (Array.isArray(rooms) && rooms.length > 0) {
          if (isMounted) setQuartos(dedupeRooms(rooms));
        } else {
          // Semear quartos iniciais no backend
          await Promise.all(defaultQuartos.map(q => api.create(Resources.Rooms, q)));
          const seeded = await api.list(Resources.Rooms);
          if (isMounted) setQuartos(dedupeRooms(seeded));
        }
      } catch {
        // Fallback: localStorage
        try {
          const armazenados = JSON.parse(localStorage.getItem('pms_quartos') || '[]');
          if (Array.isArray(armazenados) && armazenados.length > 0) {
            if (isMounted) setQuartos(dedupeRooms(armazenados));
          }
        } catch {}
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Persiste alterações em quartos
  useEffect(() => {
    try {
      localStorage.setItem('pms_quartos', JSON.stringify(quartos));
    } catch {}
  }, [quartos]);

  // Persiste o filtro selecionado
  useEffect(() => {
    try {
      localStorage.setItem('pms_filtro_status', filtroStatus);
    } catch {}
  }, [filtroStatus]);

  // SSE: atualizações em tempo real do recurso "rooms"
  useEffect(() => {
    let es;
    try {
      const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
      es = new EventSource(`${base}/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.resource === 'rooms') {
            if (msg.action === 'create' && msg.item) {
              setQuartos(prev => {
                const exists = prev.some(r => String(r.id) === String(msg.item.id));
                return exists
                  ? prev.map(r => (String(r.id) === String(msg.item.id) ? msg.item : r))
                  : dedupeRooms([...prev, msg.item]);
              });
            } else if (msg.action === 'update' && msg.item) {
              setQuartos(prev => prev.map(r => (String(r.id) === String(msg.item.id) ? msg.item : r)));
            } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
              setQuartos(prev => prev.filter(r => String(r.id) !== String(msg.id)));
            }
          }
        } catch {}
      };
    } catch {}
    return () => { if (es) { try { es.close(); } catch {} } };
  }, []);

  // Função para abrir o modal com detalhes do quarto
  const abrirModal = (quarto) => {
    setQuartoSelecionado(quarto);
    // Ajusta número de hóspedes conforme status ao abrir
    try {
      const count = Array.isArray(quarto?.hospedes) ? quarto.hospedes.length : 0;
      if (normalize(quarto?.status) === 'manutencao') {
        setNumeroHospedes(0);
      } else {
        setNumeroHospedes(Math.min(4, Math.max(1, count || 1)));
      }
    } catch {}
    // Inicializa o índice do WhatsApp principal
    if (quarto && Array.isArray(quarto.hospedes)) {
      const idx = quarto.hospedes.findIndex(h => h && h.whatsapp && quarto.whatsappPrincipal && h.whatsapp === quarto.whatsappPrincipal);
      if (idx >= 0) {
        setPrincipalIndex(idx);
      } else {
        // Caso não haja principal salvo, define o primeiro hóspede com WhatsApp, senão 0
        const firstWithWhats = quarto.hospedes.findIndex(h => h && h.whatsapp);
        setPrincipalIndex(firstWithWhats >= 0 ? firstWithWhats : 0);
      }
    } else {
      setPrincipalIndex(0);
    }
    setOpenHospedeIndex(0);
    setModalAberto(true);
  };

  // Função para fechar o modal
  const fecharModal = () => {
    setModalAberto(false);
    setQuartoSelecionado(null);
  };

  // Função para atualizar o status do quarto
  const atualizarQuarto = async (e) => {
    e.preventDefault();
    const hospedes = quartoSelecionado.hospedes || [];
    const principal = hospedes[principalIndex]?.whatsapp || '';
    const atualizado = { ...quartoSelecionado, whatsappPrincipal: principal };
    let novosQuartos = quartos.map(q => (q.id === atualizado.id ? atualizado : q));
    setQuartos(novosQuartos);
    try {
      // Tenta atualizar no backend; se não existir, cria
      await api.update(Resources.Rooms, atualizado.id, atualizado);
    } catch (err) {
      try {
        const created = await api.create(Resources.Rooms, atualizado);
        // Substitui entrada pelo registro criado (com id do backend)
        novosQuartos = quartos.map(q => (q.id === atualizado.id ? created : q));
        setQuartos(novosQuartos);
      } catch {
        // Mantém apenas local
        alert('Backend indisponível. Alteração salva somente localmente.');
      }
    }
    try { localStorage.setItem('pms_quartos', JSON.stringify(novosQuartos)); } catch {}
    fecharModal();
  };

  // Função para alterar os dados do quarto selecionado
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Quando marcar como disponível ou manutenção, limpar campos preenchidos
    if (name === 'status' && (value === 'disponível' || value === 'manutenção')) {
      setQuartoSelecionado({
        ...quartoSelecionado,
        status: value,
        hospedes: [],
        checkIn: '',
        checkInHora: '',
        checkOut: '',
        checkOutHora: '',
        formaPagamento: '',
        whatsappPrincipal: ''
      });
      // Reset do número de hóspedes e índice do principal
      setNumeroHospedes(value === 'manutenção' ? 0 : 1);
      setPrincipalIndex(0);
      return;
    }
    setQuartoSelecionado({
      ...quartoSelecionado,
      [name]: value
    });
  };

  // Sair de manutenção rapidamente (define status como disponível e reativa edição)
  const retornarOperacao = () => {
    setQuartoSelecionado(prev => ({ ...prev, status: 'disponível' }));
    setNumeroHospedes(1);
  };

  // Função para atualizar dados de um hóspede
  const atualizarHospede = (index, campo, valor) => {
    const novosHospedes = [...quartoSelecionado.hospedes];
    if (!novosHospedes[index]) {
      novosHospedes[index] = { nome: '', cpf: '', whatsapp: '' };
    }
    novosHospedes[index] = { ...novosHospedes[index], [campo]: valor };
    
    setQuartoSelecionado({
      ...quartoSelecionado,
      hospedes: novosHospedes
    });
  };

  // Removido: utilizar utilitário padronizado `gerarLinkWhatsApp` de ../utils/whatsapp

  // Função para obter a classe CSS com base no status do quarto
  const getStatusClass = (status) => {
    switch(status) {
      case 'disponível': return 'bg-success';
      case 'ocupado': return 'bg-danger';
      case 'reservado': return 'bg-primary';
      case 'manutenção': return 'bg-warning text-dark';
      default: return '';
    }
  };

  const normalizedFiltro = normalize(filtroStatus);
  const quartosFiltrados = normalizedFiltro === 'todos'
    ? quartos
    : quartos.filter(q => normalize(q.status) === normalizedFiltro);

  return (
    <div className="container-fluid pms-page">
      <div className="pms-header mb-3">
        <h2 className="mb-0">Sistema de Gestão de Quartos (PMS)</h2>
      </div>
      {/* Indicação de filtro ativo */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="small text-muted">
          {(() => {
            const map = {
              todos: 'Todos os quartos',
              'disponível': 'Disponíveis',
              'ocupado': 'Ocupados',
              'reservado': 'Reservados',
              'manutenção': 'Em manutenção'
            };
            const label = map[filtroStatus] || 'Todos os quartos';
            const count = quartosFiltrados.length;
            return <span>Mostrando: {label} ({count})</span>;
          })()}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setFiltroStatus('todos')}>
          Mostrar todos
        </button>
      </div>
      
      <div className="row mb-3">
        <div className="col-md-3">
          <div 
            className={`card pms-box pms-box-disponivel ${filtroStatus === 'disponível' ? 'shadow' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setFiltroStatus(filtroStatus === 'disponível' ? 'todos' : 'disponível')}
          >
            <div className="card-body">
              <h5 className="card-title">Disponíveis <span className="status-badge disponivel badge-sm ms-2">Disponível</span></h5>
              <h3>{quartos.filter(q => normalize(q.status) === 'disponivel').length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div 
            className={`card pms-box pms-box-ocupado ${filtroStatus === 'ocupado' ? 'shadow' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setFiltroStatus(filtroStatus === 'ocupado' ? 'todos' : 'ocupado')}
          >
            <div className="card-body">
              <h5 className="card-title">Ocupados <span className="status-badge ocupado badge-sm ms-2">Ocupado</span></h5>
              <h3>{quartos.filter(q => normalize(q.status) === 'ocupado').length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div 
            className={`card pms-box pms-box-reservado ${filtroStatus === 'reservado' ? 'shadow' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setFiltroStatus(filtroStatus === 'reservado' ? 'todos' : 'reservado')}
          >
            <div className="card-body">
              <h5 className="card-title">Reservados <span className="status-badge reservado badge-sm ms-2">Reservado</span></h5>
              <h3>{quartos.filter(q => normalize(q.status) === 'reservado').length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div 
            className={`card pms-box pms-box-manutencao ${filtroStatus === 'manutenção' ? 'shadow' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setFiltroStatus(filtroStatus === 'manutenção' ? 'todos' : 'manutenção')}
          >
            <div className="card-body">
              <h5 className="card-title">Manutenção <span className="status-badge manutencao badge-sm ms-2">Manutenção</span></h5>
              <h3>{quartos.filter(q => normalize(q.status) === 'manutencao').length}</h3>
            </div>
          </div>
        </div>
      </div>
      
      
      <div className="row">
        {quartosFiltrados.map(quarto => (
          <div key={quarto.id} className="col-md-3 mb-4">
            <div className={`card quarto-card ${getStatusClass(quarto.status)}`} onClick={() => abrirModal(quarto)} style={{ cursor: 'pointer' }}>
              <div className="card-body">
                <h5 className="card-title">{quarto.nome} - {quarto.id}</h5>
                <p className="card-text">
                  Status: {
                    quarto.status === 'disponível' ? (
                      <span className="status-badge disponivel ms-1">Disponível</span>
                    ) : quarto.status === 'ocupado' ? (
                      <span className="status-badge ocupado ms-1">Ocupado</span>
                    ) : quarto.status === 'reservado' ? (
                      <span className="status-badge reservado ms-1">Reservado</span>
                    ) : quarto.status === 'manutenção' ? (
                      <span className="status-badge manutencao ms-1">Manutenção</span>
                    ) : (
                      <span className="ms-1">{quarto.status}</span>
                    )
                  }
                </p>
                {/* Conteúdo simplificado: somente título, status e botão */}
                <button 
                  className="btn detalhes-btn" 
                  onClick={(e) => { e.stopPropagation(); abrirModal(quarto); }}
                >
                  Detalhes
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para editar quarto */}
      {modalAberto && quartoSelecionado && (
        <div className="modal show d-block pms-modal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable pms-modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Quarto {quartoSelecionado.nome} - {quartoSelecionado.id}</h5>
                <button type="button" className="btn-close" onClick={fecharModal}></button>
              </div>
              <div className="modal-body">
                {/* Resumo compacto do quarto */}
                {quartoSelecionado.status !== 'manutenção' && (
                  <div className="card pms-summary mb-3">
                    <div className="card-body">
                      <div className="row g-3 align-items-center">
                        <div className="col-12 col-md-4">
                          <div className="small text-muted">Status</div>
                          <div>
                            {quartoSelecionado.status === 'disponível' ? (
                              <span className="status-badge disponivel badge-sm">Disponível</span>
                            ) : quartoSelecionado.status === 'ocupado' ? (
                              <span className="status-badge ocupado badge-sm">Ocupado</span>
                            ) : quartoSelecionado.status === 'reservado' ? (
                              <span className="status-badge reservado badge-sm">Reservado</span>
                            ) : (
                              <span className="badge bg-secondary">{quartoSelecionado.status}</span>
                            )}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="small text-muted">Período</div>
                          <div className="pms-summary-periodo">
                            {((quartoSelecionado.checkIn || quartoSelecionado.checkOut)) ? (
                              <>
                                <span>{quartoSelecionado.checkIn || '-'}</span>
                                {quartoSelecionado.checkInHora ? <span className="ms-1">{quartoSelecionado.checkInHora}</span> : null}
                                <span className="mx-1">→</span>
                                <span>{quartoSelecionado.checkOut || '-'}</span>
                                {quartoSelecionado.checkOutHora ? <span className="ms-1">{quartoSelecionado.checkOutHora}</span> : null}
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="small text-muted">Contato principal</div>
                          <div className="d-flex align-items-center gap-2">
                            {(() => {
                              const hospedes = quartoSelecionado.hospedes || [];
                              const principal = quartoSelecionado.whatsappPrincipal || hospedes[principalIndex]?.whatsapp || '';
                              const nome = hospedes[principalIndex]?.nome || '—';
                              const texto = [
                                'Contato do quarto via PMS',
                                quartoSelecionado?.nome ? `Quarto: ${quartoSelecionado.nome}` : null,
                                typeof quartoSelecionado?.id !== 'undefined' ? `ID: ${quartoSelecionado.id}` : null,
                                quartoSelecionado?.status ? `Status: ${quartoSelecionado.status}` : null,
                                nome && nome !== '—' ? `Contato principal: ${nome}` : null,
                              ].filter(Boolean).join('\n');
                              return (
                                <>
                                  <span className="me-1">{nome}</span>
                                  <a href={gerarLinkWhatsApp(principal, texto)} className="btn btn-success btn-sm" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                                  {!principal ? (
                                    <span className="text-muted">Sem número — abre seleção de contato</span>
                                  ) : null}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={atualizarQuarto}>
                  <div className="mb-3">
                    <label className="form-label mb-1">
                      Status
                      {quartoSelecionado.status === 'disponível' ? (
                        <span className="status-badge disponivel badge-sm ms-2">Disponível</span>
                      ) : quartoSelecionado.status === 'ocupado' ? (
                        <span className="status-badge ocupado badge-sm ms-2">Ocupado</span>
                      ) : quartoSelecionado.status === 'reservado' ? (
                        <span className="status-badge reservado badge-sm ms-2">Reservado</span>
                      ) : quartoSelecionado.status === 'manutenção' ? (
                        <span className="status-badge manutencao badge-sm ms-2">Manutenção</span>
                      ) : null}
                    </label>
                    <select 
                      className={`form-select ${quartoSelecionado.status === 'manutenção' ? 'form-select-sm mb-1' : ''}`} 
                      name="status" 
                      value={quartoSelecionado.status}
                      onChange={handleChange}
                      disabled={quartoSelecionado.status === 'manutenção'}
                    >
                      <option value="disponível">Disponível</option>
                      <option value="ocupado">Ocupado</option>
                      <option value="reservado">Reservado</option>
                      <option value="manutenção">Manutenção</option>
                    </select>
                    {quartoSelecionado.status === 'manutenção' && (
                      <div className="form-text mt-1 mb-1">
                        Em manutenção. Para editar novamente, retorne à operação.
                      </div>
                    )}
                    {quartoSelecionado.status === 'manutenção' && (
                      <button type="button" className="btn btn-outline-primary btn-sm mt-1" onClick={retornarOperacao}>
                        Retornar à operação
                      </button>
                    )}
                  </div>
                  
                  {/* Check-in/Check-out com horário e forma de pagamento quando ocupado ou reservado */}
                  {(quartoSelecionado.status === 'ocupado' || quartoSelecionado.status === 'reservado') && (
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label">Check-in (data)</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          name="checkIn" 
                          value={quartoSelecionado.checkIn || ''}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Check-in (horário)</label>
                        <input 
                          type="time" 
                          className="form-control" 
                          name="checkInHora" 
                          value={quartoSelecionado.checkInHora || ''}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Check-out (data)</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          name="checkOut" 
                          value={quartoSelecionado.checkOut || ''}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Check-out (horário)</label>
                        <input 
                          type="time" 
                          className="form-control" 
                          name="checkOutHora" 
                          value={quartoSelecionado.checkOutHora || ''}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Forma de Pagamento</label>
                        <select 
                          className="form-select" 
                          name="formaPagamento"
                          value={quartoSelecionado.formaPagamento || ''}
                          onChange={handleChange}
                        >
                          <option value="">Selecione...</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="credito">Cartão de Crédito</option>
                          <option value="debito">Cartão de Débito</option>
                          <option value="pix">Pix</option>
                          <option value="transferencia">Transferência</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Hóspedes: ocultar completamente em Manutenção; exibir editor completo nos demais */}
                  {quartoSelecionado.status !== 'manutenção' && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Número de Hóspedes</label>
                        <select 
                          className="form-select" 
                          value={numeroHospedes}
                          onChange={(e) => setNumeroHospedes(parseInt(e.target.value))}
                        >
                          <option value="1">1 Hóspede</option>
                          <option value="2">2 Hóspedes</option>
                          <option value="3">3 Hóspedes</option>
                          <option value="4">4 Hóspedes</option>
                        </select>
                      </div>

                      <div className="mb-2">
                        <small className="text-muted">Selecione abaixo o WhatsApp principal para contato do quarto.</small>
                      </div>

                      <div className="pms-accordion">
                        {[...Array(numeroHospedes)].map((_, index) => (
                          <div key={index} className={`accordion-item guest-accordion-item ${openHospedeIndex === index ? 'open' : ''}`}>
                            <button type="button" className="accordion-toggle" onClick={() => setOpenHospedeIndex(prev => prev === index ? null : index)}>
                              <span>Hóspede {index + 1}</span>
                              <span className="chev">▸</span>
                            </button>
                            <div className="accordion-body">
                              <div className="card mb-3 p-3 guest-card">
                                <div className="row g-2">
                                  <div className="col-12 col-md-6">
                                    <label className="form-label">Nome</label>
                                    <input 
                                      type="text" 
                                      className="form-control" 
                                      value={quartoSelecionado.hospedes[index]?.nome || ''}
                                      onChange={(e) => atualizarHospede(index, 'nome', e.target.value)}
                                    />
                                  </div>
                                  <div className="col-12 col-md-6">
                                    <label className="form-label">CPF</label>
                                    <input 
                                      type="text" 
                                      className="form-control" 
                                      placeholder="000.000.000-00"
                                      value={quartoSelecionado.hospedes[index]?.cpf || ''}
                                      onChange={(e) => atualizarHospede(index, 'cpf', e.target.value)}
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label">WhatsApp</label>
                                    <div className="input-group">
                                      <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="11999999999"
                                        value={quartoSelecionado.hospedes[index]?.whatsapp || ''}
                                        onChange={(e) => atualizarHospede(index, 'whatsapp', e.target.value)}
                                      />
                                      {(() => {
                                        const nomeHospede = quartoSelecionado.hospedes[index]?.nome || `Hóspede ${index + 1}`;
                                        const texto = [
                                          'Contato via PMS',
                                          quartoSelecionado?.nome ? `Quarto: ${quartoSelecionado.nome}` : null,
                                          typeof quartoSelecionado?.id !== 'undefined' ? `ID: ${quartoSelecionado.id}` : null,
                                          nomeHospede ? `Contato: ${nomeHospede}` : null,
                                        ].filter(Boolean).join('\n');
                                        return (
                                          <a 
                                            href={gerarLinkWhatsApp(quartoSelecionado.hospedes[index]?.whatsapp, texto)}
                                            className="btn btn-success btn-sm"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            Conversar
                                          </a>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  <div className="col-12">
                                    <div className="form-check">
                                      <input
                                        className="form-check-input"
                                        type="radio"
                                        name="whatsappPrincipal"
                                        id={`whatsappPrincipal_${index}`}
                                        checked={principalIndex === index}
                                        onChange={() => setPrincipalIndex(index)}
                                      />
                                      <label className="form-check-label" htmlFor={`whatsappPrincipal_${index}`}>WhatsApp principal</label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Salvar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {modalAberto && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default PMS;
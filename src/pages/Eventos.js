import React, { useState, useEffect, useRef } from 'react';
import { api, Resources } from '../services/api';

const Eventos = () => {
  const [calendarNotif, setCalendarNotif] = useState('');
  const pad2 = (n) => String(n).padStart(2, '0');
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const getDefaultTimes = () => {
    const d = new Date();
    const start = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const endDate = new Date(d.getTime() + 60 * 60 * 1000);
    const end = `${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`;
    return { start, end };
  };
  // Estado inicial dos eventos
  const defaultEventos = [
    { 
      id: 1, 
      nome: 'Conferência Empresarial', 
      data: '2023-05-15', 
      horaInicio: '09:00', 
      horaFim: '18:00',
      local: 'Salão Principal',
      capacidade: 100,
      participantes: [
        { id: 1, nome: 'João Silva', email: 'joao@email.com', telefone: '(11) 98765-4321', status: 'confirmado' },
        { id: 2, nome: 'Maria Santos', email: 'maria@email.com', telefone: '(11) 91234-5678', status: 'confirmado' },
        { id: 3, nome: 'Pedro Alves', email: 'pedro@email.com', telefone: '(11) 99876-5432', status: 'pendente' }
      ],
      descricao: 'Conferência anual para discussão de estratégias empresariais.'
    },
    { 
      id: 2, 
      nome: 'Casamento Silva & Costa', 
      data: '2023-06-20', 
      horaInicio: '19:00', 
      horaFim: '02:00',
      local: 'Salão de Festas',
      capacidade: 150,
      participantes: [
        { id: 1, nome: 'Carlos Mendes', email: 'carlos@email.com', telefone: '(11) 97777-8888', status: 'confirmado' },
        { id: 2, nome: 'Ana Costa', email: 'ana@email.com', telefone: '(11) 96666-7777', status: 'confirmado' }
      ],
      descricao: 'Cerimônia de casamento seguida de recepção.'
    },
    { 
      id: 3, 
      nome: 'Workshop de Culinária', 
      data: '2023-05-10', 
      horaInicio: '14:00', 
      horaFim: '17:00',
      local: 'Cozinha Industrial',
      capacidade: 30,
      participantes: [
        { id: 1, nome: 'Luiza Ferreira', email: 'luiza@email.com', telefone: '(11) 95555-6666', status: 'confirmado' },
        { id: 2, nome: 'Roberto Gomes', email: 'roberto@email.com', telefone: '(11) 94444-5555', status: 'pendente' },
        { id: 3, nome: 'Teresa Vieira', email: 'teresa@email.com', telefone: '(11) 93333-4444', status: 'confirmado' },
        { id: 4, nome: 'Fernando Lima', email: 'fernando@email.com', telefone: '(11) 92222-3333', status: 'confirmado' }
      ],
      descricao: 'Workshop de culinária italiana com chef renomado.'
    }
  ];
  const [eventos, setEventos] = useState(defaultEventos);

  const [eventoAtual, setEventoAtual] = useState(null);
  const defTimesInit = getDefaultTimes();
  const [novoEvento, setNovoEvento] = useState({
    nome: '',
    data: getTodayStr(),
    horaInicio: defTimesInit.start,
    horaFim: defTimesInit.end,
    local: '',
    capacidade: 0,
    participantes: [],
    descricao: '',
    status: 'planejado'
  });
  const [novoParticipante, setNovoParticipante] = useState({
    nome: '',
    email: '',
    telefone: '',
    status: 'pendente'
  });
  const [modoEdicao, setModoEdicao] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFormParticipante, setMostrarFormParticipante] = useState(false);
  const [mostrarAgenda, setMostrarAgenda] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(getTodayStr());
  const [agendaEdicaoId, setAgendaEdicaoId] = useState(null);
  const [agendaEdicao, setAgendaEdicao] = useState({ nome: '', horaInicio: '', horaFim: '', status: '' });
  const [printEvtTimestamp, setPrintEvtTimestamp] = useState('');
  // Removidos estados de criação rápida (título e tipo)
  const [clientePrintNome, setClientePrintNome] = useState('');
  const [clientePrintCnpj, setClientePrintCnpj] = useState('');

  // Carregar eventos do backend; semear se vazio
  useEffect(() => {
    let isMounted = true;
    let es;
    (async () => {
      try {
        const list = await api.list(Resources.Events);
        if (Array.isArray(list) && list.length > 0) {
          if (isMounted) setEventos(list);
        } else {
          // Semear eventos iniciais
          await Promise.all(defaultEventos.map(ev => api.create(Resources.Events, ev)));
          const seeded = await api.list(Resources.Events);
          if (isMounted) setEventos(seeded);
        }
      } catch {
        // Mantém eventos padrão local
      }
      // SSE: atualizações instantâneas de eventos
      try {
        const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
        es = new EventSource(`${base}/stream`);
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.resource === 'events') {
              if (msg.action === 'create' && msg.item) {
                setEventos(prev => {
                  const exists = prev.some(e => String(e.id) === String(msg.item.id));
                  return exists ? prev.map(e => (String(e.id) === String(msg.item.id) ? msg.item : e)) : [...prev, msg.item];
                });
              } else if (msg.action === 'update' && msg.item) {
                setEventos(prev => prev.map(e => (String(e.id) === String(msg.item.id) ? msg.item : e)));
              } else if (msg.action === 'delete' && typeof msg.id !== 'undefined') {
                setEventos(prev => prev.filter(e => String(e.id) !== String(msg.id)));
              }
            }
          } catch {}
        };
      } catch {}
    })();
    return () => { isMounted = false; if (es) { try { es.close(); } catch {} } };
  }, []);

  const persistEvento = async (ev) => {
    try {
      await api.update(Resources.Events, ev.id, ev);
    } catch {
      // Falha silenciosa: manter estado local
    }
  };

  // Função para abrir o formulário de novo evento
  const abrirFormularioEvento = () => {
    setModoEdicao(false);
    setEventoAtual(null);
    const { start, end } = getDefaultTimes();
    setNovoEvento({
      nome: '',
      tipo: 'Casamento',
      data: getTodayStr(),
      horaInicio: start,
      horaFim: end,
      local: '',
      capacidade: 0,
      participantes: [],
      descricao: '',
      status: 'planejado'
    });
    setMostrarFormulario(true);
  };

  // Removida função de criação rápida

  // Função para abrir o formulário de edição de evento
  const editarEvento = (evento) => {
    setModoEdicao(true);
    setEventoAtual(evento);
    setNovoEvento({ ...evento });
    setMostrarFormulario(true);
  };

  // Removido link para Google Calendar

  // Exportar evento como arquivo ICS
  const downloadICS = (ev) => {
    if (!ev) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    const pad = (n) => String(n).padStart(2, '0');
    const fmtLocal = (d) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const fmtUtc = (d) => {
      const z = new Date(d.getTime());
      return `${z.getUTCFullYear()}${pad(z.getUTCMonth()+1)}${pad(z.getUTCDate())}T${pad(z.getUTCHours())}${pad(z.getUTCMinutes())}${pad(z.getUTCSeconds())}Z`;
    };
    try {
      const start = new Date(`${ev.data}T${ev.horaInicio || '00:00'}:00`);
      const end = new Date(`${ev.data}T${ev.horaFim || ev.horaInicio || '01:00'}:00`);
      const uid = `${Date.now()}-${ev.id || 'evt'}@techbox`;
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TechBox//Gestao de Eventos//PT-BR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${fmtUtc(new Date())}`,
        `DTSTART;TZID=${tz}:${fmtLocal(start)}`,
        `DTEND;TZID=${tz}:${fmtLocal(end)}`,
        `SUMMARY:${(ev.nome || 'Evento').replace(/\n/g,' ')}`,
        `DESCRIPTION:${(ev.descricao || '').replace(/\n/g,' ')}`,
        `LOCATION:${(ev.local || '').replace(/\n/g,' ')}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ];
      const ics = lines.join('\r\n');
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evento-${ev.id || 'novo'}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  // Função para visualizar detalhes do evento
  const visualizarEvento = (evento) => {
    setEventoAtual(evento);
    setMostrarFormParticipante(false);
  };

  const imprimirDetalheEvento = () => {
    const now = new Date();
    const ts = now.toLocaleString('pt-BR');
    setPrintEvtTimestamp(ts);
    window.print();
  };

  // Nome da agenda interna
  const [calendarSummary, setCalendarSummary] = useState('Eventos');

  // Carregar nome do calendário do backend ou localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await api.getConfig();
        if (mounted && cfg?.calendarSummary) setCalendarSummary(cfg.calendarSummary);
      } catch {
        try {
          const savedCfg = JSON.parse(localStorage.getItem('cliente_config') || '{}');
          if (mounted && savedCfg?.calendarSummary) setCalendarSummary(savedCfg.calendarSummary);
        } catch {}
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Refletir mudanças de configuração em tempo real (sem reload)
  useEffect(() => {
    const onCfgUpdated = (e) => {
      const cfg = e?.detail || {};
      if (cfg.calendarSummary) {
        const name = String(cfg.calendarSummary || '').trim() || 'Eventos';
        setCalendarSummary(name);
        try { setCalendarNotif(`Agenda alterada para \"${name}\"`); } catch {}
      }
    };
    try { window.addEventListener('config_updated', onCfgUpdated); } catch {}
    return () => { try { window.removeEventListener('config_updated', onCfgUpdated); } catch {} };
  }, []);

  // Oculta a notificação automaticamente após alguns segundos
  useEffect(() => {
    if (!calendarNotif) return;
    const t = setTimeout(() => setCalendarNotif(''), 2500);
    return () => clearTimeout(t);
  }, [calendarNotif]);
  // Removidas integrações com Google (OAuth, importação e sincronização)

  // --- Filtros ---
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDataIni, setFiltroDataIni] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const atendeFiltro = (ev) => {
    const textoOk = filtroTexto
      ? (ev.nome?.toLowerCase().includes(filtroTexto.toLowerCase()) || ev.descricao?.toLowerCase().includes(filtroTexto.toLowerCase()))
      : true;
    const localOk = filtroLocal ? (ev.local?.toLowerCase().includes(filtroLocal.toLowerCase())) : true;
    const statusOk = filtroStatus ? ((ev.status || 'planejado') === filtroStatus) : ((ev.status || 'planejado') !== 'importado');
    const dataVal = ev.data || '';
    const iniOk = filtroDataIni ? (dataVal >= filtroDataIni) : true;
    const fimOk = filtroDataFim ? (dataVal <= filtroDataFim) : true;
    return textoOk && localOk && statusOk && iniOk && fimOk;
  };
  const eventosFiltrados = eventos.filter(atendeFiltro);

  // --- Calendário Interno ---
  const [mesBase, setMesBase] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const mesLabel = React.useMemo(() => (
    mesBase.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  ), [mesBase]);
  const startOfGrid = React.useMemo(() => {
    const d = new Date(mesBase);
    d.setDate(1);
    const dow = d.getDay(); // 0 (Dom) .. 6 (Sáb)
    // Começar a grade na segunda-feira
    const diff = (dow + 6) % 7; // 0 se for segunda
    d.setDate(1 - diff);
    d.setHours(0,0,0,0);
    return d;
  }, [mesBase]);
  const diasGrid = React.useMemo(() => {
    const arr = [];
    const start = new Date(startOfGrid);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startOfGrid]);
  const eventosPorDia = React.useMemo(() => {
    const map = {};
    const fmt = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    const baseEventos = eventos.filter(ev => (ev.status || 'planejado') !== 'importado');
    baseEventos.forEach(ev => {
      const key = ev.data;
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [eventos]);
  const isSameMonth = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
  const hoje = new Date();
  const corEventoPorTipo = (tipo) => {
    const map = {
      'Casamento': '#d93025',
      'Aniversário': '#1a73e8',
    };
    return map[tipo] || '#34a853';
  };
  const eventosDoDia = React.useMemo(() => eventos.filter(ev => ev.data === diaSelecionado && (ev.status || 'planejado') !== 'importado'), [eventos, diaSelecionado]);
  const iniciarEdicaoAgenda = (ev) => {
    setAgendaEdicaoId(ev.id);
    setAgendaEdicao({ nome: ev.nome || '', horaInicio: ev.horaInicio || '', horaFim: ev.horaFim || '', status: ev.status || 'planejado' });
  };

  // Normalizar tipos antigos para os novos permitidos
  const normalizedTiposRef = useRef(false);
  useEffect(() => {
    if (normalizedTiposRef.current) return;
    if (!eventos || eventos.length === 0) return;
    const allowed = new Set(['Casamento', 'Aniversário']);
    const updates = [];
    const normalized = eventos.map(ev => {
      let tipo = ev.tipo || '';
      if (!allowed.has(tipo)) {
        const tRaw = String(tipo).toLowerCase();
        if (tRaw === 'workshop') {
          tipo = 'Aniversário';
        } else if (tRaw === 'conferência' || tRaw === 'conferencia') {
          tipo = 'Casamento';
        } else {
          const nome = (ev.nome || '').toLowerCase();
          if (nome.includes('casamento') || nome.includes('bodas')) {
            tipo = 'Casamento';
          } else {
            tipo = 'Aniversário';
          }
        }
        updates.push({ ...ev, tipo });
        return { ...ev, tipo };
      }
      return ev;
    });
    if (updates.length > 0) {
      setEventos(normalized);
      // Persistir silenciosamente
      updates.forEach(async (u) => {
        try { await persistEvento(u); } catch {}
      });
    }
    normalizedTiposRef.current = true;
  }, [eventos]);
  const cancelarEdicaoAgenda = () => { setAgendaEdicaoId(null); setAgendaEdicao({ nome: '', horaInicio: '', horaFim: '', status: '' }); };
  const salvarEdicaoAgenda = async () => {
    if (!agendaEdicaoId) return;
    const eventosAtualizados = eventos.map(ev => ev.id === agendaEdicaoId ? { ...ev, ...agendaEdicao } : ev);
    setEventos(eventosAtualizados);
    const atualizado = eventosAtualizados.find(ev => ev.id === agendaEdicaoId);
    await persistEvento(atualizado);
    cancelarEdicaoAgenda();
  };

  // Carrega nome e CNPJ do cliente para o cabeçalho de impressão
  useEffect(() => {
    try {
      const perfilStr = localStorage.getItem('cliente_perfil');
      const configStr = localStorage.getItem('cliente_config');
      const perfil = perfilStr ? JSON.parse(perfilStr) : {};
      const config = configStr ? JSON.parse(configStr) : {};
      const nome = perfil?.nome || config?.nome || '';
      const cnpj = perfil?.cnpj || config?.cnpj || '';
      setClientePrintNome(nome);
      setClientePrintCnpj(cnpj);
    } catch {}
  }, []);

  const renderTipoIcon = (tipo) => {
    switch ((tipo || '').toLowerCase()) {
      case 'casamento':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="12" r="4" />
            <circle cx="16" cy="12" r="4" />
            <path d="M12 8v8" />
          </svg>
        );
      case 'aniversário':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4" />
            <path d="M6 10h12" />
            <path d="M4 14h16" />
            <path d="M6 18h12" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        );
    }
  };

  // Função para salvar evento (novo ou editado)
  const salvarEvento = async (e) => {
    e.preventDefault();
    // Garantir defaults caso o usuário limpe campos
    const { start, end } = getDefaultTimes();
    const normalized = {
      ...novoEvento,
      data: novoEvento.data || getTodayStr(),
      horaInicio: novoEvento.horaInicio || start,
      horaFim: novoEvento.horaFim || end,
    };
    
    if (modoEdicao) {
      // Atualizar evento existente
      setEventos((prev) => prev.map(ev => ev.id === eventoAtual.id ? { ...normalized, id: eventoAtual.id } : ev));
      await persistEvento({ ...normalized, id: eventoAtual.id });
    } else {
      // Adicionar novo evento
      try {
        const created = await api.create(Resources.Events, normalized);
        setEventos([...eventos, created]);
      } catch {
        const id = eventos.length > 0 ? Math.max(...eventos.map(e => e.id)) + 1 : 1;
        setEventos([...eventos, { ...normalized, id }]);
        alert('Backend indisponível. Evento criado apenas localmente.');
      }
    }
    
    setMostrarFormulario(false);
  };

  // Função para excluir evento
  const excluirEvento = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      try { await api.remove(Resources.Events, id); } catch {}
      setEventos(eventos.filter(evento => evento.id !== id));
      if (eventoAtual && eventoAtual.id === id) {
        setEventoAtual(null);
      }
    }
  };

  // Função para adicionar participante ao evento atual
  const adicionarParticipante = async (e) => {
    e.preventDefault();
    
    const id = eventoAtual.participantes.length > 0 
      ? Math.max(...eventoAtual.participantes.map(p => p.id)) + 1 
      : 1;
    
    const participanteNovo = { ...novoParticipante, id };
    const eventosAtualizados = eventos.map(ev => {
      if (ev.id === eventoAtual.id) {
        return {
          ...ev,
          participantes: [...ev.participantes, participanteNovo]
        };
      }
      return ev;
    });
    
    setEventos(eventosAtualizados);
    setEventoAtual({
      ...eventoAtual,
      participantes: [...eventoAtual.participantes, participanteNovo]
    });
    await persistEvento({ ...eventoAtual, participantes: [...eventoAtual.participantes, participanteNovo] });
    
    setNovoParticipante({
      nome: '',
      email: '',
      telefone: '',
      status: 'pendente'
    });
    
    setMostrarFormParticipante(false);
  };

  // Função para remover participante
  const removerParticipante = async (participanteId) => {
    if (window.confirm('Tem certeza que deseja remover este participante?')) {
      const eventosAtualizados = eventos.map(ev => {
        if (ev.id === eventoAtual.id) {
          return {
            ...ev,
            participantes: ev.participantes.filter(p => p.id !== participanteId)
          };
        }
        return ev;
      });
      
      setEventos(eventosAtualizados);
      setEventoAtual({
        ...eventoAtual,
        participantes: eventoAtual.participantes.filter(p => p.id !== participanteId)
      });
      await persistEvento({ ...eventoAtual, participantes: eventoAtual.participantes.filter(p => p.id !== participanteId) });
    }
  };

  // Função para alternar status do participante (pendente -> confirmado -> cancelado)
  const alternarStatus = async (participanteId) => {
    const cycle = (s) => (s === 'pendente' ? 'confirmado' : s === 'confirmado' ? 'cancelado' : 'pendente');
    const eventosAtualizados = eventos.map(ev => {
      if (ev.id === eventoAtual.id) {
        return {
          ...ev,
          participantes: ev.participantes.map(p => {
            if (p.id === participanteId) {
              return { ...p, status: cycle(p.status || (p.confirmado ? 'confirmado' : 'pendente')) };
            }
            return p;
          })
        };
      }
      return ev;
    });
    
    setEventos(eventosAtualizados);
    setEventoAtual({
      ...eventoAtual,
      participantes: eventoAtual.participantes.map(p => {
        if (p.id === participanteId) {
          return { ...p, status: cycle(p.status || (p.confirmado ? 'confirmado' : 'pendente')) };
        }
        return p;
      })
    });
    await persistEvento({ ...eventoAtual, participantes: eventosAtualizados.find(ev => ev.id === eventoAtual.id)?.participantes || eventoAtual.participantes });
  };

  // Função para atualizar campos do novo evento
  const handleEventoChange = (e) => {
    const { name, value } = e.target;
    setNovoEvento({
      ...novoEvento,
      [name]: name === 'capacidade' ? parseInt(value) : value
    });
  };

  // Função para atualizar campos do novo participante
  const handleParticipanteChange = (e) => {
    const { name, value } = e.target;
    setNovoParticipante({
      ...novoParticipante,
      [name]: value
    });
  };

  return (
    <div className="container-fluid eventos-page">
      <div className="page-header mb-4">
        <h2 className="m-0 d-flex align-items-center gap-2">
          Gestão de Eventos
          <span aria-hidden="true" title="Pingu" style={{fontSize:'1.25rem'}}>🐧</span>
        </h2>
      </div>
      
      <div className="row">
        {/* Lista de Eventos */}
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-header eventos-header">
              <h5 className="m-0 d-flex align-items-center gap-2">
                {/* Ícone de calendário inline (SVG) */}
                <span aria-hidden="true" title="Calendário" style={{display:'inline-flex',alignItems:'center'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 2 0v1Zm13 6H4v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8ZM6 10h4v4H6v-4Zm6 0h4v4h-4v-4Z"/>
                  </svg>
                </span>
                <span>Eventos</span>
              </h5>
              <div className="eventos-toolbar ms-auto d-flex gap-2 flex-wrap">
                <button 
                  type="button"
                  className="btn btn-outline-success btn-sm eventos-calendar-btn"
                  onClick={() => setMostrarAgenda(true)}
                  title="Abrir Agenda"
                >
                  Abrir Agenda
                </button>
                <button 
                  type="button"
                  className="btn btn-outline-primary btn-sm eventos-add-btn"
                  onClick={abrirFormularioEvento}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-1" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M8 3a.75.75 0 0 1 .75.75V7.25h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5H3.25a.75.75 0 0 1 0-1.5h3.5V3.75A.75.75 0 0 1 8 3Z"/>
                  </svg>
                  Adicionar
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Filtros */}
              <div className="mb-3 eventos-filtros">
                  <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label">Buscar</label>
                    <input className="form-control" placeholder="Texto..." value={filtroTexto} onChange={(e)=>setFiltroTexto(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label">Data inicial</label>
                    <input type="date" className="form-control" value={filtroDataIni} onChange={(e)=>setFiltroDataIni(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label">Data final</label>
                    <input type="date" className="form-control" value={filtroDataFim} onChange={(e)=>setFiltroDataFim(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label">Local</label>
                    <input className="form-control" value={filtroLocal} onChange={(e)=>setFiltroLocal(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={filtroStatus} onChange={(e)=>setFiltroStatus(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="planejado">Planejado</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="col-12 d-flex justify-content-between align-items-center flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-info" title="Agenda interna">
                        Agenda: {calendarSummary || 'Eventos'}
                      </span>
                      {calendarNotif && (
                        <span className="badge bg-light text-dark border" role="status" aria-live="polite">
                          {calendarNotif}
                        </span>
                      )}
                    </div>
                    <div className="d-flex align-items-center">
                      <button className="btn btn-sm btn-outline-dark" onClick={()=>{setFiltroTexto('');setFiltroLocal('');setFiltroStatus('');setFiltroDataIni('');setFiltroDataFim('');}}>Limpar filtros</button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Calendário Interno */}
              {/* Agenda inline removida — a agenda agora abre em modal */}
              {eventos.length === 0 ? (
                <p className="text-center">Nenhum evento cadastrado</p>
              ) : (
                <div className="list-group">
                  {eventosFiltrados.map(evento => (
                    <div 
                      key={evento.id} 
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${eventoAtual && eventoAtual.id === evento.id ? 'active' : ''}`}
                      onClick={() => visualizarEvento(evento)}
                    >
                      <div className="d-flex align-items-start gap-2">
                        <span className="evento-icon">{renderTipoIcon(evento.tipo)}</span>
                        <div>
                          <h6 className="mb-1">{evento.nome}</h6>
                          <small>{evento.data} - {evento.local}</small>
                          <div>
                            <span className={`badge bg-${(evento.status||'planejado')==='confirmado'?'success':(evento.status||'planejado')==='cancelado'?'danger':'secondary'} mt-1`}>
                              {evento.status || 'planejado'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2 flex-wrap align-items-center justify-content-end">
                        <button 
                          className="btn btn-sm btn-primary me-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            editarEvento(evento);
                          }}
                        >
                          Editar
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            excluirEvento(evento.id);
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Seção de eventos importados do Google removida */}
            </div>
          </div>
        </div>
        
        {/* Detalhes do Evento */}
        <div className="col-12 col-md-6">
          {/* Agenda lateral (desktop) */}
          <div className="card mb-3 d-none d-lg-block">
            <div className="card-header d-flex align-items-center">
              <strong>Agenda do dia</strong>
              <div className="ms-auto d-flex align-items-center gap-2">
                <input type="date" className="form-control form-control-sm" style={{width:'160px'}} value={diaSelecionado} onChange={(e)=>setDiaSelecionado(e.target.value)} />
                <button className="btn btn-sm btn-outline-secondary" onClick={()=>setDiaSelecionado(getTodayStr())}>Hoje</button>
              </div>
            </div>
            <div className="card-body">
              {eventosDoDia.length === 0 ? (
                <div className="text-muted">Nenhum evento para este dia.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {eventosDoDia.map(ev => (
                    <div key={ev.id} className="agenda-item card p-2" style={{ borderLeft: `6px solid ${corEventoPorTipo(ev.tipo)}` }}>
                      {agendaEdicaoId === ev.id ? (
                        <div className="row g-2 align-items-center">
                          <div className="col-12 col-xl-4">
                            <input type="text" className="form-control form-control-sm" value={agendaEdicao.nome} onChange={(e)=>setAgendaEdicao({ ...agendaEdicao, nome: e.target.value })} />
                          </div>
                          <div className="col-6 col-xl-2">
                            <input type="time" className="form-control form-control-sm" value={agendaEdicao.horaInicio} onChange={(e)=>setAgendaEdicao({ ...agendaEdicao, horaInicio: e.target.value })} />
                          </div>
                          <div className="col-6 col-xl-2">
                            <input type="time" className="form-control form-control-sm" value={agendaEdicao.horaFim} onChange={(e)=>setAgendaEdicao({ ...agendaEdicao, horaFim: e.target.value })} />
                          </div>
                          <div className="col-12 col-xl-2">
                            <select className="form-select form-select-sm" value={agendaEdicao.status} onChange={(e)=>setAgendaEdicao({ ...agendaEdicao, status: e.target.value })}>
                              <option value="planejado">Planejado</option>
                              <option value="confirmado">Confirmado</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                          <div className="col-12 col-xl-2 d-flex gap-2 justify-content-end">
                            <button className="btn btn-sm btn-primary" onClick={salvarEdicaoAgenda}>Salvar</button>
                            <button className="btn btn-sm btn-secondary" onClick={cancelarEdicaoAgenda}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex flex-column">
                            <strong className="small">{ev.nome}</strong>
                            <span className="text-muted small">{ev.horaInicio} — {ev.horaFim} • {ev.local}</span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`badge bg-${(ev.status||'planejado')==='confirmado'?'success':(ev.status||'planejado')==='cancelado'?'danger':'secondary'}`}>{ev.status || 'planejado'}</span>
                            <button className="btn btn-sm btn-outline-primary" onClick={()=>iniciarEdicaoAgenda(ev)}>Editar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {eventoAtual ? (
            <div className="card">
              <div className="card-header d-flex align-items-center flex-wrap">
                <h5 className="m-0">Detalhes do Evento</h5>
                <div className="ms-auto d-flex align-items-center gap-2 flex-wrap">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => setMostrarFormParticipante(true)}
                  >
                    Adicionar Participante
                  </button>
                  {/* Botão Google Calendar removido */}
                  <button
                    className="btn btn-sm btn-outline-primary ms-2"
                    onClick={() => downloadICS(eventoAtual)}
                    title="Exportar em .ics"
                  >
                    Exportar .ics
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-secondary ms-2"
                    onClick={imprimirDetalheEvento}
                  >
                    Imprimir
                  </button>
                  {/* Integração Google removida */}
                </div>
              </div>
              <div className="card-body">
                <div className="print-event-header">
                  <div><strong>{clientePrintNome || 'Pousada'}</strong></div>
                  {clientePrintCnpj && (<div><small>CNPJ: {clientePrintCnpj}</small></div>)}
                  <div><strong>Gestão de Eventos <span aria-hidden="true" title="Pingu">🐧</span></strong></div>
                  <div>{eventoAtual.nome}</div>
                  <div><small>Data/Hora: {printEvtTimestamp}</small></div>
                </div>
                <div className="print-event-summary">
                  <div><strong>Data:</strong> {eventoAtual.data}</div>
                  <div><strong>Horário:</strong> {eventoAtual.horaInicio} às {eventoAtual.horaFim}</div>
                  <div><strong>Local:</strong> {eventoAtual.local}</div>
                  <div><strong>Status:</strong> {eventoAtual.status || 'planejado'}</div>
                </div>
                <h4>{eventoAtual.nome}</h4>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Data:</strong> {eventoAtual.data}</p>
                  <p><strong>Horário:</strong> {eventoAtual.horaInicio} às {eventoAtual.horaFim}</p>
                  <p><strong>Local:</strong> {eventoAtual.local}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Capacidade:</strong> {eventoAtual.capacidade} pessoas</p>
                    <p><strong>Participantes:</strong> {eventoAtual.participantes.filter(p => (p.status ?? (p.confirmado ? 'confirmado' : 'pendente')) === 'confirmado').length} confirmados</p>
                    <p><strong>Pendentes:</strong> {eventoAtual.participantes.filter(p => (p.status ?? (p.confirmado ? 'confirmado' : 'pendente')) === 'pendente').length}</p>
                    <p><strong>Cancelados:</strong> {eventoAtual.participantes.filter(p => (p.status ?? (p.confirmado ? 'confirmado' : 'pendente')) === 'cancelado').length}</p>
                    <p><strong>Vagas Restantes:</strong> {eventoAtual.capacidade - eventoAtual.participantes.filter(p => (p.status ?? (p.confirmado ? 'confirmado' : 'pendente')) === 'confirmado').length}</p>
                  </div>
                </div>
                <div className="mb-3 d-flex align-items-center gap-2 status-controls">
                  <span>Status:</span>
                  <select className="form-select form-select-sm" style={{maxWidth:'180px'}} value={eventoAtual.status || 'planejado'} onChange={(e)=>{
                    const val = e.target.value;
                    setEventoAtual(prev => ({...prev, status: val}));
                    setEventos(prev => prev.map(ev => ev.id === eventoAtual.id ? {...ev, status: val} : ev));
                  }}>
                    <option value="planejado">Planejado</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <span className={`badge bg-${(eventoAtual.status||'planejado')==='confirmado'?'success':(eventoAtual.status||'planejado')==='cancelado'?'danger':'secondary'}`}>{eventoAtual.status || 'planejado'}</span>
                </div>
                
                <div className="mb-3">
                  <h5>Descrição</h5>
                  <p>{eventoAtual.descricao}</p>
                </div>
                
                <div>
                  <h5>Participantes</h5>
                  {eventoAtual.participantes.length === 0 ? (
                    <p>Nenhum participante cadastrado</p>
                  ) : (
                    <div className="table-container">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>Status</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventoAtual.participantes.map(participante => (
                            <tr key={participante.id}>
                              <td>{participante.nome}</td>
                              <td>{participante.email}</td>
                              <td>{participante.telefone}</td>
                              <td>
                                <span 
                                  className={`badge ${participante.status === 'confirmado' ? 'bg-success' : participante.status === 'cancelado' ? 'bg-danger' : 'bg-warning'}`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => alternarStatus(participante.id)}
                                >
                                  {participante.status === 'confirmado' ? 'Confirmado' : participante.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-danger"
                                  onClick={() => removerParticipante(participante.id)}
                                >
                                  Remover
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
          ) : (
            <div className="alert alert-info">
              Selecione um evento para visualizar os detalhes ou adicione um novo evento.
            </div>
          )}
        </div>
      </div>
      
      {/* Modal da Agenda */}
      {mostrarAgenda && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog agenda-modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Agenda</h5>
                <button type="button" className="btn-close" onClick={() => setMostrarAgenda(false)}></button>
              </div>
              <div className="modal-body agenda-modal">
                <div className="agenda-header mb-3">
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>{ const d=new Date(mesBase); d.setMonth(d.getMonth()-1); setMesBase(d); }}>« Mês anterior</button>
                  <div className="month-label">{mesLabel}</div>
                  <button className="btn btn-sm btn-outline-secondary ms-2" onClick={()=>{ const d=new Date(mesBase); d.setMonth(d.getMonth()+1); setMesBase(d); }}>Próximo mês »</button>
                </div>
                {/* Cabeçalho dos dias da semana (começa na segunda) */}
                <div className="agenda-week-header mb-2">
                  <div className="col"><small>Seg</small></div>
                  <div className="col"><small>Ter</small></div>
                  <div className="col"><small>Qua</small></div>
                  <div className="col"><small>Qui</small></div>
                  <div className="col"><small>Sex</small></div>
                  <div className="col"><small>Sáb</small></div>
                  <div className="col"><small>Dom</small></div>
                </div>
                <div className="agenda-grid">
                  {diasGrid.map((d, idx) => {
                    const key = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
                    const evts = eventosPorDia[key] || [];
                    const foraMes = !isSameMonth(d, mesBase);
                    const ehHoje = d.toDateString() === hoje.toDateString();
                    const fimDeSemana = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={idx} className={"agenda-cell " + (foraMes ? 'muted ' : '') + (fimDeSemana ? 'weekend ' : '') + (ehHoje ? 'today ' : '')} onClick={() => { setFiltroDataIni(key); setFiltroDataFim(key); setDiaSelecionado(key); setMostrarAgenda(false); }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <strong className={"day-number " + (foraMes ? 'text-muted' : '')}>{d.getDate()}</strong>
                          {ehHoje && (<span className="badge bg-primary">Hoje</span>)}
                        </div>
                        <div className="agenda-events">
                          {evts.slice(0,5).map(ev => (
                            <span key={ev.id} className="agenda-event-chip" style={{ '--chip-color': corEventoPorTipo(ev.tipo) }} title={`${ev.nome} - ${ev.horaInicio || ''}`}>{ev.nome}</span>
                          ))}
                          {evts.length > 5 && (
                            <span className="agenda-event-more">+{evts.length - 5} mais</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
  {mostrarAgenda && <div className="modal-backdrop fade show"></div>}

      {/* Modal para adicionar/editar evento */}
      {mostrarFormulario && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered eventos-modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modoEdicao ? 'Editar Evento' : 'Adicionar Evento'}</h5>
                <button type="button" className="btn-close" onClick={() => setMostrarFormulario(false)}></button>
              </div>
              <div className="modal-body eventos-modal-body">
                <form onSubmit={salvarEvento}>
                  <div className="row g-2 mb-2">
                    <div className="col-md-12">
                      <label className="form-label">Nome do Evento</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="nome" 
                        value={novoEvento.nome}
                        onChange={handleEventoChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Tipo do Evento</label>
                      <select
                        className="form-select"
                        name="tipo"
                        value={novoEvento.tipo || ''}
                        onChange={handleEventoChange}
                      >
                        <option value="">Selecione...</option>
                        <option>Casamento</option>
                        <option>Aniversário</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        name="status"
                        value={novoEvento.status || 'planejado'}
                        onChange={handleEventoChange}
                      >
                        <option value="planejado">Planejado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="row g-2 mb-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Data</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        name="data" 
                        value={novoEvento.data}
                        onChange={handleEventoChange}
                        required
                      />
                    </div>
                    <div className="col-6 col-md-4">
                      <label className="form-label">Hora de Início</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        name="horaInicio" 
                        value={novoEvento.horaInicio}
                        onChange={handleEventoChange}
                        required
                      />
                    </div>
                    <div className="col-6 col-md-4">
                      <label className="form-label">Hora de Término</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        name="horaFim" 
                        value={novoEvento.horaFim}
                        onChange={handleEventoChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="row g-2 mb-2">
                    <div className="col-12 col-md-8">
                      <label className="form-label">Local</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="local" 
                        value={novoEvento.local}
                        onChange={handleEventoChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Capacidade</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="capacidade" 
                        value={novoEvento.capacidade}
                        onChange={handleEventoChange}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <label className="form-label">Descrição</label>
                    <textarea 
                      className="form-control" 
                      name="descricao" 
                      rows="3"
                      value={novoEvento.descricao}
                      onChange={handleEventoChange}
                    ></textarea>
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
      
      {/* Modal para adicionar participante */}
      {mostrarFormParticipante && eventoAtual && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Participante</h5>
                <button type="button" className="btn-close" onClick={() => setMostrarFormParticipante(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={adicionarParticipante}>
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="nome" 
                      value={novoParticipante.nome}
                      onChange={handleParticipanteChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      name="email" 
                      value={novoParticipante.email}
                      onChange={handleParticipanteChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Telefone</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="telefone" 
                      value={novoParticipante.telefone}
                      onChange={handleParticipanteChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      name="status"
                      value={novoParticipante.status}
                      onChange={handleParticipanteChange}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  
                  <div className="d-flex justify-content-end">
                    <button type="button" className="btn btn-secondary me-2" onClick={() => setMostrarFormParticipante(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Adicionar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {mostrarFormParticipante && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Eventos;
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SalesBarChart from '../components/charts/SalesBarChart';
import OccupancyLineChart from '../components/charts/OccupancyLineChart';
import RevenueDoughnutChart from '../components/charts/RevenueDoughnutChart';
import MiniLineChart from '../components/charts/MiniLineChart';
import MiniBarChart from '../components/charts/MiniBarChart';
import MiniDoughnutChart from '../components/charts/MiniDoughnutChart';
import { api, Resources } from '../services/api';

const Dashboard = ({ currentUser }) => {

  // Estado para dados reais
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [events, setEvents] = useState([]);

  // Helpers de data e moeda
  const toNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.,-]/g, '').replace('.', '').replace(',', '.');
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : 0;
    }
    return 0;
  };
  const formatBRL = (num) => {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(num || 0)); } catch { return `R$ ${(Number(num || 0)).toFixed(2)}`; }
  };
  const isToday = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  const isInCurrentMonth = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const inLast7Days = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    const ms7 = 7 * 24 * 60 * 60 * 1000;
    return now - d <= ms7;
  };

  // Métricas derivadas, recalculadas quando dados mudam
  const stats = useMemo(() => {
    // Receita e vendas a partir de pedidos (restaurante)
    const ordersToday = orders.filter(o => isToday(o.createdAt));
    const receitaHojeNum = ordersToday.reduce((acc, o) => acc + toNumber(o.total), 0);
    const vendasHojeNum = receitaHojeNum; // PDV/Restaurante hoje

    // Receita e despesas do mês a partir de transactions; se vazio, usa pedidos
    const transMonth = transactions.filter(t => isInCurrentMonth(t.createdAt));
    const receitaMesNum = transMonth.length
      ? transMonth.filter(t => toNumber(t.amount) > 0).reduce((acc, t) => acc + toNumber(t.amount), 0)
      : orders.filter(o => isInCurrentMonth(o.createdAt)).reduce((acc, o) => acc + toNumber(o.total), 0);
    const despesasMesNum = transMonth.filter(t => toNumber(t.amount) < 0).reduce((acc, t) => acc + Math.abs(toNumber(t.amount)), 0);

    // Ocupação e disponibilidade (PMS)
    const quartosOcupadosNum = rooms.filter(r => String(r.status).toLowerCase() === 'ocupado').length;
    const quartosDisponiveisNum = rooms.filter(r => String(r.status).toLowerCase() === 'disponível').length;
    const hospedesAtivosNum = rooms.reduce((acc, r) => acc + (Array.isArray(r.hospedes) ? r.hospedes.length : 0), 0);

    // Estoque crítico
    const produtosCriticosNum = inventory.filter(i => Number(i.quantidade || i.qty || 0) <= Number(i.critico || i.min || 0)).length;

    // Eventos criados na semana
    const eventosSemanaNum = events.filter(e => inLast7Days(e.createdAt || e.data)).length;

    return {
      receitaHoje: formatBRL(receitaHojeNum),
      vendasHoje: formatBRL(vendasHojeNum),
      hospedesAtivos: hospedesAtivosNum,
      produtosCriticos: produtosCriticosNum,
      quartosOcupados: quartosOcupadosNum,
      quartosDisponiveis: quartosDisponiveisNum,
      eventosSemana: eventosSemanaNum,
      receitaMes: formatBRL(receitaMesNum),
      despesasMes: formatBRL(despesasMesNum),
    };
  }, [orders, transactions, rooms, inventory, events]);

  const defaultModules = React.useMemo(() => ({
    pms: true,
    pdv: true,
    estoque: true,
    eventos: true,
    financeiro: true,
    restaurante: true,
  }), []);

  const [modulesEnabled, setModulesEnabled] = useState(defaultModules);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const serverModules = await api.getModules();
        if (isMounted && serverModules && typeof serverModules === 'object') {
          setModulesEnabled({ ...defaultModules, ...serverModules });
        }
      } catch {
        // Fallback: localStorage
        try {
          const saved = JSON.parse(localStorage.getItem('dashboard_modules_enabled') || '{}');
          if (isMounted) setModulesEnabled({ ...defaultModules, ...saved });
        } catch {}
      }
    })();
    return () => { isMounted = false; };
  }, [defaultModules]);

  // Carregar dados reais para os cards
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ord, trans, rms, inv, ev] = await Promise.all([
          api.list(Resources.Orders).catch(() => []),
          api.list(Resources.Transactions).catch(() => []),
          api.list(Resources.Rooms).catch(() => []),
          api.list(Resources.Inventory).catch(() => []),
          api.list(Resources.Events).catch(() => []),
        ]);
        if (!alive) return;
        setOrders(Array.isArray(ord) ? ord : []);
        setTransactions(Array.isArray(trans) ? trans : []);
        setRooms(Array.isArray(rms) ? rms : []);
        setInventory(Array.isArray(inv) ? inv : []);
        setEvents(Array.isArray(ev) ? ev : []);
      } catch {
        // Silencia, manterá valores 0
      }
    })();
    return () => { alive = false; };
  }, []);

  // SSE: atualiza em tempo real quando backend muda
  useEffect(() => {
    let es;
    try {
      const base = (localStorage.getItem('api_base') || process.env.REACT_APP_API_BASE || `http://${window.location.hostname}:3020/api`).replace(/\/$/, '');
      es = new EventSource(`${base}/stream`);
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data || '{}');
          const { resource, action, item, id } = payload || {};
          if (!resource) return;
          const apply = (listSetter, list) => {
            if (action === 'create' && item) listSetter([...(list || []), item]);
            else if (action === 'update' && item) listSetter((list || []).map(x => String(x.id) === String(item.id) ? item : x));
            else if (action === 'delete' && id) listSetter((list || []).filter(x => String(x.id) !== String(id)));
          };
          if (resource === Resources.Orders) apply(setOrders, orders);
          if (resource === Resources.Transactions) apply(setTransactions, transactions);
          if (resource === Resources.Rooms) apply(setRooms, rooms);
          if (resource === Resources.Inventory) apply(setInventory, inventory);
          if (resource === Resources.Events) apply(setEvents, events);
        } catch {}
      };
    } catch {}
    return () => { try { es && es.close(); } catch {} };
  }, [orders, transactions, rooms, inventory, events]);

  // Carrega cores e logo do cliente e aplica variáveis CSS
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cfg = await api.getConfig();
        if (isMounted && cfg?.logoDataUrl) setLogoPreview(cfg.logoDataUrl);
      } catch {
        // Fallback: localStorage
        try {
          const savedCfg = JSON.parse(localStorage.getItem('cliente_config') || '{}');
          if (isMounted && savedCfg?.logoDataUrl) setLogoPreview(savedCfg.logoDataUrl);
        } catch {}
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const toggleModule = (key) => {
    setModulesEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Persistir no backend; manter fallback local
      api.updateModules(next).catch(() => {
        try { localStorage.setItem('dashboard_modules_enabled', JSON.stringify(next)); } catch {}
      });
      return next;
    });
  };

  const modules = [
    { key: 'pms', title: 'PMS', bg: 'bg-primary text-white', desc: 'Gerenciar Quartos', route: '/pms', btnClass: 'btn btn-light' },
    { key: 'pdv', title: 'PDV', bg: 'bg-success text-white', desc: 'Sistema de Vendas', route: '/pdv', btnClass: 'btn btn-light' },
    { key: 'estoque', title: 'Estoque', bg: 'bg-warning text-dark', desc: 'Gerenciar Estoque', route: '/stocks', btnClass: 'btn btn-dark' },
    { key: 'eventos', title: 'Eventos', bg: 'bg-info text-white', desc: 'Gerenciar Eventos', route: '/eventos', btnClass: 'btn btn-light' },
    { key: 'financeiro', title: 'Financeiro', bg: 'bg-danger text-white', desc: 'Ver Financeiro', route: '/financeiro', btnClass: 'btn btn-light' },
    { key: 'restaurante', title: 'Restaurante', bg: 'bg-secondary text-white', desc: 'Gerenciar Restaurante', route: '/restaurante', btnClass: 'btn btn-light' },
  ];

  // Filtragem de módulos por papel
  const restrictFinanceiro = currentUser?.papel === 'gerente' || currentUser?.papel === 'relatorios';
  const isGarcom = currentUser?.papel === 'garcom';
  const visibleModules = modules
    .filter(m => modulesEnabled[m.key])
    .filter(m => !(restrictFinanceiro && m.key === 'financeiro'))
    .filter(m => !(isGarcom && m.key !== 'restaurante'));

  const handleSaveBranding = async () => {
    const cfg = { logoDataUrl: logoPreview };
    try {
      await api.updateConfig(cfg);
      alert('Logo salva com sucesso.');
    } catch {
      // Fallback local
      try {
        localStorage.setItem('cliente_config', JSON.stringify(cfg));
        alert('Logo salva localmente. Backend indisponível.');
      } catch {
        alert('Não foi possível salvar a logo.');
      }
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setLogoPreview(String(dataUrl));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="container-fluid">
      {/* Bloco de perfil removido conforme solicitação */}

      {/* Hero com chamada visual */}
      <div className="dashboard-hero mb-4 p-4 rounded">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <div className="text-center text-md-start">
              <h2 className="text-white mb-2">Bem-vindo ao TechBox - Sistema Hoteleiro</h2>
              <p className="text-white-50 mb-0">Acompanhe desempenho, ocupação e receita em tempo real.</p>
            </div>
          </div>
          {/* Botões removidos conforme solicitação */}
        </div>
      </div>

      <>
          {/* Métricas principais */}
          <div className="row mb-4 equal-row">
            <div className="col-md-3 mb-3">
              <div className="card dashboard-card" style={{ backgroundColor: 'var(--metric-receita-bg, var(--brand-tertiary))' }}>
                <div className="card-body">
                  <h6 className="mb-1">Receita Hoje</h6>
                  <h4 className="mb-0">{stats.receitaHoje}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card dashboard-card" style={{ backgroundColor: 'var(--metric-vendas-bg, var(--brand-tertiary))' }}>
                <div className="card-body">
                  <h6 className="mb-1">Vendas PDV</h6>
                  <h4 className="mb-0">{stats.vendasHoje}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card dashboard-card" style={{ backgroundColor: 'var(--metric-hospedes-bg, var(--brand-tertiary))' }}>
                <div className="card-body">
                  <h6 className="mb-1">Hóspedes Ativos</h6>
                  <h4 className="mb-0">{stats.hospedesAtivos}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card dashboard-card" style={{ backgroundColor: 'var(--metric-estoque-bg, var(--brand-tertiary))' }}>
                <div className="card-body">
                  <h6 className="mb-1">Estoque Crítico</h6>
                  <h4 className="mb-0">{stats.produtosCriticos}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos principais */}
          <div className="row mb-4 equal-row g-3 row-cols-1 row-cols-sm-2 row-cols-md-3">
            <div className="col mb-4">
              <div className="card chart-card">
                <div className="card-header">Vendas da Semana</div>
                <div className="card-body">
                  <SalesBarChart />
                </div>
              </div>
            </div>
            <div className="col mb-4">
              <div className="card chart-card">
                <div className="card-header">Taxa de Ocupação</div>
                <div className="card-body">
                  <OccupancyLineChart />
                </div>
              </div>
            </div>
            <div className="col mb-4">
              <div className="card chart-card">
                <div className="card-header">Receita por Canal</div>
                <div className="card-body">
                  <RevenueDoughnutChart />
                </div>
              </div>
            </div>
          </div>

          {/* Módulos do sistema (visibilidade controlada por toggles) */}
          <div className="row equal-row g-3 row-cols-1 row-cols-sm-2 row-cols-md-3">
            {visibleModules.map((m) => (
              <div key={m.key} className="col mb-4">
                <div className={`card dashboard-card`} style={{ backgroundColor: 'var(--modules-bg, var(--brand-tertiary))' }}>
                  <div className="card-body">
                    <h5 className="card-title">{m.title}</h5>
                    {m.key === 'pms' && (
                      <>
                        <p className="card-text">Quartos Ocupados: {stats.quartosOcupados}</p>
                        <p className="card-text">Quartos Disponíveis: {stats.quartosDisponiveis}</p>
                        <div className="mini-chart mt-2">
                          <MiniLineChart labels={["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]} values={[62,68,71,65,73,78,75]} />
                        </div>
                      </>
                    )}
                    {m.key === 'pdv' && (
                      <>
                        <p className="card-text">Vendas Hoje: {stats.vendasHoje}</p>
                        <div className="mini-chart mt-2">
                          <MiniBarChart labels={["Alim.","Beb.","Quarto","Eletr.","Hig."]} values={[18,22,30,12,16]} />
                        </div>
                      </>
                    )}
                    {m.key === 'estoque' && (
                      <>
                        <p className="card-text">Produtos Críticos: {stats.produtosCriticos}</p>
                        <div className="mini-chart mt-2">
                          <MiniBarChart labels={["Crít.","OK"]} values={[8,42]} />
                        </div>
                      </>
                    )}
                    {m.key === 'eventos' && (
                      <>
                        <p className="card-text">Eventos na Semana: {stats.eventosSemana}</p>
                        <div className="mini-chart mt-2">
                          <MiniBarChart labels={["Seg","Qua","Sex"]} values={[1,1,1]} />
                        </div>
                      </>
                    )}
                    {m.key === 'financeiro' && (
                      <>
                        <p className="card-text">Receita do Mês: {stats.receitaMes}</p>
                        <p className="card-text">Despesas do Mês: {stats.despesasMes}</p>
                        <div className="mini-chart mt-2">
                          <MiniLineChart labels={["01","07","14","21","28"]} values={[12,15,18,17,20]} />
                        </div>
                      </>
                    )}
                    {m.key === 'restaurante' && (
                      <>
                        <p className="card-text">Gestão de pedidos e cardápio do restaurante.</p>
                        <div className="mini-chart mt-2">
                          <MiniDoughnutChart labels={["Pratos","Bebidas","Sobrem."]} values={[55,30,15]} />
                        </div>
                      </>
                    )}
                    <Link to={m.route} className="btn btn-primary">{m.desc}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>

      
    </div>
  );
};

export default Dashboard;
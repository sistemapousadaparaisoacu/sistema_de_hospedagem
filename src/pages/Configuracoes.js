import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import QRCodeAcesso from './QRCodeAcesso';
import QRCodeGenerator from './QRCodeGenerator';

const Configuracoes = () => {
  const defaultModules = React.useMemo(() => ({
    pms: true,
    pdv: true,
    estoque: true,
    eventos: true,
    restaurante: true,
  }), []);

  const [modulesEnabled, setModulesEnabled] = useState(defaultModules);
  const [logoPreview, setLogoPreview] = useState('');
  const [calendarSummary, setCalendarSummary] = useState('Eventos');
  const [kitchenAvgMinutes, setKitchenAvgMinutes] = useState(25);
  const [msgNew, setMsgNew] = useState('');
  const [msgAccepted, setMsgAccepted] = useState('');
  const [msgPreparing, setMsgPreparing] = useState('');
  const [msgDelivered, setMsgDelivered] = useState('');
  const [msgNewQuarto, setMsgNewQuarto] = useState('');
  const [msgNewMesa, setMsgNewMesa] = useState('');
  const [msgAcceptedQuarto, setMsgAcceptedQuarto] = useState('');
  const [msgAcceptedMesa, setMsgAcceptedMesa] = useState('');
  const [msgPreparingQuarto, setMsgPreparingQuarto] = useState('');
  const [msgPreparingMesa, setMsgPreparingMesa] = useState('');
  const [msgDeliveredQuarto, setMsgDeliveredQuarto] = useState('');
  const [msgDeliveredMesa, setMsgDeliveredMesa] = useState('');
  const [apiBaseInput, setApiBaseInput] = useState('');
  const [apiStatus, setApiStatus] = useState('idle'); // idle | testing | online | offline | error
  const [apiMessage, setApiMessage] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingApiBase, setSavingApiBase] = useState(false);
  const [qrTab, setQrTab] = useState('acesso'); // acesso | gerador

  useEffect(() => {
    let isMounted = true;
    (async () => {
      // Carregar logo
      try {
        const cfg = await api.getConfig();
        if (isMounted && cfg?.logoDataUrl) setLogoPreview(cfg.logoDataUrl);
        if (isMounted && cfg?.calendarSummary) setCalendarSummary(cfg.calendarSummary);
        if (isMounted && typeof cfg?.kitchenAvgMinutes !== 'undefined') setKitchenAvgMinutes(Number(cfg.kitchenAvgMinutes) || 25);
        if (isMounted && typeof cfg?.msgNew !== 'undefined') setMsgNew(cfg.msgNew || '');
        if (isMounted && typeof cfg?.msgAccepted !== 'undefined') setMsgAccepted(cfg.msgAccepted || '');
        if (isMounted && typeof cfg?.msgPreparing !== 'undefined') setMsgPreparing(cfg.msgPreparing || '');
        if (isMounted && typeof cfg?.msgDelivered !== 'undefined') setMsgDelivered(cfg.msgDelivered || '');
        if (isMounted && typeof cfg?.msgNewQuarto !== 'undefined') setMsgNewQuarto(cfg.msgNewQuarto || '');
        if (isMounted && typeof cfg?.msgNewMesa !== 'undefined') setMsgNewMesa(cfg.msgNewMesa || '');
        if (isMounted && typeof cfg?.msgAcceptedQuarto !== 'undefined') setMsgAcceptedQuarto(cfg.msgAcceptedQuarto || '');
        if (isMounted && typeof cfg?.msgAcceptedMesa !== 'undefined') setMsgAcceptedMesa(cfg.msgAcceptedMesa || '');
        if (isMounted && typeof cfg?.msgPreparingQuarto !== 'undefined') setMsgPreparingQuarto(cfg.msgPreparingQuarto || '');
        if (isMounted && typeof cfg?.msgPreparingMesa !== 'undefined') setMsgPreparingMesa(cfg.msgPreparingMesa || '');
        if (isMounted && typeof cfg?.msgDeliveredQuarto !== 'undefined') setMsgDeliveredQuarto(cfg.msgDeliveredQuarto || '');
        if (isMounted && typeof cfg?.msgDeliveredMesa !== 'undefined') setMsgDeliveredMesa(cfg.msgDeliveredMesa || '');
      } catch {
        try {
          const savedCfg = JSON.parse(localStorage.getItem('cliente_config') || '{}');
          if (isMounted && savedCfg?.logoDataUrl) setLogoPreview(savedCfg.logoDataUrl);
          if (isMounted && savedCfg?.calendarSummary) setCalendarSummary(savedCfg.calendarSummary);
          if (isMounted && typeof savedCfg?.kitchenAvgMinutes !== 'undefined') setKitchenAvgMinutes(Number(savedCfg.kitchenAvgMinutes) || 25);
          if (isMounted && typeof savedCfg?.msgNew !== 'undefined') setMsgNew(savedCfg.msgNew || '');
          if (isMounted && typeof savedCfg?.msgAccepted !== 'undefined') setMsgAccepted(savedCfg.msgAccepted || '');
          if (isMounted && typeof savedCfg?.msgPreparing !== 'undefined') setMsgPreparing(savedCfg.msgPreparing || '');
          if (isMounted && typeof savedCfg?.msgDelivered !== 'undefined') setMsgDelivered(savedCfg.msgDelivered || '');
          if (isMounted && typeof savedCfg?.msgNewQuarto !== 'undefined') setMsgNewQuarto(savedCfg.msgNewQuarto || '');
          if (isMounted && typeof savedCfg?.msgNewMesa !== 'undefined') setMsgNewMesa(savedCfg.msgNewMesa || '');
          if (isMounted && typeof savedCfg?.msgAcceptedQuarto !== 'undefined') setMsgAcceptedQuarto(savedCfg.msgAcceptedQuarto || '');
          if (isMounted && typeof savedCfg?.msgAcceptedMesa !== 'undefined') setMsgAcceptedMesa(savedCfg.msgAcceptedMesa || '');
          if (isMounted && typeof savedCfg?.msgPreparingQuarto !== 'undefined') setMsgPreparingQuarto(savedCfg.msgPreparingQuarto || '');
          if (isMounted && typeof savedCfg?.msgPreparingMesa !== 'undefined') setMsgPreparingMesa(savedCfg.msgPreparingMesa || '');
          if (isMounted && typeof savedCfg?.msgDeliveredQuarto !== 'undefined') setMsgDeliveredQuarto(savedCfg.msgDeliveredQuarto || '');
          if (isMounted && typeof savedCfg?.msgDeliveredMesa !== 'undefined') setMsgDeliveredMesa(savedCfg.msgDeliveredMesa || '');
        } catch {}
      }
      // Carregar módulos
      try {
        const mods = await api.getModules();
        if (isMounted && mods && typeof mods === 'object') setModulesEnabled({ ...defaultModules, ...mods });
      } catch {
        try {
          const saved = JSON.parse(localStorage.getItem('dashboard_modules_enabled') || '{}');
          if (isMounted) setModulesEnabled({ ...defaultModules, ...saved });
        } catch {}
      }
    })();
    return () => { isMounted = false; };
  }, [defaultModules]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('api_base');
      const fromEnv = process.env.REACT_APP_API_BASE;
      const initial = saved || fromEnv || '';
      setApiBaseInput(String(initial));
    } catch {
      // ignore
    }
  }, []);

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

  const handleSaveBranding = async () => {
    const cfg = { logoDataUrl: logoPreview, calendarSummary, kitchenAvgMinutes, msgNew, msgAccepted, msgPreparing, msgDelivered, msgNewQuarto, msgNewMesa, msgAcceptedQuarto, msgAcceptedMesa, msgPreparingQuarto, msgPreparingMesa, msgDeliveredQuarto, msgDeliveredMesa };
    try {
      setSavingBranding(true);
      await api.updateConfig(cfg);
      try { localStorage.setItem('cliente_config', JSON.stringify(cfg)); } catch {}
      try { window.dispatchEvent(new CustomEvent('config_updated', { detail: cfg })); } catch {}
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Configurações salvas com sucesso.' } }));
    } catch {
      try {
        localStorage.setItem('cliente_config', JSON.stringify(cfg));
        try { window.dispatchEvent(new CustomEvent('config_updated', { detail: cfg })); } catch {}
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message: 'Configurações salvas localmente. Backend indisponível.' } }));
      } catch {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Não foi possível salvar as configurações.' } }));
      }
    } finally {
      setSavingBranding(false);
    }
  };

  const toggleModule = (key) => {
    setModulesEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      api.updateModules(next).catch(() => {
        try { localStorage.setItem('dashboard_modules_enabled', JSON.stringify(next)); } catch {}
      });
      return next;
    });
  };

  const sanitizeApiBase = (value) => {
    const v = String(value || '').trim();
    if (!v) return '';
    // garante http(s)
    const withProtocol = v.startsWith('http://') || v.startsWith('https://') ? v : `http://${v}`;
    // garante /api no final
    return withProtocol.endsWith('/api') ? withProtocol : `${withProtocol.replace(/\/$/, '')}/api`;
  };

  const testApiConnection = async () => {
    const base = sanitizeApiBase(apiBaseInput);
    if (!base) {
      setApiStatus('error');
      setApiMessage('Informe a URL base da API. Ex.: http://192.168.1.23:3020/api');
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Informe a URL base da API.' } }));
      return;
    }
    setApiStatus('testing');
    setApiMessage('Testando conexão...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        setApiStatus('online');
        setApiMessage('API online.');
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'API online.' } }));
      } else {
        setApiStatus('offline');
        setApiMessage(`API respondeu com status ${res.status}.`);
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: `API respondeu com status ${res.status}.` } }));
      }
    } catch (err) {
      clearTimeout(timeout);
      const hint = ' Dica: copie .env.example para .env e defina REACT_APP_API_BASE, ou salve a API Base nesta página.';
      if (err?.name === 'AbortError') {
        setApiStatus('offline');
        setApiMessage('Tempo de conexão excedido (timeout).' + hint);
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Tempo de conexão excedido (timeout).' } }));
      } else {
        setApiStatus('error');
        setApiMessage('Falha ao conectar. Verifique a URL e a rede.' + hint);
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Falha ao conectar. Verifique a URL e a rede.' } }));
      }
    }
  };

  const saveApiBase = () => {
    const base = sanitizeApiBase(apiBaseInput);
    if (!base) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Informe uma URL válida para a API.' } }));
      return;
    }
    try {
      setSavingApiBase(true);
      localStorage.setItem('api_base', base);
      setApiBaseInput(base);
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'API Base definida com sucesso.' } }));
      try { window.dispatchEvent(new CustomEvent('api_base_updated', { detail: base })); } catch {}
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Não foi possível salvar a API Base.' } }));
    } finally {
      setSavingApiBase(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="page-header mb-4"><h2 className="m-0">Configurações</h2></div>
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header"><strong>Identidade Visual</strong></div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Logo do Cliente</label>
                <input type="file" accept="image/*" className="form-control" onChange={handleLogoChange} />
                {logoPreview && (
                  <div className="mt-3">
                    <img src={logoPreview} alt="Logo Preview" style={{ maxHeight: 80, borderRadius: 8 }} />
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">Nome da agenda</label>
                <input
                  type="text"
                  className="form-control"
                  value={calendarSummary}
                  onChange={(e) => setCalendarSummary(e.target.value)}
                  placeholder="Ex.: Eventos"
                />
              <small className="text-muted">Usado para identificar sua agenda interna.</small>
              </div>
              <div className="mb-3">
                <label className="form-label">Tempo médio da cozinha (min)</label>
                <input
                  type="number"
                  className="form-control"
                  min="5"
                  max="120"
                  value={kitchenAvgMinutes}
                  onChange={(e) => setKitchenAvgMinutes(parseInt(e.target.value) || 25)}
                />
                <small className="text-muted">Usado para estimar e informar previsões nos avisos do WhatsApp.</small>
              </div>
              <div className="mb-3">
                <label className="form-label">Mensagens do WhatsApp</label>
                <small className="text-muted d-block mb-2">Use tokens: {`{local}`} {`{itens}`} {`{total}`} {`{horario}`} {`{previsao}`} {`{restante}`} {`{link}`} {`{numeroPedido}`} {`{responsavel}`}</small>
                <div className="mb-2">
                  <label className="form-label">Novo pedido</label>
                  <textarea className="form-control" rows="3" value={msgNew} onChange={(e) => setMsgNew(e.target.value)} placeholder={'Recebemos seu pedido!\n{local}\nItens: {itens}\nTotal: R$ {total}\nHorário: {horario}\nPrevisão: ~ {previsao} min\nAcompanhe: {link}'} />
                </div>
                <div className="mb-2">
                  <div className="small text-muted">Variações por local (opcionais):</div>
                  <label className="form-label">Novo pedido (Quarto)</label>
                  <textarea className="form-control" rows="2" value={msgNewQuarto} onChange={(e) => setMsgNewQuarto(e.target.value)} placeholder={'Recebemos seu pedido no quarto!\n{local}\nItens: {itens}\nTotal: R$ {total}\nPrevisão: ~ {previsao} min\nAcompanhe: {link}'} />
                  <label className="form-label mt-2">Novo pedido (Mesa)</label>
                  <textarea className="form-control" rows="2" value={msgNewMesa} onChange={(e) => setMsgNewMesa(e.target.value)} placeholder={'Recebemos seu pedido na mesa!\n{local}\nItens: {itens}\nTotal: R$ {total}\nPrevisão: ~ {previsao} min\nAcompanhe: {link}'} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Pedido aceito</label>
                  <textarea className="form-control" rows="2" value={msgAccepted} onChange={(e) => setMsgAccepted(e.target.value)} placeholder={'Pedido aceito ✅\nPrevisão: ~ {previsao} min\nAcompanhe: {link}'} />
                </div>
                <div className="mb-2">
                  <div className="small text-muted">Variações por local (opcionais):</div>
                  <label className="form-label">Pedido aceito (Quarto)</label>
                  <textarea className="form-control" rows="2" value={msgAcceptedQuarto} onChange={(e) => setMsgAcceptedQuarto(e.target.value)} placeholder={'Pedido aceito ✅\nResponsável: {responsavel}\nPrevisão: ~ {previsao} min\nAcompanhe: {link}'} />
                  <label className="form-label mt-2">Pedido aceito (Mesa)</label>
                  <textarea className="form-control" rows="2" value={msgAcceptedMesa} onChange={(e) => setMsgAcceptedMesa(e.target.value)} placeholder={'Pedido aceito ✅\nResponsável: {responsavel}\nPrevisão: ~ {previsao} min\nAcompanhe: {link}'} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Em preparo</label>
                  <textarea className="form-control" rows="2" value={msgPreparing} onChange={(e) => setMsgPreparing(e.target.value)} placeholder={'Pedido em preparo 🍳\nRestante: ~ {restante} min\nAcompanhe: {link}'} />
                </div>
                <div className="mb-2">
                  <div className="small text-muted">Variações por local (opcionais):</div>
                  <label className="form-label">Em preparo (Quarto)</label>
                  <textarea className="form-control" rows="2" value={msgPreparingQuarto} onChange={(e) => setMsgPreparingQuarto(e.target.value)} placeholder={'Pedido em preparo 🍳\nResponsável: {responsavel}\nRestante: ~ {restante} min\nAcompanhe: {link}'} />
                  <label className="form-label mt-2">Em preparo (Mesa)</label>
                  <textarea className="form-control" rows="2" value={msgPreparingMesa} onChange={(e) => setMsgPreparingMesa(e.target.value)} placeholder={'Pedido em preparo 🍳\nResponsável: {responsavel}\nRestante: ~ {restante} min\nAcompanhe: {link}'} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Entregue</label>
                  <textarea className="form-control" rows="2" value={msgDelivered} onChange={(e) => setMsgDelivered(e.target.value)} placeholder={'Pedido entregue ✅\nBom apetite!'} />
                </div>
                <div className="mb-2">
                  <div className="small text-muted">Variações por local (opcionais):</div>
                  <label className="form-label">Entregue (Quarto)</label>
                  <textarea className="form-control" rows="2" value={msgDeliveredQuarto} onChange={(e) => setMsgDeliveredQuarto(e.target.value)} placeholder={'Pedido entregue no quarto ✅\nResponsável: {responsavel}'} />
                  <label className="form-label mt-2">Entregue (Mesa)</label>
                  <textarea className="form-control" rows="2" value={msgDeliveredMesa} onChange={(e) => setMsgDeliveredMesa(e.target.value)} placeholder={'Pedido entregue na mesa ✅\nResponsável: {responsavel}'} />
                </div>
              </div>
              <p className="text-muted mb-2">O sistema utiliza um padrão de cores fixo. Apenas o logotipo pode ser ajustado aqui.</p>
              <div className="mt-3 d-flex justify-content-end">
                <button className="btn btn-primary" onClick={handleSaveBranding} disabled={savingBranding}>
                  {savingBranding ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header"><strong>Módulos do Painel</strong></div>
            <div className="card-body">
              {Object.keys(defaultModules).map((key) => (
                <div key={key} className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`toggle-${key}`}
                    checked={!!modulesEnabled[key]}
                    onChange={() => toggleModule(key)}
                  />
                  <label className="form-check-label ms-2" htmlFor={`toggle-${key}`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="card mt-4">
            <div className="card-header"><strong>Conexão da API</strong></div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">API Base</label>
                <input
                  type="text"
                  className="form-control"
                  value={apiBaseInput}
                  onChange={(e) => setApiBaseInput(e.target.value)}
                  placeholder="Ex.: http://192.168.1.23:3020/api"
                />
                <small className="text-muted">Defina a URL base usada pelo app para acessar o backend.</small>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary" onClick={testApiConnection} disabled={apiStatus === 'testing'}>
                  {apiStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
                </button>
                <button className="btn btn-primary" onClick={saveApiBase} disabled={savingApiBase}>
                  {savingApiBase ? 'Salvando...' : 'Salvar API Base'}
                </button>
              </div>
              <div className="mt-3">
                {apiStatus !== 'idle' && (
                  <span className={`badge ${apiStatus === 'online' ? 'bg-success' : apiStatus === 'testing' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                    {apiMessage || (apiStatus === 'online' ? 'API online' : apiStatus === 'testing' ? 'Testando...' : 'API offline')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="card mt-4">
            <div className="card-header d-flex align-items-center justify-content-between">
              <strong>QR Code</strong>
              <div className="btn-group btn-group-sm" role="group" aria-label="Seleção de aba QR">
                <button type="button" className={`btn ${qrTab === 'acesso' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setQrTab('acesso')}>Acesso</button>
                <button type="button" className={`btn ${qrTab === 'gerador' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setQrTab('gerador')}>Gerador de Pedido</button>
              </div>
            </div>
            <div className="card-body">
              {qrTab === 'acesso' ? (
                <div className="qr-settings-embed">
                  <QRCodeAcesso />
                </div>
              ) : (
                <div className="qr-settings-embed">
                  <QRCodeGenerator />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
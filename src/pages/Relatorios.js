import React, { useEffect, useMemo, useState } from 'react';
import { api, Resources } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SalesBarChart from '../components/charts/SalesBarChart';
import MiniBarChart from '../components/charts/MiniBarChart';
import MiniLineChart from '../components/charts/MiniLineChart';
import { Bar } from 'react-chartjs-2';
import { getDefaultOptions } from '../components/charts/chartConfig';

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sales, setSales] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [events, setEvents] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [finView, setFinView] = useState('stacked'); // 'stacked' | 'line'
  const [config, setConfig] = useState({});

  // Persistência da preferência de visualização financeira
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fromQS = url.searchParams.get('finView');
      if (fromQS === 'stacked' || fromQS === 'line') {
        setFinView(fromQS);
        return;
      }
      const saved = localStorage.getItem('reports_fin_view');
      if (saved === 'stacked' || saved === 'line') setFinView(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      // Persistir localmente
      localStorage.setItem('reports_fin_view', finView);
      // Sincronizar com query string
      const url = new URL(window.location.href);
      url.searchParams.set('finView', finView);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, [finView]);

  // Persistência dos filtros de período via query string
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const qsStart = url.searchParams.get('dateStart') || '';
      const qsEnd = url.searchParams.get('dateEnd') || '';
      if (qsStart) setDateStart(qsStart);
      if (qsEnd) setDateEnd(qsEnd);
      // Fallback: se não houver parâmetros na URL, tentar recuperar do localStorage
      if (!qsStart && !qsEnd) {
        try {
          const saved = JSON.parse(localStorage.getItem('reports_period') || '{}');
          if (saved?.dateStart) setDateStart(saved.dateStart);
          if (saved?.dateEnd) setDateEnd(saved.dateEnd);
        } catch {}
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (dateStart) url.searchParams.set('dateStart', dateStart); else url.searchParams.delete('dateStart');
      if (dateEnd) url.searchParams.set('dateEnd', dateEnd); else url.searchParams.delete('dateEnd');
      window.history.replaceState({}, '', url.toString());
      // Persistir no localStorage como fallback
      try {
        localStorage.setItem('reports_period', JSON.stringify({ dateStart, dateEnd }));
      } catch {}
    } catch {}
  }, [dateStart, dateEnd]);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, t, e, cfg] = await Promise.all([
          api.list(Resources.Sales),
          api.list(Resources.Transactions),
          api.list(Resources.Events),
          api.getConfig(),
        ]);
        if (!mounted) return;
        setSales(Array.isArray(s) ? s : []);
        setTransactions(Array.isArray(t) ? t : []);
        setEvents(Array.isArray(e) ? e : []);
        setConfig(cfg || {});
      } catch (err) {
        if (!mounted) return;
        setError('Falha ao carregar dados do backend.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    // expõe função para o botão "Tentar novamente"
    Relatorios.fetchAll = fetchAll;
    return () => { mounted = false; };
  }, []);

  const inRange = (dateStr) => {
    if (!dateStr) return true;
    const d = dateStr;
    const okStart = dateStart ? d >= dateStart : true;
    const okEnd = dateEnd ? d <= dateEnd : true;
    return okStart && okEnd;
  };

  const salesFiltered = useMemo(() => sales.filter(s => inRange(s.data || s.date || '')), [sales, dateStart, dateEnd]);
  const txFiltered = useMemo(() => transactions.filter(tx => inRange(tx.data || tx.date || '')), [transactions, dateStart, dateEnd]);
  const evFiltered = useMemo(() => events.filter(ev => inRange(ev.data || ev.date || '')), [events, dateStart, dateEnd]);

  const salesTotal = useMemo(() => salesFiltered.reduce((sum, s) => sum + (Number(s.total) || 0), 0), [salesFiltered]);
  const txIn = useMemo(() => txFiltered.filter(tx => (tx.tipo || tx.type) === 'entrada').reduce((sum, tx) => sum + (Number(tx.valor) || Number(tx.amount) || 0), 0), [txFiltered]);
  const txOut = useMemo(() => txFiltered.filter(tx => (tx.tipo || tx.type) === 'saida').reduce((sum, tx) => sum + (Number(tx.valor) || Number(tx.amount) || 0), 0), [txFiltered]);
  const upcomingEv = useMemo(() => evFiltered.filter(ev => (ev.status || 'planejado') !== 'cancelado').length, [evFiltered]);

  // --- Séries para gráficos por dia ---
  const sumByDate = (items, getDate, getValue) => {
    const acc = {};
    items.forEach(it => {
      const d = getDate(it);
      if (!d) return;
      acc[d] = (acc[d] || 0) + (getValue(it) || 0);
    });
    const labels = Object.keys(acc).sort();
    const values = labels.map(l => acc[l]);
    return { labels, values };
  };
  const salesSeries = useMemo(() => sumByDate(salesFiltered, s => s.data || s.date || '', s => Number(s.total) || 0), [salesFiltered]);
  const txEntries = useMemo(() => sumByDate(txFiltered.filter(tx => (tx.tipo || tx.type) === 'entrada'), tx => tx.data || tx.date || '', tx => Number(tx.valor) || Number(tx.amount) || 0), [txFiltered]);
  const txExits = useMemo(() => sumByDate(txFiltered.filter(tx => (tx.tipo || tx.type) === 'saida'), tx => tx.data || tx.date || '', tx => Number(tx.valor) || Number(tx.amount) || 0), [txFiltered]);
  const txLabels = useMemo(() => Array.from(new Set([...(txEntries.labels || []), ...(txExits.labels || [])])).sort(), [txEntries, txExits]);
  const txEntriesVals = useMemo(() => txLabels.map(l => (txEntries.labels.indexOf(l) !== -1 ? txEntries.values[txEntries.labels.indexOf(l)] : 0)), [txLabels, txEntries]);
  const txExitsVals = useMemo(() => txLabels.map(l => (txExits.labels.indexOf(l) !== -1 ? txExits.values[txExits.labels.indexOf(l)] : 0)), [txLabels, txExits]);
  const netSeries = useMemo(() => sumByDate(txFiltered, tx => tx.data || tx.date || '', tx => ((tx.tipo || tx.type) === 'entrada' ? 1 : -1) * ((Number(tx.valor) || Number(tx.amount) || 0))), [txFiltered]);
  const styles = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : { getPropertyValue: () => '' };
  const green = (styles.getPropertyValue('--bs-success') || '#2e7d32').trim();
  const red = (styles.getPropertyValue('--bs-danger') || '#c62828').trim();
  const primary = (styles.getPropertyValue('--bs-primary') || '#0d6efd').trim();
  const txChartData = {
    labels: txLabels,
    datasets: [
      { label: 'Entradas', data: txEntriesVals, backgroundColor: green, borderColor: green, borderWidth: 1, borderRadius: 6, stack: 'flow' },
      { label: 'Saídas', data: txExitsVals, backgroundColor: red, borderColor: red, borderWidth: 1, borderRadius: 6, stack: 'flow' },
    ],
  };
  const txChartOptions = (() => {
    const base = getDefaultOptions();
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins?.tooltip,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: R$ ${(Number(ctx.parsed.y) || 0).toFixed(2)}`,
            footer: (items) => {
              const total = items.reduce((sum, it) => sum + (Number(it.parsed.y) || 0), 0);
              return `Total: R$ ${total.toFixed(2)}`;
            },
          },
        },
        // Mantém legenda padrão do Chart.js no modo empilhado
      },
      scales: {
        x: { ...(base.scales?.x || {}), stacked: true },
        y: { ...(base.scales?.y || {}), stacked: true },
      },
    };
  })();
  const evSeries = useMemo(() => {
    const base = evFiltered.filter(ev => (ev.status || 'planejado') !== 'cancelado');
    const acc = {};
    base.forEach(ev => { const d = ev.data || ev.date || ''; if (!d) return; acc[d] = (acc[d] || 0) + 1; });
    const labels = Object.keys(acc).sort();
    const values = labels.map(l => acc[l]);
    return { labels, values };
  }, [evFiltered]);

  const exportCsv = () => {
    const lines = [];
    lines.push('Relatorio;PeriodoInicio;PeriodoFim');
    lines.push(`Resumo;${dateStart || ''};${dateEnd || ''}`);
    lines.push('---');
    lines.push('Vendas');
    lines.push('id;data;cliente;total');
    salesFiltered.forEach(s => lines.push(`${s.id};${s.data || s.date || ''};${s.cliente || s.customer || ''};${s.total || 0}`));
    lines.push('---');
    lines.push('Transacoes');
    lines.push('id;data;tipo;descricao;valor');
    txFiltered.forEach(tx => lines.push(`${tx.id};${tx.data || tx.date || ''};${tx.tipo || tx.type || ''};${tx.descricao || tx.description || ''};${tx.valor || tx.amount || 0}`));
    lines.push('---');
    lines.push('Eventos');
    lines.push('id;data;nome;local;status;capacidade');
    evFiltered.forEach(ev => lines.push(`${ev.id};${ev.data || ev.date || ''};${ev.nome || ev.name || ''};${ev.local || ev.location || ''};${ev.status || ''};${ev.capacidade || ev.capacity || 0}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    try {
      const styles = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : { getPropertyValue: () => '' };
      const primary = (styles.getPropertyValue('--brand-primary') || styles.getPropertyValue('--bs-primary') || '#5e4531').trim();
      const text = (styles.getPropertyValue('--bs-body-color') || '#212529').trim();
      const muted = (styles.getPropertyValue('--bs-secondary') || '#6c757d').trim();
      const success = (styles.getPropertyValue('--bs-success') || '#198754').trim();
      const danger = (styles.getPropertyValue('--bs-danger') || '#dc3545').trim();

      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      doc.setProperties({ title: 'Relatórios', subject: 'Resumo e detalhes', creator: 'TechBox' });

      // Header limpo em fundo branco: logo, nome e CNPJ
      const pageW = doc.internal.pageSize.getWidth();
      const headerH = 110;

      // Obter nome e CNPJ do cliente (fallback para localStorage quando necessário)
      let clienteNome = '';
      let clienteCnpj = '';
      try {
        clienteNome = String(config?.nome || '').trim();
        clienteCnpj = String(config?.cnpj || '').trim();
        if (!clienteNome || !clienteCnpj) {
          const perfilStr = localStorage.getItem('cliente_perfil');
          const cfgStr = localStorage.getItem('cliente_config');
          const perfil = perfilStr ? JSON.parse(perfilStr) : {};
          const cfg = cfgStr ? JSON.parse(cfgStr) : {};
          clienteNome = clienteNome || String(perfil?.nome || cfg?.nome || '').trim();
          clienteCnpj = clienteCnpj || String(perfil?.cnpj || cfg?.cnpj || '').trim();
        }
      } catch {}

      // Logo com anel branco para harmonizar com avatar do menu (opcional)
      let cursorY = headerH + 20;
      try {
        const cfgLocal = (() => { try { return JSON.parse(localStorage.getItem('cliente_config') || '{}'); } catch { return {}; } })();
        const dataUrl = config?.logoDataUrl || cfgLocal?.logoDataUrl;
        if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
          const type = dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
          const centerX = pageW / 2;
          const centerY = 36; // topo
          const avatarSize = 48;
          const ringRadius = 28;
          doc.setDrawColor('#ffffff');
          doc.setLineWidth(3);
          doc.circle(centerX, centerY, ringRadius, 'S');
          doc.addImage(dataUrl, type, centerX - avatarSize / 2, centerY - avatarSize / 2, avatarSize, avatarSize);
        }
      } catch {}

      // Nome e CNPJ centralizados no topo em texto escuro (fundo branco)
      doc.setTextColor(text);
      doc.setFontSize(15);
      doc.text(clienteNome || 'Seu Cliente', pageW / 2, 72, { align: 'center' });
      doc.setFontSize(11);
      doc.setTextColor(muted);
      if (clienteCnpj) {
        doc.text(`CNPJ: ${clienteCnpj}`, pageW / 2, 90, { align: 'center' });
      }

      // Período e agenda abaixo do header (centralizados com a marca)
      doc.setFontSize(11);
      const period = `Período: ${(dateStart || 'início não definido')} — ${(dateEnd || 'fim não definido')}`;
      doc.setTextColor(muted);
      const agenda = (config?.calendarSummary ? `Agenda: ${String(config.calendarSummary)}` : '');
      const periodAgenda = [period, agenda].filter(Boolean).join('  •  ');
      doc.text(periodAgenda, pageW / 2, headerH + 10, { align: 'center' });

      // Resumo do período (células mescladas)
      autoTable(doc, {
        startY: cursorY + 90,
        head: [[{ content: 'Resumo do Período', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', fillColor: primary, textColor: '#ffffff' } }]],
        body: [
          ['Período', `${dateStart || '—'} — ${dateEnd || '—'}`],
          ['Total de Vendas', `R$ ${salesTotal.toFixed(2)}`],
          ['Entradas', `R$ ${txIn.toFixed(2)}`],
          ['Saídas', `R$ ${txOut.toFixed(2)}`],
          ['Saldo', `R$ ${(txIn - txOut).toFixed(2)}`],
          ['Eventos (próximos)', String(upcomingEv)],
          ['Eventos (total)', String(evFiltered.length)],
        ],
        styles: { fontSize: 11, textColor: text },
        theme: 'striped',
        headStyles: { fillColor: primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: '#f8f9fa' },
        columnStyles: { 1: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const label = String(data.row.raw[0] || '');
            if (label === 'Entradas' || label === 'Saldo') data.cell.styles.textColor = success;
            if (label === 'Saídas') data.cell.styles.textColor = danger;
          }
        },
      });

      // Tabela de Vendas
      autoTable(doc, {
        startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : cursorY + 90,
        head: [[{ content: 'Vendas', colSpan: 4, styles: { halign: 'left', fontStyle: 'bold', fillColor: primary, textColor: '#ffffff' } }]],
        body: [
          ['ID', 'Data', 'Cliente', 'Total'],
          ...salesFiltered.map(s => [String(s.id || ''), String(s.data || s.date || ''), String(s.cliente || s.customer || ''), `R$ ${(Number(s.total) || 0).toFixed(2)}`])
        ],
        styles: { fontSize: 10, textColor: text },
        theme: 'striped',
        headStyles: { fillColor: primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: '#f8f9fa' },
        columnStyles: { 3: { halign: 'right' } },
      });

      // Tabela Financeiro (Transações)
      const y2 = doc.lastAutoTable.finalY + 20;
      autoTable(doc, {
        startY: y2,
        head: [[{ content: 'Financeiro', colSpan: 5, styles: { halign: 'left', fontStyle: 'bold', fillColor: primary, textColor: '#ffffff' } }]],
        body: [
          ['ID', 'Data', 'Tipo', 'Descrição', 'Valor'],
          ...txFiltered.map(tx => [String(tx.id || ''), String(tx.data || tx.date || ''), String(tx.tipo || tx.type || ''), String(tx.descricao || tx.description || ''), `R$ ${(Number(tx.valor) || Number(tx.amount) || 0).toFixed(2)}`])
        ],
        styles: { fontSize: 10, textColor: text },
        theme: 'striped',
        headStyles: { fillColor: primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: '#f8f9fa' },
        columnStyles: { 4: { halign: 'right' } },
      });

      // Tabela de Eventos
      const y3 = doc.lastAutoTable.finalY + 20;
      autoTable(doc, {
        startY: y3,
        head: [[{ content: 'Eventos', colSpan: 6, styles: { halign: 'left', fontStyle: 'bold', fillColor: primary, textColor: '#ffffff' } }]],
        body: [
          ['ID', 'Data', 'Nome', 'Local', 'Status', 'Capacidade'],
          ...evFiltered.map(ev => [String(ev.id || ''), String(ev.data || ev.date || ''), String(ev.nome || ev.name || ''), String(ev.local || ev.location || ''), String(ev.status || ''), String(ev.capacidade || ev.capacity || 0)])
        ],
        styles: { fontSize: 10, textColor: text },
        theme: 'striped',
        headStyles: { fillColor: primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: '#f8f9fa' },
        columnStyles: { 5: { halign: 'right' } },
      });

      // Rodapé com data de emissão
      const nowStr = new Date().toLocaleString('pt-BR');
      doc.setFontSize(9);
      doc.setTextColor(muted);
      doc.text(`Emitido em ${nowStr}`, 40, doc.internal.pageSize.getHeight() - 30);

      doc.save(`relatorio_${Date.now()}.pdf`);
    } catch (e) {
      alert('Falha ao gerar PDF do relatório.');
    }
  };

  const copyReportLink = async () => {
    try {
      const url = new URL(window.location.href);
      // garantir que os parâmetros atuais estejam presentes
      if (finView) url.searchParams.set('finView', finView);
      if (dateStart) url.searchParams.set('dateStart', dateStart); else url.searchParams.delete('dateStart');
      if (dateEnd) url.searchParams.set('dateEnd', dateEnd); else url.searchParams.delete('dateEnd');
      const link = url.toString();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      alert('Link do relatório copiado para a área de transferência.');
    } catch {
      alert('Não foi possível copiar o link do relatório.');
    }
  };

  const resetReportLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('finView');
      url.searchParams.delete('dateStart');
      url.searchParams.delete('dateEnd');
      window.history.replaceState({}, '', url.toString());
      alert('Parâmetros removidos da URL.');
    } catch {
      alert('Não foi possível limpar os parâmetros da URL.');
    }
  };

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Relatórios</h2>
        <div>
          <button className="btn btn-primary d-inline-flex align-items-center" onClick={exportPdf} disabled={loading}>
            Exportar PDF
          </button>
        </div>
      </div>
      <div className="card mb-3">
        <div className="card-body d-flex gap-2 align-items-end flex-wrap">
          <div>
            <label className="form-label mb-1">Data início</label>
            <input type="date" className="form-control" value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
          <div>
            <label className="form-label mb-1">Data fim</label>
            <input type="date" className="form-control" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={() => { setDateStart(''); setDateEnd(''); }}>Limpar</button>
        </div>
      </div>
      {error && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-warning" onClick={() => Relatorios.fetchAll?.()}>Tentar novamente</button>
        </div>
      )}
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Vendas</h5>
              <p className="card-text text-muted">Total no período</p>
              <div className="display-6">R$ {salesTotal.toFixed(2)}</div>
              <small className="text-muted">{salesFiltered.length} vendas</small>
              <div className="mt-3">
                <SalesBarChart title="Vendas por dia" labels={salesSeries.labels} values={salesSeries.values} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="card-title mb-0">Financeiro</h5>
                <div className="btn-group btn-group-sm" role="group" aria-label="Alternar gráfico financeiro">
                  <button className={`btn ${finView === 'stacked' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFinView('stacked')}>Empilhado</button>
                  <button className={`btn ${finView === 'line' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFinView('line')}>Fluxo</button>
                </div>
                {finView === 'line' && (
                  <div className="d-flex align-items-center gap-3">
                    <span className="d-inline-flex align-items-center gap-1">
                      <span style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: primary, display: 'inline-block' }}></span>
                      <small className="text-muted">Fluxo líquido</small>
                    </span>
                  </div>
                )}
              </div>
              <p className="card-text text-muted">Entradas e saídas</p>
              <div className="d-flex gap-3">
                <div>
                  <div className="h5 text-success">+ R$ {txIn.toFixed(2)}</div>
                  <small className="text-muted">Entradas</small>
                </div>
                <div>
                  <div className="h5 text-danger">- R$ {txOut.toFixed(2)}</div>
                  <small className="text-muted">Saídas</small>
                </div>
              </div>
              <small className="text-muted">{txFiltered.length} lançamentos</small>
              <div className="mt-3" style={{ height: 'min(24vh, 200px)' }}>
                {finView === 'stacked' ? (
                  <Bar data={txChartData} options={txChartOptions} />
                ) : (
                  <MiniLineChart labels={netSeries.labels} values={netSeries.values} color={primary} />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Eventos</h5>
              <p className="card-text text-muted">Próximos eventos no período</p>
              <div className="display-6">{upcomingEv}</div>
              <small className="text-muted">{evFiltered.length} eventos</small>
              <div className="mt-3">
                <MiniBarChart labels={evSeries.labels} values={evSeries.values} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
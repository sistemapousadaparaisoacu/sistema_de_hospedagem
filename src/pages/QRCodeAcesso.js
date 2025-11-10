import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';

const QRCodeAcesso = () => {
  const [ip, setIp] = useState('');
  const [url, setUrl] = useState('');
  const [customIp, setCustomIp] = useState('');
  const port = 3070;

  useEffect(() => {
    const fetchHost = async () => {
      try {
        const res = await fetch('http://localhost:3020/api/host');
        const data = await res.json();
        if (data?.ip) {
          setIp(data.ip);
          const u = `http://${data.ip}:${port}/login`;
          setUrl(u);
        }
      } catch (e) {
        // mantém vazio, usuário pode informar IP manualmente
      }
    };
    fetchHost();
  }, []);

  const handleManual = () => {
    const cleaned = (customIp || '').trim();
    if (!cleaned) return;
    const u = `http://${cleaned}:${port}/login`;
    setUrl(u);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copiada para a área de transferência');
    } catch {}
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Acesso pelo celular</h2>
      <p className="text-muted mb-2">Escaneie o QR Code com seu celular para abrir o sistema.</p>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="mb-2">
                <label className="form-label mb-1">IP do PC detectado</label>
                <input className="form-control" value={ip} readOnly placeholder="(não detectado)" />
              </div>
              <div className="mb-2">
                <label className="form-label mb-1">Informar IP manualmente</label>
                <div className="input-group">
                  <input className="form-control" placeholder="ex.: 192.168.1.20" value={customIp} onChange={e => setCustomIp(e.target.value)} />
                  <button className="btn btn-outline-primary" type="button" onClick={handleManual}>Gerar URL</button>
                </div>
              </div>
              {url && (
                <div className="mt-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <code>{url}</code>
                    <button className="btn btn-sm btn-outline-secondary ms-2" type="button" onClick={copyUrl}>Copiar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body text-center">
              {url ? (
                <>
                  <QRCode value={url} size={180} level="M" includeMargin={true} />
                  <p className="mt-2 text-muted">Aponte a câmera do celular para abrir</p>
                </>
              ) : (
                <p className="text-muted">Informe seu IP ou aguarde a detecção para gerar o QR.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeAcesso;
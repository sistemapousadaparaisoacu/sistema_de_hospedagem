import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import QRCode from 'qrcode.react';

const QRCodeGenerator = () => {
  const location = useLocation();
  const { carrinho, quartoSelecionado, observacoes, total, quartoNome } = location.state || {};

  // Verificar se há dados para gerar o QR Code
  if (!carrinho || carrinho.length === 0 || !quartoSelecionado) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          <h4>Nenhum pedido para gerar QR Code</h4>
          <p>Volte ao restaurante e faça um pedido primeiro.</p>
          <Link to="/restaurante" className="btn btn-primary">Voltar ao Restaurante</Link>
        </div>
      </div>
    );
  }

  // Criar dados para o QR Code
  const qrData = JSON.stringify({
    pedido: carrinho.map(item => ({
      nome: item.nome,
      quantidade: item.quantidade,
      preco: item.preco
    })),
    quarto: {
      id: quartoSelecionado,
      nome: quartoNome
    },
    observacoes,
    total,
    data: new Date().toLocaleString()
  });

  // Função para baixar o QR Code como imagem
  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code');
    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');
    
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `pedido-quarto-${quartoSelecionado}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="container">
      <h2 className="mb-4">QR Code do Pedido</h2>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Detalhes do Pedido</h5>
            </div>
            <div className="card-body">
              <h6>Quarto/Mesa: {quartoNome} - {quartoSelecionado}</h6>
              <h6>Data: {new Date().toLocaleString()}</h6>
              
              <hr />
              
              <h6>Itens:</h6>
              <ul className="list-group mb-3">
                {carrinho.map((item, index) => (
                  <li key={index} className="list-group-item d-flex justify-content-between">
                    <div>
                      <span className="fw-bold">{item.quantidade}x</span> {item.nome}
                    </div>
                    <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              
              {observacoes && (
                <div className="mb-3">
                  <h6>Observações:</h6>
                  <p className="border p-2 rounded">{observacoes}</p>
                </div>
              )}
              
              <div className="d-flex justify-content-between">
                <h5>Total:</h5>
                <h5>R$ {total.toFixed(2)}</h5>
              </div>
            </div>
          </div>
          
          <div className="mt-3">
            <Link to="/restaurante" className="btn btn-secondary me-2">Voltar ao Restaurante</Link>
            <button onClick={downloadQRCode} className="btn btn-primary">
              Baixar QR Code
            </button>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>QR Code</h5>
            </div>
            <div className="card-body qr-code-container">
              <QRCode 
                id="qr-code"
                value={qrData}
                size={180}
                level="H"
                includeMargin={true}
              />
              <p className="mt-3">Escaneie este QR Code para visualizar os detalhes do pedido</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
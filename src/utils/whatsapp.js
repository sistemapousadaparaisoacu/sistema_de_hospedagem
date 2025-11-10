// Utilitários de WhatsApp padronizados
import { api, Resources } from '../services/api';

export const limparNumero = (n) => String(n || '').replace(/\D+/g, '');

export const gerarLinkWhatsApp = (numero, texto = '') => {
  const limpo = limparNumero(numero);
  // Fallback: quando não há número, abre tela genérica de envio com o texto
  if (!limpo) return `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  return `https://wa.me/${limpo}?text=${encodeURIComponent(texto)}`;
};

// Obtém o WhatsApp principal para um quarto pelo ID no PMS
export const obterWhatsAppPrincipalDoQuartoId = async (id) => {
  try {
    const room = await api.get(Resources.Rooms, String(id));
    if (!room) return '';
    if (room.whatsappPrincipal) return String(room.whatsappPrincipal);
    const hospedes = Array.isArray(room.hospedes) ? room.hospedes : [];
    const principalIdx = Number(room.whatsappPrincipalIndex) || 0;
    const principal = hospedes[principalIdx]?.whatsapp || hospedes[0]?.whatsapp || '';
    return principal || '';
  } catch { return ''; }
};

// Monta recibo padrão do PDV
export const montarReciboMsg = (itens, total, metodoLabel, quartoLabel, linkTracking) => {
  const linhas = (itens || []).map(i => `${i.quantidade}x ${i.nome} — R$ ${(Number(i.preco) * Number(i.quantidade)).toFixed(2)}`);
  const agora = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return [
    'Recibo de compra (PDV)',
    quartoLabel ? `Quarto: ${quartoLabel}` : null,
    `Itens:\n${linhas.join('\n')}`,
    `Total: R$ ${Number(total).toFixed(2)}`,
    `Pagamento: ${metodoLabel}`,
    `Horário: ${agora}`,
    linkTracking ? `Acompanhe: ${linkTracking}` : null,
    'Obrigado pela preferência!'
  ].filter(Boolean).join('\n');
};
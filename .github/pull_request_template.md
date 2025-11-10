## Destaques

- Adiciona campo de WhatsApp opcional e override nos fluxos de Restaurante e Cozinha.
- Padroniza utilitários de WhatsApp com fallback sem número (abre WhatsApp com texto).
- PDV já estava integrado com input opcional; comportamento validado.
- PMS: ativa fallback e padroniza botões “Conversar” (contato principal e por hóspede) para sempre abrir o WhatsApp com texto predefinido, mesmo sem número salvo.

## Mudanças

- `src/pages/Restaurante.js`
  - Campo “WhatsApp (opcional)” no modal de detalhes do pedido.
  - Pré-preenche com número do PMS quando disponível.
  - Prioridade de envio: número digitado → PMS → fallback sem número (texto).
  - Usa `limparNumero` e `gerarLinkWhatsApp`.
- `src/pages/Cozinha.js`
  - Campo “WhatsApp (opcional)” acima dos botões nas seções (pendentes, aceitos, preparando, entregues).
  - Estado local para número digitado e prioridade de envio conforme acima.
  - Limpeza do input para apenas dígitos.
- `src/utils/whatsapp.js`
  - Helpers padronizados: `limparNumero`, `gerarLinkWhatsApp`, `obterWhatsAppPrincipalDoQuartoId`.
  - Fallback consistente para abrir WhatsApp com texto quando não há número.
- `src/pages/PDV.js`
  - Input “WhatsApp do Cliente (opcional)” já existente; validado.
- `src/pages/PMS.js`
  - Importa utilitários padronizados e remove função local de geração de link.
  - Adiciona texto predefinido e fallback sem número para botões “Conversar” do contato principal e dos hóspedes.

## Validação

- Previews locais:
  - `http://localhost:3056/restaurante`
  - `http://localhost:3010/cozinha`
  - `http://localhost:3070/pdv`
  - `http://localhost:3056/pms`
- Testes manuais:
  - Com PMS: verificar pré-preenchimento e envio.
  - Sem PMS: verificar fallback com texto.
  - Override: digitar número e confirmar uso do número digitado.
  - Sanitização: números com parênteses/traços/espaços são limpos.

## Impacto

- Operacional: garante comunicação mesmo sem número no PMS; agiliza contato.
- Técnico: utilitários unificados, lógica de envio previsível.

## Riscos

- UX: campo opcional pode ser ignorado; mitigado com rótulo claro.
- PMS: mudanças de estrutura exigem atualização de `obterWhatsAppPrincipal`.

## Notas

- Branch: `feat/access-qr-docs`
- Tag: `v0.1.0`
- Docs: `CHANGELOG.md` e `README.md` atualizados.
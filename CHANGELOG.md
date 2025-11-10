# Changelog

## Unreleased

- PMS: habilita fallback de WhatsApp e padroniza os botões "Conversar" para sempre abrirem o app com texto predefinido, mesmo sem número salvo; importa `limparNumero`/`gerarLinkWhatsApp` de `src/utils/whatsapp.js`.

## v0.1.2

- Proxy PHP: adiciona endpoint local de health-check em `/server/api/health` e trata preflight CORS (`OPTIONS`) com `Access-Control-Allow-*` adequado.
- SPA: ajusta `.htaccess` para não cachear `index.html` e aplicar cache longo e `immutable` em assets versionados (`js`, `css`, imagens e fontes).
- Repositório: ignora `build_extract/` e `build.zip` no `.gitignore` e remove `build.zip` do histórico.

## v0.1.0

- Restaurante: adiciona campo de WhatsApp no modal de detalhes; pré-preenche via PMS; envio prioriza número digitado; fallback abre WhatsApp com texto quando não há número; utiliza `limparNumero`/`gerarLinkWhatsApp`.
- Cozinha: adiciona campo de WhatsApp acima dos botões; estado local para número digitado; prioriza override; fallback quando PMS ausente; utiliza utilitários padronizados.
- PDV: já integrado com input opcional; validado em preview.
- Utilitários de WhatsApp: padronizados em `src/utils/whatsapp.js` para limpeza, geração de link e fallback consistente.

Pré-visualizações usadas para validação:
- `/restaurante` (porta 3056)
- `/cozinha` (porta 3010)
- `/pdv` (porta 3070)

Branch: `feat/access-qr-docs`
Tag: `v0.1.0`
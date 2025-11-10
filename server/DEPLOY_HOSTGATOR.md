# Deploy no HostGator (Node.js App + MySQL)

Este guia ajuda a publicar a API deste projeto no HostGator usando o recurso **Setup Node.js App** e conectar ao MySQL.

## 1) Preparar Banco MySQL

1. Acesse `cPanel → MySQL Databases`.
2. Crie o banco: ex. `hotelaria`.
3. Crie usuário: ex. `hotelaria_user` com senha forte.
4. Adicione o usuário ao banco com **All Privileges**.
5. (Opcional para backend externo) `cPanel → Remote MySQL` e adicione o IP do servidor externo.
6. No **phpMyAdmin**, execute o script `server/sql/brandd86_hotelaria.sql` para criar as tabelas.

Anote:
- `DB_HOST` (em hospedagem compartilhada é normalmente `localhost`)
- `DB_PORT` (3306)
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`

## 2) Preparar a aplicação Node

Estrutura usada pela API (pasta `server/`):
- `index.js` (Express + SSE + CRUD)
- `package.json`
- `data.json` (persistência local em desenvolvimento)

Você pode subir diretamente esta pasta para o HostGator.

## 3) Criar a App Node.js no cPanel

1. Abra `cPanel → Setup Node.js App`.
2. **Application root**: aponte para o diretório onde você enviou a pasta `server` (ex.: `public_html/server`).
3. **Application URL**: escolha `seu-dominio.com/server` (ou mapeie para subdomínio).
4. **Application startup file**: `index.js`.
5. **Environment variables**: adicione:
   - `PORT=3020`
   - `PUBLIC_APP_URL=https://seu-dominio.com/` (inclua a barra no final)
   - `DB_HOST=localhost`
   - `DB_PORT=3306`
   - `DB_NAME=hotelaria`
   - `DB_USER=hotelaria_user`
   - `DB_PASSWORD=<sua_senha>`
6. Clique em **Create** e depois **Restart App**.

Testes:
- Abra `https://seu-dominio.com/server/api/health` e verifique resposta `{ status: "ok" }`.
- Abra `https://seu-dominio.com/server/api/host` e verifique que retorna `{ url: "https://seu-dominio.com/" }`.

## 4) Apontar o Frontend para a API

Você pode apontar de duas formas:

- `.env` do frontend (build):
  - `REACT_APP_API_BASE=https://seu-dominio.com/server/api`
  - Faça build e publique o frontend no seu domínio.

- Página **Configurações** do app:
  - Preencha `API Base` com `https://seu-dominio.com/server/api` e salve.

## 5) Sobre persistência

Por padrão, o servidor usa `data.json` em desenvolvimento. Com as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` definidas no ambiente, os endpoints de `orders` e `sales` já gravam/consultam no MySQL (CRUD completo). Os demais recursos (`inventory`, `events`, `transactions`, `rooms`, `chat`, `users`) continuam usando filesystem até serem migrados conforme necessidade.

Boas práticas:
- Não exponha credenciais do DB no frontend.
- Habilite HTTPS no domínio.
- Aplique validação nas rotas que criam/alteram dados.

## 6) Dúvidas comuns

- `req.protocol` retorna `http` no HostGator?
  - O endpoint `/api/host` usa `x-forwarded-proto` quando disponível e, se você definir `PUBLIC_APP_URL`, usa esse valor diretamente.

- Onde coloco os arquivos?
  - Envie a pasta `server/` para onde você configurou o **Application root** (ex.: `public_html/server`).

---

## 7) Deploy automático via Git (opcional)

Se você utiliza o cPanel **Git Version Control**, este projeto inclui um arquivo `.cpanel.yml` na raiz que automatiza:

- Instalação de dependências (`npm ci` na raiz e em `server/`).
- Build do frontend (`npm run build`).
- Publicação do build em `public_html` (limpa arquivos antigos e mantém `.well-known`).

Passos:
1. Abra `cPanel → Git Version Control` e crie um repositório apontando para seu GitHub.
2. Defina um `Repository Path` (ex.: `/home/<usuario>/apps/sistema_de_hotelaria`).
3. Após clonar, clique em **Manage** e depois **Deploy HEAD Commit**. O cPanel detectará e executará o `.cpanel.yml`.
4. Para o backend, use `cPanel → Setup Node.js App` apontando para `server/index.js` dentro do repositório clonado.

Personalizações:
- Para fixar a base da API no build, exporte `REACT_APP_API_BASE` antes do build (ou edite o `.cpanel.yml`).
- Para publicar o frontend em outro diretório, ajuste `DEPLOYPATH` no `.cpanel.yml`.

Validação:
- Acesse `https://seu-dominio.com/api/health` para checar a API/DB.
- Verifique o frontend em `public_html` após o deploy.
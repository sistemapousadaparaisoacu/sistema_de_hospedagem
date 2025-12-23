-- Auto-generated SQL dump from data.json

-- Config & Modules
CREATE TABLE IF NOT EXISTS app_settings (
  category TEXT PRIMARY KEY,
  data JSONB
);

INSERT INTO app_settings (category, data) VALUES ('config', '{"calendarSummary":"Eventos","kitchenAvgMinutes":25,"msgNew":"","msgAccepted":"","msgPreparing":"","msgDelivered":"","msgNewQuarto":"","msgNewMesa":"","msgAcceptedQuarto":"","msgAcceptedMesa":"","msgPreparingQuarto":"","msgPreparingMesa":"","msgDeliveredQuarto":"","msgDeliveredMesa":"","chatEnabled":true}') ON CONFLICT (category) DO UPDATE SET data = EXCLUDED.data;
INSERT INTO app_settings (category, data) VALUES ('modules', '{"pms":true,"pdv":true,"estoque":true,"eventos":true,"financeiro":true,"restaurante":true}') ON CONFLICT (category) DO UPDATE SET data = EXCLUDED.data;

-- Table: users
DROP TABLE IF EXISTS "users" CASCADE;
CREATE TABLE IF NOT EXISTS "users" (
  id BIGINT PRIMARY KEY,
  "nome" TEXT,
  "usuario" TEXT,
  "senha" TEXT,
  "papel" TEXT,
  "createdAt" TEXT
);
INSERT INTO "users" ("id", "nome", "usuario", "senha", "papel", "createdAt") VALUES
(1, 'Administrador', 'admin', 'admin', 'administrador', '2025-11-08T17:29:53.480Z'),
(2, 'Cozinha', 'coz', 'coz', 'cozinha', '2025-11-08T23:20:57.228Z'),
(3, 'Gerente', 'ger', 'ger', 'gerente', '2025-11-08T23:21:13.830Z'),
(4, 'Balcão', 'bal', 'bal', 'garcom', '2025-11-08T23:21:30.862Z')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('"users"', 'id'), (SELECT MAX(id) FROM "users") + 1);

-- Table: rooms
DROP TABLE IF EXISTS "rooms" CASCADE;
CREATE TABLE IF NOT EXISTS "rooms" (
  id BIGINT PRIMARY KEY,
  "nome" TEXT,
  "status" TEXT,
  "hospedes" JSONB,
  "checkIn" TEXT,
  "checkOut" TEXT,
  "createdAt" TEXT,
  "whatsappPrincipal" TEXT,
  "updatedAt" TEXT,
  "checkInHora" TEXT,
  "checkOutHora" TEXT,
  "formaPagamento" TEXT
);
INSERT INTO "rooms" ("id", "nome", "status", "hospedes", "checkIn", "checkOut", "createdAt", "whatsappPrincipal", "updatedAt", "checkInHora", "checkOutHora", "formaPagamento") VALUES
(1, 'Orquídea', 'disponível', '[]', '', '', '2025-11-07T01:07:57.962Z', NULL, NULL, NULL, NULL, NULL),
(2, 'Rosa', 'ocupado', '[{"nome":"João Silva","cpf":"123.456.789-00","whatsapp":"21997914496"}]', '2023-04-10', '2023-04-15', '2025-11-07T01:07:57.965Z', '21997914496', '2025-11-07T04:38:35.645Z', NULL, NULL, NULL),
(3, 'Tulipa', 'disponível', '[]', '', '', '2025-11-07T01:07:57.967Z', NULL, NULL, NULL, NULL, NULL),
(6, 'Lírio', 'disponível', '[]', '', '', '2025-11-07T01:07:57.971Z', NULL, NULL, NULL, NULL, NULL),
(4, 'Girassol', 'reservado', '[{"nome":"Maria Santos","cpf":"987.654.321-00","whatsapp":"11912345678"}]', '2023-04-20', '2023-04-25', '2025-11-07T01:07:57.975Z', NULL, NULL, NULL, NULL, NULL),
(5, 'Margarida', 'manutenção', '[]', '', '', '2025-11-07T01:07:57.977Z', NULL, NULL, NULL, NULL, NULL),
(7, 'Violeta', 'ocupado', '[{"nome":"Pedro Alves","cpf":"111.222.333-44","whatsapp":"11955556666"}]', '2023-04-08', '2023-04-12', '2025-11-07T01:07:57.979Z', NULL, NULL, NULL, NULL, NULL),
(8, 'Cravo', 'disponível', '[]', '', '', '2025-11-07T01:07:57.981Z', NULL, NULL, NULL, NULL, NULL),
(9, 'Azaleia', 'reservado', '[{"nome":"Ana Costa","cpf":"444.555.666-77","whatsapp":"11977778888"}]', '2023-04-18', '2023-04-22', '2025-11-07T01:07:57.983Z', NULL, NULL, NULL, NULL, NULL),
(10, 'Begônia', 'disponível', '[]', '', '', '2025-11-07T01:07:57.985Z', NULL, NULL, NULL, NULL, NULL),
(11, 'Camélia', 'ocupado', '[{"nome":"Carlos Mendes","cpf":"888.999.000-11","whatsapp":"11933334444"}]', '2023-04-05', '2023-04-15', '2025-11-07T01:07:57.987Z', NULL, NULL, NULL, NULL, NULL),
(12, 'Dália', 'disponível', '[]', '', '', '2025-11-07T01:07:57.989Z', NULL, NULL, NULL, NULL, NULL),
(13, 'Frésia', 'disponível', '[]', '', '', '2025-11-07T01:07:58.039Z', '', '2025-12-23T16:34:53.216Z', '', '', ''),
(14, 'Gardênia', 'disponível', '[]', '', '', '2025-11-07T01:07:57.995Z', NULL, NULL, NULL, NULL, NULL),
(15, 'Hortênsia', 'ocupado', '[{"nome":"Luiza Ferreira","cpf":"222.333.444-55","whatsapp":"11944445555"}]', '2023-04-07', '2023-04-14', '2025-11-07T01:07:57.997Z', NULL, NULL, NULL, NULL, NULL),
(16, 'Íris', 'disponível', '[]', '', '', '2025-11-07T01:07:58.000Z', NULL, NULL, NULL, NULL, NULL),
(17, 'Jasmim', 'reservado', '[{"nome":"Roberto Gomes","cpf":"555.666.777-88","whatsapp":"11966667777"}]', '2023-04-25', '2023-04-30', '2025-11-07T01:07:58.002Z', NULL, NULL, NULL, NULL, NULL),
(18, 'Lavanda', 'disponível', '[]', '', '', '2025-11-07T01:07:58.004Z', NULL, NULL, NULL, NULL, NULL),
(19, 'Magnólia', 'ocupado', '[{"nome":"Teresa Vieira","cpf":"999.000.111-22","whatsapp":"11922223333"}]', '2023-04-09', '2023-04-16', '2025-11-07T01:07:58.008Z', NULL, NULL, NULL, NULL, NULL),
(20, 'Narciso', 'disponível', '[]', '', '', '2025-11-07T01:07:58.010Z', NULL, NULL, NULL, NULL, NULL),
(21, 'Petúnia', 'reservado', '[{"nome":"Fernando Lima","cpf":"333.444.555-66","whatsapp":"11911112222"}]', '2023-04-22', '2023-04-27', '2025-11-07T01:07:58.013Z', NULL, NULL, NULL, NULL, NULL),
(22, 'Zínia', 'disponível', '[]', '', '', '2025-11-07T01:07:58.015Z', NULL, NULL, NULL, NULL, NULL),
(1, 'Orquídea', 'disponível', '[]', '', '', '2025-11-07T01:07:58.017Z', NULL, NULL, NULL, NULL, NULL),
(2, 'Rosa', 'ocupado', '[{"nome":"João Silva","cpf":"123.456.789-00","whatsapp":"11987654321"}]', '2023-04-10', '2023-04-15', '2025-11-07T01:07:58.019Z', NULL, NULL, NULL, NULL, NULL),
(3, 'Tulipa', 'disponível', '[]', '', '', '2025-11-07T01:07:58.020Z', NULL, NULL, NULL, NULL, NULL),
(4, 'Girassol', 'reservado', '[{"nome":"Maria Santos","cpf":"987.654.321-00","whatsapp":"11912345678"}]', '2023-04-20', '2023-04-25', '2025-11-07T01:07:58.022Z', NULL, NULL, NULL, NULL, NULL),
(5, 'Margarida', 'manutenção', '[]', '', '', '2025-11-07T01:07:58.024Z', NULL, NULL, NULL, NULL, NULL),
(6, 'Lírio', 'disponível', '[]', '', '', '2025-11-07T01:07:58.027Z', NULL, NULL, NULL, NULL, NULL),
(7, 'Violeta', 'ocupado', '[{"nome":"Pedro Alves","cpf":"111.222.333-44","whatsapp":"11955556666"}]', '2023-04-08', '2023-04-12', '2025-11-07T01:07:58.029Z', NULL, NULL, NULL, NULL, NULL),
(8, 'Cravo', 'disponível', '[]', '', '', '2025-11-07T01:07:58.031Z', NULL, NULL, NULL, NULL, NULL),
(9, 'Azaleia', 'reservado', '[{"nome":"Ana Costa","cpf":"444.555.666-77","whatsapp":"11977778888"}]', '2023-04-18', '2023-04-22', '2025-11-07T01:07:58.032Z', NULL, NULL, NULL, NULL, NULL),
(10, 'Begônia', 'disponível', '[]', '', '', '2025-11-07T01:07:58.034Z', NULL, NULL, NULL, NULL, NULL),
(11, 'Camélia', 'ocupado', '[{"nome":"Carlos Mendes","cpf":"888.999.000-11","whatsapp":"11933334444"}]', '2023-04-05', '2023-04-15', '2025-11-07T01:07:58.036Z', NULL, NULL, NULL, NULL, NULL),
(12, 'Dália', 'disponível', '[]', '', '', '2025-11-07T01:07:58.038Z', NULL, NULL, NULL, NULL, NULL),
(13, 'Frésia', 'manutenção', '[]', '', '', '2025-11-07T01:07:58.039Z', NULL, NULL, NULL, NULL, NULL),
(14, 'Gardênia', 'disponível', '[]', '', '', '2025-11-07T01:07:58.042Z', NULL, NULL, NULL, NULL, NULL),
(15, 'Hortênsia', 'ocupado', '[{"nome":"Luiza Ferreira","cpf":"222.333.444-55","whatsapp":"11944445555"}]', '2023-04-07', '2023-04-14', '2025-11-07T01:07:58.045Z', NULL, NULL, NULL, NULL, NULL),
(16, 'Íris', 'disponível', '[]', '', '', '2025-11-07T01:07:58.047Z', NULL, NULL, NULL, NULL, NULL),
(17, 'Jasmim', 'reservado', '[{"nome":"Roberto Gomes","cpf":"555.666.777-88","whatsapp":"11966667777"}]', '2023-04-25', '2023-04-30', '2025-11-07T01:07:58.048Z', NULL, NULL, NULL, NULL, NULL),
(18, 'Lavanda', 'disponível', '[]', '', '', '2025-11-07T01:07:58.050Z', NULL, NULL, NULL, NULL, NULL),
(19, 'Magnólia', 'ocupado', '[{"nome":"Teresa Vieira","cpf":"999.000.111-22","whatsapp":"11922223333"}]', '2023-04-09', '2023-04-16', '2025-11-07T01:07:58.052Z', NULL, NULL, NULL, NULL, NULL),
(20, 'Narciso', 'disponível', '[]', '', '', '2025-11-07T01:07:58.054Z', NULL, NULL, NULL, NULL, NULL),
(21, 'Petúnia', 'reservado', '[{"nome":"Fernando Lima","cpf":"333.444.555-66","whatsapp":"11911112222"}]', '2023-04-22', '2023-04-27', '2025-11-07T01:07:58.056Z', NULL, NULL, NULL, NULL, NULL),
(22, 'Zínia', 'disponível', '[]', '', '', '2025-11-07T01:07:58.059Z', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('"rooms"', 'id'), (SELECT MAX(id) FROM "rooms") + 1);

-- Table: events
DROP TABLE IF EXISTS "events" CASCADE;
CREATE TABLE IF NOT EXISTS "events" (
  id BIGINT PRIMARY KEY,
  "nome" TEXT,
  "data" TEXT,
  "horaInicio" TEXT,
  "horaFim" TEXT,
  "local" TEXT,
  "capacidade" INTEGER,
  "participantes" JSONB,
  "descricao" TEXT,
  "createdAt" TEXT,
  "status" TEXT,
  "updatedAt" TEXT,
  "tipo" TEXT
);
INSERT INTO "events" ("id", "nome", "data", "horaInicio", "horaFim", "local", "capacidade", "participantes", "descricao", "createdAt", "status", "updatedAt", "tipo") VALUES
(1, 'Conferência Empresarial', '2023-05-15', '09:00', '18:00', 'Salão Principal', 100, '[{"id":1,"nome":"João Silva","email":"joao@email.com","telefone":"(11) 98765-4321","status":"confirmado"},{"id":2,"nome":"Maria Santos","email":"maria@email.com","telefone":"(11) 91234-5678","status":"confirmado"},{"id":3,"nome":"Pedro Alves","email":"pedro@email.com","telefone":"(11) 99876-5432","status":"pendente"}]', 'Conferência anual para discussão de estratégias empresariais.', '2025-11-07T00:35:25.568Z', 'cancelado', '2025-12-23T14:59:57.832Z', 'Aniversário'),
(2, 'Casamento Silva & Costa', '2023-06-20', '19:00', '02:00', 'Salão de Festas', 150, '[{"id":1,"nome":"Carlos Mendes","email":"carlos@email.com","telefone":"(11) 97777-8888","status":"confirmado"},{"id":2,"nome":"Ana Costa","email":"ana@email.com","telefone":"(11) 96666-7777","status":"confirmado"}]', 'Cerimônia de casamento seguida de recepção.', '2025-11-07T00:35:25.575Z', NULL, '2025-12-23T14:59:57.848Z', 'Casamento'),
(3, 'Workshop de Culinária', '2023-05-10', '14:00', '17:00', 'Cozinha Industrial', 30, '[{"id":1,"nome":"Luiza Ferreira","email":"luiza@email.com","telefone":"(11) 95555-6666","status":"confirmado"},{"id":2,"nome":"Roberto Gomes","email":"roberto@email.com","telefone":"(11) 94444-5555","status":"pendente"},{"id":3,"nome":"Teresa Vieira","email":"teresa@email.com","telefone":"(11) 93333-4444","status":"confirmado"},{"id":4,"nome":"Fernando Lima","email":"fernando@email.com","telefone":"(11) 92222-3333","status":"confirmado"}]', 'Workshop de culinária italiana com chef renomado.', '2025-11-07T00:35:25.580Z', NULL, '2025-12-23T14:59:57.851Z', 'Aniversário'),
(4, 'teste', '2025-11-29', '21:41', '22:41', 'teste', 8, '[]', 'teste', '2025-11-07T00:42:05.740Z', 'confirmado', NULL, 'Casamento')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('"events"', 'id'), (SELECT MAX(id) FROM "events") + 1);

-- Table: orders
DROP TABLE IF EXISTS "orders" CASCADE;
CREATE TABLE IF NOT EXISTS "orders" (
  id BIGINT PRIMARY KEY,
  "pedidoId" INTEGER,
  "quarto" TEXT,
  "localEntrega" TEXT,
  "itens" JSONB,
  "total" TEXT,
  "status" TEXT,
  "observacoes" TEXT,
  "horario" TEXT,
  "criadoEm" TEXT,
  "whatsappPrincipal" TEXT,
  "createdAt" TEXT,
  "aceitoPor" TEXT,
  "aceitoEm" TEXT,
  "updatedAt" TEXT,
  "preparandoPor" TEXT,
  "preparandoEm" TEXT,
  "finalizado" BOOLEAN
);
INSERT INTO "orders" ("id", "pedidoId", "quarto", "localEntrega", "itens", "total", "status", "observacoes", "horario", "criadoEm", "whatsappPrincipal", "createdAt", "aceitoPor", "aceitoEm", "updatedAt", "preparandoPor", "preparandoEm", "finalizado") VALUES
(7026, 7026, 'Orquídea', 'mesa', '["1x Vinho Tinto","1x Refrigerante","1x Bruschetta","1x Tiramisu","1x Picanha","1x Filé Mignon"]', '372.90', 'entregue', '', '01:10', '01:10:11', '', '2025-11-07T04:10:11.672Z', 'admin', '01:14', '2025-11-08T15:20:20.432Z', 'admin', '01:47', TRUE),
(4808, 4808, 'Rosa', 'quarto', '["1x Risoto de Funghi","1x Bruschetta","1x Refrigerante","1x Suco Natural","1x Vinho Tinto","1x Filé Mignon","1x Salmão Grelhado"]', '408.40', 'entregue', '', '01:37', '01:37:24', '11987654321', '2025-11-07T04:37:24.203Z', 'admin', '01:40', '2025-11-08T15:20:17.748Z', 'admin', '01:47', TRUE),
(9445, 9445, 'Rosa', 'quarto', '["1x Picanha","1x Bruschetta","1x Espaguete à Carbonara","1x Tiramisu"]', '213.00', 'entregue', 'teste', '01:39', '01:39:42', '21997914496', '2025-11-07T04:39:42.329Z', 'admin', '01:44', '2025-11-08T15:20:24.734Z', 'admin', '01:48', TRUE),
(1608, 1608, 'Cravo', 'quarto', '["1x Risoto de Funghi","1x Bruschetta","1x Espaguete à Carbonara","1x Tiramisu","1x Suco Natural","1x Vinho Tinto"]', '318.00', 'entregue', 'teste teste', '01:44', '01:44:32', '', '2025-11-07T04:44:32.920Z', 'admin', '01:46', '2025-11-08T15:20:15.803Z', 'admin', '01:48', TRUE),
(8948, 8948, 'Hortênsia', 'quarto', '["1x Filé Mignon","1x Risoto de Funghi","1x Salmão Grelhado"]', '233.40', 'entregue', '', '14:18', '14:18:48', '', '2025-11-08T17:18:48.309Z', 'admin', '14:20', '2025-11-08T23:23:28.918Z', 'admin', '14:20', TRUE),
(8573, 8573, 'Zínia', 'quarto', '["1x Salmão Grelhado","1x Salada Caesar","1x Risoto de Funghi"]', '185.50', 'entregue', '', '14:21', '14:21:36', '', '2025-11-08T17:21:36.169Z', 'admin', '14:21', '2025-11-08T23:23:26.784Z', 'admin', '20:23', TRUE),
(1111, 1111, 'Frésia', 'mesa', '["1x Filé Mignon","1x Salmão Grelhado"]', '168.40', 'entregue', '', '14:53', '14:53:00', '', '2025-11-08T17:53:00.748Z', 'admin', '20:23', '2025-11-08T23:24:07.099Z', 'admin', '20:23', TRUE),
(6710, 6710, 'Gardênia', 'quarto', '["1x Filé Mignon","1x Salada Caesar"]', '131.90', 'preparando', '', '21:04', '21:04:59', '', '2025-11-09T00:04:59.973Z', 'admin', '21:06', '2025-11-09T00:26:10.173Z', 'admin', '21:26', NULL),
(1412, 1412, 'Magnólia', 'mesa', '["1x Salmão Grelhado"]', '78.50', 'pendente', '', '12:03', '12:03:34', '21997914496', '2025-12-23T15:03:35.216Z', NULL, NULL, NULL, NULL, NULL, NULL),
(7814, 7814, 'Narciso', 'quarto', '["1x Salmão Grelhado"]', '78.50', 'pendente', '', '13:31', '1:31:05 PM', '', '2025-12-23T16:31:05.510Z', NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('"orders"', 'id'), (SELECT MAX(id) FROM "orders") + 1);

-- Table: chat
DROP TABLE IF EXISTS "chat" CASCADE;
CREATE TABLE IF NOT EXISTS "chat" (
  id BIGINT PRIMARY KEY,
  "text" TEXT,
  "fromName" TEXT,
  "fromSector" TEXT,
  "toSector" TEXT,
  "createdAt" TEXT
);
INSERT INTO "chat" ("id", "text", "fromName", "fromSector", "toSector", "createdAt") VALUES
(1, 'oi', 'admin', 'administrador', 'cozinha', '2025-11-07T05:12:44.512Z'),
(2, 'oi', 'coz', 'cozinha', 'administrador', '2025-11-07T05:12:44.520Z'),
(3, 'oi', 'admin', 'administrador', 'cozinha', '2025-11-07T05:12:44.529Z'),
(4, 'ew', 'admin', 'administrador', 'cozinha', '2025-11-07T05:12:44.533Z'),
(5, 'oi', 'admin', 'administrador', 'cozinha', '2025-11-07T05:12:44.538Z'),
(6, 'oi', 'coz', 'cozinha', 'administrador', '2025-11-07T05:14:11.409Z'),
(7, 'kkkk', 'admin', 'administrador', 'cozinha', '2025-11-07T05:14:26.100Z'),
(8, 'uhull7l', 'coz', 'cozinha', 'administrador', '2025-11-07T05:14:40.497Z'),
(9, 'oi', 'admin', 'administrador', 'cozinha', '2025-11-08T00:15:22.524Z'),
(10, 'oi', 'admin', 'administrador', 'cozinha', '2025-11-08T00:15:22.530Z'),
(11, 'oi', 'coz', 'cozinha', 'administrador', '2025-11-08T15:15:48.062Z'),
(12, 'oi', 'coz', 'cozinha', 'administrador', '2025-11-08T15:15:48.066Z'),
(13, 'oi', 'coz', 'cozinha', 'cozinha', '2025-11-08T15:16:04.231Z'),
(14, 'tudo bem?', 'admin', 'administrador', 'cozinha', '2025-11-08T15:16:26.056Z'),
(15, 'Oioi', 'admin', 'administrador', 'cozinha', '2025-11-08T17:23:00.012Z'),
(16, 'Oioi', 'admin', 'administrador', 'administrador', '2025-11-08T17:23:25.398Z'),
(17, 'Te amo', 'admin', 'administrador', 'administrador', '2025-11-08T17:23:30.829Z'),
(18, 'oieeee', 'admin', 'administrador', 'administrador', '2025-11-08T17:23:32.904Z'),
(19, 'tb te amooo', 'admin', 'administrador', 'administrador', '2025-11-08T17:23:39.032Z')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('"chat"', 'id'), (SELECT MAX(id) FROM "chat") + 1);

-- Table: sales
DROP TABLE IF EXISTS "sales" CASCADE;
CREATE TABLE IF NOT EXISTS "sales" (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  extra_data JSONB
);

-- Table: inventory
DROP TABLE IF EXISTS "inventory" CASCADE;
CREATE TABLE IF NOT EXISTS "inventory" (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  extra_data JSONB
);

-- Table: transactions
DROP TABLE IF EXISTS "transactions" CASCADE;
CREATE TABLE IF NOT EXISTS "transactions" (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  extra_data JSONB
);


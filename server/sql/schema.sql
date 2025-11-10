-- Schema inicial para integração MySQL (HostGator)
-- Ajuste nomes/colunas conforme sua necessidade antes de aplicar.
-- Crie o banco e o usuário no cPanel e execute este script.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Usuários do sistema
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  usuario VARCHAR(80) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  papel VARCHAR(40) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quartos/mesas/etc.
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  whatsappPrincipal VARCHAR(20) NULL,
  whatsappPrincipalIndex INT NULL,
  status VARCHAR(40) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Estoque / produtos
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(140) NOT NULL,
  categoria VARCHAR(80) NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  estoque INT NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pedidos (Restaurante)
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quarto VARCHAR(100) NULL,
  localEntrega VARCHAR(100) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pendente',
  itens_json TEXT NULL, -- lista de itens em JSON
  horario DATETIME DEFAULT CURRENT_TIMESTAMP,
  finalizado TINYINT(1) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vendas (PDV)
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  itens_json TEXT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  formaPagamento VARCHAR(50) NULL,
  quarto VARCHAR(100) NULL,
  comprador_nome VARCHAR(120) NULL,
  comprador_whatsapp VARCHAR(20) NULL,
  origem VARCHAR(40) NULL,
  data DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transações financeiras (receitas/despesas)
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('receita','despesa') NOT NULL,
  categoria VARCHAR(50) NULL,
  descricao VARCHAR(255) NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL,
  formaPagamento VARCHAR(50) NULL,
  status ENUM('confirmado','pendente') NOT NULL DEFAULT 'confirmado',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Eventos (agenda)
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  descricao TEXT NULL,
  dataInicial DATETIME NOT NULL,
  dataFinal DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chat (mensagens internas)
CREATE TABLE IF NOT EXISTS chat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  autor VARCHAR(120) NULL,
  mensagem TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_sales_data ON sales (data);
CREATE INDEX IF NOT EXISTS idx_transactions_tipo_data ON transactions (tipo, data);
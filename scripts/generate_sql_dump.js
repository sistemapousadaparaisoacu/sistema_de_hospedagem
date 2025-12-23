const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../server/data.json');
const OUTPUT_FILE = path.join(__dirname, '../dump.sql');

function getType(value) {
  if (value === null || value === undefined) return 'TEXT';
  const type = typeof value;
  if (type === 'number') return Number.isInteger(value) ? 'INTEGER' : 'DECIMAL(10,2)';
  if (type === 'boolean') return 'BOOLEAN';
  if (type === 'object') return 'JSONB';
  return 'TEXT';
}

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateCreateTable(tableName, items) {
  if (!items || items.length === 0) {
    // Se vazio, cria tabela genérica com id e dados jsonb (fallback)
    return `CREATE TABLE IF NOT EXISTS ${tableName} (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  extra_data JSONB
);`;
  }

  // Coleta todas as chaves possíveis de todos os itens
  const allKeys = new Set();
  items.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));

  // Remove 'id' se existir, pois será chave primária
  allKeys.delete('id');

  const columns = ['id SERIAL PRIMARY KEY'];
  
  // Determina tipos (bem simples, baseado no primeiro valor não nulo encontrado)
  allKeys.forEach(key => {
    let type = 'TEXT';
    for (const item of items) {
      if (item[key] !== null && item[key] !== undefined) {
        type = getType(item[key]);
        break;
      }
    }
    // Ajuste de nomes de colunas para snake_case se necessário? 
    // O código JS usa camelCase. O Supabase aceita camelCase se colocarmos entre aspas, 
    // mas o padrão SQL é snake_case.
    // O código server/index.js faz `supabase.from(table).select('*')`.
    // Se o banco tiver colunas em snake_case, o retorno será snake_case.
    // Se o código JS espera camelCase, teremos um problema.
    // O código `server/index.js` tem um comentário: 
    // "Supabase retorna snake_case, frontend espera camelCase em alguns casos... Para simplificar, assumimos que o banco usa camelCase ou frontend tolera."
    // Então vou manter camelCase mas usando aspas duplas no CREATE TABLE para PostgreSQL respeitar o case.
    
    columns.push(`"${key}" ${type}`);
  });

  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columns.join(',\n  ')}\n);`;
}

function generateInserts(tableName, items) {
  if (!items || items.length === 0) return '';

  const allKeys = new Set();
  items.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
  
  // Garante que ID está na lista de colunas para o insert, se não for auto-incremento
  // Na verdade, como já temos IDs no JSON, queremos mantê-los.
  // Então o CREATE TABLE deve usar id INTEGER PRIMARY KEY ou BIGINT, não SERIAL (que é auto-inc).
  // Mas se usarmos SERIAL, podemos forçar o valor no INSERT.
  
  const sortedKeys = Array.from(allKeys);
  const columns = sortedKeys.map(k => `"${k}"`).join(', ');

  const values = items.map(item => {
    const row = sortedKeys.map(key => escapeSql(item[key]));
    return `(${row.join(', ')})`;
  }).join(',\n');

  return `INSERT INTO "${tableName}" (${columns}) VALUES\n${values}\nON CONFLICT (id) DO NOTHING;`;
}

// Config e Modules são especiais -> tabela app_settings
function generateAppSettings(config, modules) {
  const create = `CREATE TABLE IF NOT EXISTS app_settings (
  category TEXT PRIMARY KEY,
  data JSONB
);`;

  const inserts = [];
  if (config) {
    // Remove logoDataUrl to avoid large SQL query errors and JSON syntax issues
    const configClean = { ...config };
    if (configClean.logoDataUrl) {
      delete configClean.logoDataUrl;
    }
    inserts.push(`INSERT INTO app_settings (category, data) VALUES ('config', '${JSON.stringify(configClean).replace(/'/g, "''")}') ON CONFLICT (category) DO UPDATE SET data = EXCLUDED.data;`);
  }
  if (modules) {
    inserts.push(`INSERT INTO app_settings (category, data) VALUES ('modules', '${JSON.stringify(modules).replace(/'/g, "''")}') ON CONFLICT (category) DO UPDATE SET data = EXCLUDED.data;`);
  }

  return `${create}\n\n${inserts.join('\n')}`;
}

try {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const data = JSON.parse(raw);
  
  let sql = '-- Auto-generated SQL dump from data.json\n\n';

  // 1. App Settings
  sql += '-- Config & Modules\n';
  sql += generateAppSettings(data.config, data.modules);
  sql += '\n\n';

  // 2. Arrays
  const tables = ['users', 'rooms', 'events', 'orders', 'chat', 'sales', 'inventory', 'transactions'];
  
  tables.forEach(table => {
    if (data[table]) {
      sql += `-- Table: ${table}\n`;
      // Ajuste para usar ID do JSON em vez de SERIAL puro
      // Vou modificar a função generateCreateTable para tratar ID corretamente
      const items = data[table];
      
      // CREATE
      // Se tiver items, define colunas. Se não, cria genérica.
      // Vou reescrever generateCreateTable inline aqui ou ajustar a função para ser mais esperta com ID.
      
      // Hack: Reescrevendo generateCreateTable logic para lidar com ID fixo
      let createStmt = '';
      
      // DROP para garantir schema limpo (CUIDADO: Apaga dados existentes no banco!)
      sql += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;

      if (!items || items.length === 0) {
         createStmt = `CREATE TABLE IF NOT EXISTS "${table}" (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  extra_data JSONB
);`;
      } else {
        const allKeys = new Set();
        items.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
        // ID deve ser INTEGER ou BIGINT PRIMARY KEY
        // Se id não existir nos dados (estranho), cria SERIAL
        const hasId = allKeys.has('id');
        allKeys.delete('id');
        
        const cols = [];
        if (hasId) {
            cols.push('id BIGINT PRIMARY KEY'); // BIGINT para garantir
        } else {
            cols.push('id SERIAL PRIMARY KEY');
        }

        allKeys.forEach(key => {
            let type = 'TEXT';
            for (const item of items) {
                if (item[key] !== null && item[key] !== undefined) {
                    type = getType(item[key]);
                    break;
                }
            }
            cols.push(`"${key}" ${type}`);
        });
        createStmt = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${cols.join(',\n  ')}\n);`;
      }
      
      sql += createStmt + '\n';
      
      // INSERT
      if (items && items.length > 0) {
        sql += generateInserts(table, items) + '\n';
        // Reset sequence se necessário
        sql += `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT MAX(id) FROM "${table}") + 1);\n`;
      }
      sql += '\n';
    }
  });

  fs.writeFileSync(OUTPUT_FILE, sql);
  console.log(`Dump SQL gerado com sucesso em: ${OUTPUT_FILE}`);

} catch (err) {
  console.error('Erro ao gerar SQL:', err);
}

const path = require('path');
// Tenta carregar do diretório atual ou do pai (raiz do projeto)
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
if (!process.env.SUPABASE_URL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Conectado ao Supabase:', supabaseUrl);
} else {
  console.warn('ATENÇÃO: Credenciais do Supabase não encontradas. O sistema usará armazenamento local (data.json).');
}

module.exports = supabase;

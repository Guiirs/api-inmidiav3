// scripts/migrate_data.js
const knex = require('knex');
const knexConfig = require('../knexfile');

// Conecta-se à base de dados de DESENVOLVIMENTO (SQLite) para LER os dados
const dbDev = knex(knexConfig.development);

// Conecta-se à base de dados de PRODUÇÃO (PostgreSQL) para ESCREVER os dados
const dbProd = knex(knexConfig.production);

async function migrateData() {
  try {
    console.log('Iniciando a migração de dados...');

    // 1. Migrar a tabela 'regioes' (opcional, mas bom para manter os IDs)
    const regioes = await dbDev('regioes').select('*');
    if (regioes.length > 0) {
      console.log(`Migrando ${regioes.length} regiões...`);
      // O 'onConflict' impede erros se a região já existir
      await dbProd('regioes').insert(regioes).onConflict('id').ignore();
    }

    // 2. Migrar a tabela 'users'
    const users = await dbDev('users').select('*');
    if (users.length > 0) {
      console.log(`Migrando ${users.length} utilizadores...`);
      await dbProd('users').insert(users).onConflict('id').ignore();
    }

    // 3. Migrar a tabela 'placas'
    const placas = await dbDev('placas').select('*');
    if (placas.length > 0) {
      console.log(`Migrando ${placas.length} placas...`);
      await dbProd('placas').insert(placas).onConflict('id').ignore();
    }

    console.log('✅ Migração de dados concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a migração de dados:', error);
  } finally {
    // Fecha as ligações com as bases de dados
    await dbDev.destroy();
    await dbProd.destroy();
  }
}

// Executa a função
migrateData();
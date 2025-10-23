// InMidia/backend/db/migrations/20251016000000_create_initial_schema.js

exports.up = function(knex) {
  return knex.schema
    // 1. Tabela de Empresas
    .createTable('empresas', function(table) {
      table.increments('id').primary();
      table.string('nome').notNullable();
      table.string('cnpj').notNullable().unique();
      // Colunas para API Key Hashing
      table.string('api_key_hash').notNullable().unique();
      table.string('api_key_prefix').notNullable().unique().index();
      table.string('status_assinatura').defaultTo('active');
      table.timestamps(true, true);
    })
    // 2. Tabela de Utilizadores
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('email').notNullable().unique();
      table.string('password').notNullable();
      table.string('nome').notNullable();
      table.string('sobrenome').notNullable();
      table.string('role').defaultTo('user');
      table.string('avatar_url').nullable();
      table.string('resetToken').nullable();
      table.bigInteger('tokenExpiry').nullable();
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').onDelete('CASCADE');
      table.timestamps(true, true);
    })
    // 3. Tabela de Regiões
    .createTable('regioes', function(table) {
      table.increments('id').primary();
      table.string('nome').notNullable();
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').onDelete('CASCADE');
    })
    // 4. Tabela de Placas
    .createTable('placas', function(table) {
      table.increments('id').primary();
      table.string('id_placa').notNullable().unique();
      table.string('numero_placa').notNullable();
      table.string('coordenadas').nullable();
      table.string('nomeDaRua').nullable();
      table.string('tamanho').nullable();
      table.string('imagem').nullable();
      table.boolean('disponivel').defaultTo(true);
      table.integer('regiao_id').unsigned().references('id').inTable('regioes').onDelete('SET NULL');
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').onDelete('CASCADE');
      table.timestamps(true, true);
      
      // Índice composto para otimizar a verificação de duplicidade
      table.unique(['numero_placa', 'regiao_id', 'empresa_id']);
    });
};

exports.down = function(knex) {
  // A ordem de 'down' é a inversa de 'up'
  return knex.schema
    .dropTableIfExists('placas')
    .dropTableIfExists('regioes')
    .dropTableIfExists('users')
    .dropTableIfExists('empresas');
};
// db/migrations/YYYYMMDD..._create_clientes_e_alugueis_tables.js

exports.up = function(knex) {
  return knex.schema
    // 1. Tabela de Clientes (os seus locatários)
    .createTable('clientes', function(table) {
      table.increments('id').primary();
      table.string('nome').notNullable();
      table.string('cnpj').nullable(); // CNPJ é opcional mas deve ser único para a sua agência
      table.string('telefone').nullable(); // Nova coluna de telefone
      table.string('logo_url').nullable(); // Caminho para o logo, gerido pelo MediaService
      
      table.integer('empresa_id') // A qual agência (você, utilizador do InMidia) este cliente pertence
           .unsigned()
           .references('id')
           .inTable('empresas') // Referencia a tabela 'empresas' existente
           .onDelete('CASCADE'); // Se a sua agência for apagada, os clientes também são
      
      table.timestamps(true, true);

      // Garante que o CNPJ (se fornecido) é único por agência
      table.unique(['cnpj', 'empresa_id']);
    })
    // 2. Tabela de Alugueis (a associação entre Placa e Cliente)
    .createTable('alugueis', function(table) {
      table.increments('id').primary();
      table.date('data_inicio').notNullable();
      table.date('data_fim').notNullable();
      
      table.integer('placa_id') // A placa que foi alugada
           .unsigned()
           .references('id')
           .inTable('placas') // Referencia a tabela 'placas'
           .onDelete('CASCADE');

      table.integer('cliente_id') // O cliente que alugou
           .unsigned()
           .references('id')
           .inTable('clientes') // Referencia a tabela 'clientes'
           .onDelete('CASCADE');
      
      table.integer('empresa_id') // ID da agência dona de tudo
           .unsigned()
           .references('id')
           .inTable('empresas')
           .onDelete('CASCADE');

      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  // Ordem inversa para apagar
  return knex.schema
    .dropTableIfExists('alugueis')
    .dropTableIfExists('clientes');
};
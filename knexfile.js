// knexfile.js
require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './db/database/gerenciador_placas.db3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: './db/database/test.db3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },

  // --- CORREÇÃO AQUI ---
  // Apenas UMA configuração de produção, que usa a DATABASE_URL
  // O sslmode=disable no docker-compose.yml irá controlar o SSL.
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      // A linha SSL foi movida para a connectionString (no docker-compose)
      // Se for para produção real (ex: Render), a URL deles incluirá o SSL.
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  }
  // A segunda entrada 'production' duplicada foi removida
};
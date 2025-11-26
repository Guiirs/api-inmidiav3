// jest.setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Antes de todos os testes
beforeAll(async () => {
  // <<< MODIFICAÇÃO AQUI: Iniciar como Replica Set >>>
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'jest', // Nome do banco de dados (opcional)
    },
    replSet: { // Configuração do Replica Set
      count: 1, // Um único membro é suficiente para testes
      storageEngine: 'wiredTiger',
    }
  });
  // <<< FIM DA MODIFICAÇÃO >>>

  const mongoUri = mongoServer.getUri(); // Obtém a URI de conexão (já inclui ?replicaSet=...)
  await mongoose.connect(mongoUri); // Conecta o Mongoose a ele
  console.log(`Jest conectado a MongoDB in-memory Replica Set: ${mongoUri}`); // Log atualizado

   // Configura mapeamento global _id -> id PARA OS TESTES também (manter)
    mongoose.set('toJSON', {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id; delete ret._id; delete ret.__v;
        }
    });
    mongoose.set('toObject', {
         virtuals: true,
         transform: (doc, ret) => {
             ret.id = ret._id; delete ret._id; delete ret.__v;
         }
     });
     console.log('Jest: Mapeamento global _id -> id configurado.'); // Log adicionado

});

// Depois de todos os testes
afterAll(async () => {
  await mongoose.disconnect(); // Desconecta o Mongoose
  await mongoServer.stop(); // Para o servidor em memória
  console.log('Jest desconectado do MongoDB in-memory.');
});

// Antes de CADA teste (ou afterEach) - Limpa os dados (manter)
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    // Adiciona try-catch para lidar com possíveis erros ao limpar coleções do sistema
    try {
        await collection.deleteMany({}); // Apaga todos os documentos
    } catch (e) {
        // Ignora erros ao tentar limpar coleções do sistema que não podem ser apagadas
        if (e.message.includes('system.')) {
            // console.warn(`Skipping cleanup for system collection: ${key}`);
        } else {
            console.error(`Error cleaning collection ${key}:`, e);
        }
    }
  }
});
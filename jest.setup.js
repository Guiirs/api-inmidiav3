// jest.setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Antes de todos os testes
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create(); // Inicia o servidor em memória
  const mongoUri = mongoServer.getUri(); // Obtém a URI de conexão
  await mongoose.connect(mongoUri); // Conecta o Mongoose a ele
  console.log(`Jest conectado a MongoDB in-memory: ${mongoUri}`);

   // Configura mapeamento global _id -> id PARA OS TESTES também (opcional)
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

});

// Depois de todos os testes
afterAll(async () => {
  await mongoose.disconnect(); // Desconecta o Mongoose
  await mongoServer.stop(); // Para o servidor em memória
  console.log('Jest desconectado do MongoDB in-memory.');
});

// Antes de CADA teste (ou afterEach) - Limpa os dados
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({}); // Apaga todos os documentos
  }
});
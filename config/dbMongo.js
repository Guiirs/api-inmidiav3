// config/dbMongo.js
const mongoose = require('mongoose');
const fs = require('fs'); // Necessário para SSL com CA
const path = require('path'); // Necessário para SSL com CA
const config = require('./config'); // Puxa MONGODB_URI de config.js
const logger = require('./logger'); // Usa seu logger existente

// Caminho para o certificado CA (ajuste o nome do ficheiro se necessário)
const caPath = path.resolve(__dirname, 'certs', 'ca-certificate.pem');

const connectDB = async () => {
  // <<< ADICIONAR ESTA VERIFICAÇÃO >>>
  if (process.env.NODE_ENV === 'test') {
    logger.info('[DB Mongo] Conexão adiada (ambiente de teste). Jest cuidará disso.');
    return; // Não conecta se for ambiente de teste
  }
  // <<< FIM DA ADIÇÃO >>>

  try {
    const options = {
      // Opções Mongoose (geralmente não são mais necessárias nas versões recentes)
    };

    // Adiciona opções SSL apenas em produção (ou se DB_SSL=true)
    if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
      if (fs.existsSync(caPath)) {
        options.tls = true;
        options.tlsCAFile = caPath;
        logger.info('🔐 Usando certificado CA para conexão MongoDB SSL.');
      } else {
        logger.warn(`⚠️ Certificado CA SSL não encontrado em ${caPath}. Conectando sem verificação (NÃO SEGURO PARA PRODUÇÃO REAL).`);
        // Fallback inseguro - EVITAR EM PRODUÇÃO REAL se possível
        options.tls = true;
        options.tlsInsecure = true; // Equivalente a rejectUnauthorized: false
      }
    } else {
      logger.info('SSL para MongoDB desativado (ambiente não-produção ou DB_SSL não definido como true).');
    }

    // Tenta conectar usando a URI e as opções
    await mongoose.connect(config.mongoUri, options);
    logger.info('🔌 Conexão com MongoDB estabelecida.');

    // --- Adicionar esta configuração global APÓS conectar ---
    mongoose.set('toJSON', {
        virtuals: true, // Inclui virtuais (campos calculados) se definidos no schema
        transform: (doc, ret) => {
            // 'ret' é o objeto simples que será enviado como JSON
            ret.id = ret._id; // Copia o valor de _id para um novo campo id
            delete ret._id;   // Remove o campo _id original
            delete ret.__v;   // Remove o campo de versão __v do Mongoose
        }
    });

    mongoose.set('toObject', { // Opcional: Aplicar a mesma transformação para .toObject()
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    });
    logger.info('⚙️ Mapeamento global Mongoose _id -> id configurado.');
    // ---------------------------------------------------------

  } catch (err) {
    // Loga o erro e encerra a aplicação se a conexão inicial falhar
    logger.error('❌ Erro ao conectar com MongoDB:', err.message);
    process.exit(1); // Sai com código de erro
  }
};

module.exports = connectDB; // Exporta a função de conexão
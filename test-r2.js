// test-r2.js
require('dotenv').config(); // Carrega as variáveis do .env
const { S3Client, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Carrega a configuração do R2 do ambiente
const config = {
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
};

// Verifica se a configuração está presente
const isConfigValid = config.endpoint && config.accessKeyId && config.secretAccessKey && config.bucketName;

if (!isConfigValid) {
  console.error('ERRO: As variáveis de ambiente do R2 (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) não estão definidas no .env');
  process.exit(1);
}

// Configura o cliente S3
const s3Client = new S3Client({
  region: 'auto', // R2 geralmente usa 'auto'
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

async function testR2Connection() {
  console.log(`Tentando conectar ao R2 Endpoint: ${config.endpoint}`);
  console.log(`Usando Bucket: ${config.bucketName}`);

  try {
    // Teste 1: Listar Buckets (Verifica Autenticação e Conectividade Básica)
    // Nota: O token de API que criamos pode não ter permissão para ListBuckets na conta toda.
    // Se este comando falhar com 'Access Denied', mas o upload funcionar, está tudo bem.
    try {
        console.log('\n--- Teste 1: Listando Buckets (pode falhar com Access Denied) ---');
        const listBucketsData = await s3Client.send(new ListBucketsCommand({}));
        console.log('Sucesso ao listar buckets! (Verifica autenticação geral)');
        // console.log('Buckets:', listBucketsData.Buckets); // Descomente para ver a lista se tiver permissão
    } catch(listErr) {
        if (listErr.name === 'AccessDenied') {
             console.warn('Aviso: Não foi possível listar buckets (AccessDenied) - Isso é esperado se o token API não tiver permissão global. Verificando o upload...');
        } else {
            console.error('Erro inesperado ao listar buckets:', listErr);
            throw listErr; // Relança outros erros
        }
    }


    // Teste 2: Fazer Upload de um Pequeno Arquivo de Teste
    console.log('\n--- Teste 2: Fazendo Upload de um arquivo de teste ---');
    const testFileName = `test-upload-${Date.now()}.txt`;
    const testFileContent = 'Este é um teste de conexão com o R2!';
    const testFilePath = path.join(__dirname, testFileName); // Cria o arquivo localmente

    // Cria o arquivo de teste localmente
    fs.writeFileSync(testFilePath, testFileContent);
    console.log(`Arquivo de teste local criado: ${testFilePath}`);

    // Prepara os parâmetros do upload
    const uploadParams = {
      Bucket: config.bucketName,
      Key: testFileName, // Nome do arquivo no R2
      Body: fs.createReadStream(testFilePath), // Lê o arquivo local
      ContentType: 'text/plain',
    };

    // Envia o comando de upload
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log(`SUCESSO! Arquivo "${testFileName}" enviado para o bucket "${config.bucketName}".`);

    // Limpa o arquivo de teste local
    fs.unlinkSync(testFilePath);
    console.log(`Arquivo de teste local removido: ${testFilePath}`);

    console.log('\n--- Conexão com R2 parece OK! ---');
    console.log('Verifique o bucket no painel Cloudflare para confirmar o upload.');

  } catch (error) {
    console.error('\n--- FALHA NO TESTE DE CONEXÃO R2 ---');
    console.error('Erro:', error.name, '-', error.message);
    if (error.Code === 'InvalidAccessKeyId' || error.Code === 'SignatureDoesNotMatch' || error.$metadata?.httpStatusCode === 403) {
      console.error('Causa provável: Credenciais (Access Key ID ou Secret Access Key) incorretas ou inválidas.');
    } else if (error.$metadata?.httpStatusCode === 404 && error.message.includes('Bucket not found')) {
        console.error(`Causa provável: Nome do Bucket ("${config.bucketName}") incorreto ou não existe.`);
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
        console.error(`Causa provável: Endpoint ("${config.endpoint}") incorreto ou inacessível.`);
    } else {
        console.error('Detalhes adicionais:', error);
    }
  }
}

// Executa a função de teste
testR2Connection();
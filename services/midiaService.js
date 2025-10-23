// services/mediaService.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config/config'); // Importa nossa configuração
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs'); // Ainda precisamos do 'fs' para ler o arquivo temporário do multer

// Verifica se as credenciais estão presentes (essencial para produção)
const isConfigValid = config.storage.endpoint && 
                      config.storage.accessKeyId && 
                      config.storage.secretAccessKey && 
                      config.storage.bucketName &&
                      config.storage.publicUrl;

let s3Client;
let r2StatusMessage = ''; // Variável para guardar a mensagem de status

// --- BLOCO ATUALIZADO PARA LOG MAIS CLARO ---
if (isConfigValid) {
  try {
    // Configura o cliente S3 para apontar para o endpoint do R2
    s3Client = new S3Client({
      region: 'auto', // R2 geralmente usa 'auto'
      endpoint: config.storage.endpoint,
      credentials: {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      },
    });
    // Log de sucesso explícito
    r2StatusMessage = 'SUCESSO: Conexão com Cloudflare R2 configurada.'; 
    console.log(`[MediaService] ${r2StatusMessage}`); 
    // Poderíamos adicionar um comando simples aqui para testar a conexão real, 
    // como ListBuckets, mas isso pode falhar devido a permissões e adiciona latência.
    // Por enquanto, confiar na configuração é suficiente para o log inicial.

  } catch (error) {
      // Captura erros durante a inicialização do S3Client (raro, mas possível)
      r2StatusMessage = `FALHA: Erro ao inicializar o cliente R2/S3: ${error.message}`;
      console.error(`[MediaService] ${r2StatusMessage}`, error);
      s3Client = null; // Garante que o cliente não será usado se falhar na inicialização
  }
} else {
  // Log de falha explícito por falta de configuração
  r2StatusMessage = 'FALHA: Configuração do Cloudflare R2 (variáveis de ambiente) incompleta. Uploads não funcionarão.';
  console.warn(`[MediaService] ${r2StatusMessage}`);
  s3Client = null; // Garante que não será usado
}
// --- FIM DO BLOCO ATUALIZADO ---


class MediaService {
    // ... (resto da classe MediaService permanece o mesmo) ...

    constructor() {
        // A URL base agora vem da configuração
        this.baseUrl = config.storage.publicUrl; 
        if (this.baseUrl && !this.baseUrl.endsWith('/')) {
            this.baseUrl += '/'; // Garante que a URL termine com '/'
        }
    }

    /**
     * Salva um ficheiro carregado no R2.
     * @param {object} fileObject - O objeto do ficheiro fornecido pelo multer (req.file).
     * @returns {Promise<object>} - Uma promessa que resolve para um objeto com o caminho relativo (URL).
     * @throws {Error} - Lança um erro se o upload falhar.
     */
    async saveImage(fileObject) {
        // Verifica se o cliente foi inicializado com sucesso antes de tentar usar
        if (!s3Client) { 
            throw new Error('Serviço de armazenamento (R2) não está configurado ou falhou na inicialização.');
        }
        if (!fileObject || !fileObject.path) {
            throw new Error('Objeto de ficheiro inválido fornecido ao MediaService.');
        }

        // Gera um nome de arquivo único
        const filename = `${uuidv4()}${path.extname(fileObject.originalname)}`;
        
        try {
            // Lê o arquivo que o multer salvou temporariamente
            const fileStream = fs.createReadStream(fileObject.path);

            const uploadParams = {
                Bucket: config.storage.bucketName,
                Key: filename, // O nome do arquivo no R2
                Body: fileStream,
                ContentType: fileObject.mimetype // Define o tipo de conteúdo (importante)
            };

            // Envia o comando de upload
            await s3Client.send(new PutObjectCommand(uploadParams));

            // Constrói a URL pública completa
            const publicUrl = `${this.baseUrl}${filename}`;
            
            console.log(`[MediaService] Ficheiro salvo no R2. URL: ${publicUrl}`);

            // Apaga o arquivo temporário salvo pelo multer
            try {
                await fs.promises.unlink(fileObject.path);
            } catch (unlinkErr) {
                console.warn(`[MediaService] Falha ao apagar arquivo temporário: ${fileObject.path}`, unlinkErr);
            }

            // Retorna o caminho (URL completa) que será salvo no banco de dados
            return {
                path: publicUrl,
                filename: filename 
            };

        } catch (uploadError) {
            console.error(`[MediaService] Erro ao fazer upload para o R2:`, uploadError);
            
            // Tenta apagar o arquivo temporário mesmo em caso de falha no upload
            try {
                await fs.promises.unlink(fileObject.path);
            } catch (unlinkErr) {
                // ignora
            }
            
            throw new Error('Erro ao salvar a imagem no serviço de armazenamento.');
        }
    }

    /**
     * Apaga um ficheiro do R2 com base na sua URL pública.
     * @param {string} publicUrl - A URL completa da imagem (ex: https://pub-xxx.r2.dev/nome.jpg).
     * @returns {Promise<void>}
     */
    async deleteImage(publicUrl) {
         // Verifica se o cliente foi inicializado com sucesso
        if (!s3Client || !publicUrl) return; 

        // Extrai o nome do arquivo (Key) da URL
        let filename;
        try {
            // Garante que estamos usando a URL base correta
            if (publicUrl.startsWith(this.baseUrl)) {
                 filename = publicUrl.substring(this.baseUrl.length);
            } else {
                 // Fallback se a URL no DB for antiga ou diferente
                 filename = path.basename(new URL(publicUrl).pathname);
            }
           
            if (!filename) throw new Error('Nome de arquivo inválido.');

        } catch (err) {
            console.error(`[MediaService] URL de imagem inválida para exclusão: ${publicUrl}`, err);
            return;
        }


        try {
            const deleteParams = {
                Bucket: config.storage.bucketName,
                Key: filename,
            };

            await s3Client.send(new DeleteObjectCommand(deleteParams));
            console.log(`[MediaService] Ficheiro apagado do R2: ${filename}`);
        } catch (err) {
            // Não lança erro se o arquivo já não existir
            if (err.name !== 'NoSuchKey') {
                console.error(`[MediaService] Erro ao apagar o ficheiro ${filename} do R2:`, err);
            }
        }
    }
}

// Exporta uma instância única (singleton) do serviço
module.exports = new MediaService();

// Exporta a mensagem de status para ser usada em outro lugar, se necessário
module.exports.r2StatusMessage = r2StatusMessage;
// middlewares/uploadMiddleware.js
const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const crypto = require('crypto');
const logger = require('../config/logger');
const path = require('path'); // <<< Garanta que o path está importado >>>


// Configuração do cliente S3 (para R2)
let s3Client;
let upload; // <<< Declara a variável upload aqui fora >>>
let deleteFileFromR2; // <<< Declara a variável deleteFileFromR2 aqui fora >>>

try {
    console.log('[UploadMiddleware] Tentando configurar S3Client...'); // <<< LOG 1 >>>
    logger.info('[UploadMiddleware] Tentando configurar S3Client...');
    s3Client = new S3Client({
        endpoint: process.env.R2_ENDPOINT,
        region: 'auto',
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
    console.log('[UploadMiddleware] S3Client CONFIGURADO com sucesso.'); // <<< LOG 2 >>>
    logger.info('[UploadMiddleware] Cliente S3/R2 configurado com sucesso.');

    // Configuração do Multer-S3
    console.log('[UploadMiddleware] Tentando configurar Multer...'); // <<< LOG 3 >>>
    logger.info('[UploadMiddleware] Tentando configurar Multer...');
    upload = multer({ // <<< Atribui à variável declarada fora >>>
        storage: multerS3({
            s3: s3Client,
            bucket: process.env.R2_BUCKET_NAME,
            acl: 'public-read',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: function (req, file, cb) {
                const folderName = process.env.R2_FOLDER_NAME || 'inmidia-uploads-sistema';
                crypto.randomBytes(16, (err, buf) => {
                    if (err) {
                        logger.error('[UploadMiddleware] Erro ao gerar bytes aleatórios para key:', err);
                        return cb(err);
                    }
                    const filename = buf.toString('hex') + path.extname(file.originalname);
                    const fileKey = `${folderName}/${filename}`;
                    logger.debug(`[UploadMiddleware] Gerada key para R2: ${fileKey}`);
                    cb(null, fileKey);
                });
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                logger.warn(`[UploadMiddleware] Tipo de ficheiro inválido rejeitado: ${file.mimetype}`);
                cb(new Error('Tipo de ficheiro inválido. Apenas imagens são permitidas.'), false);
            }
        }
    });
    console.log('[UploadMiddleware] Multer CONFIGURADO com sucesso. Tipo de upload:', typeof upload); // <<< LOG 4 >>>
    logger.info('[UploadMiddleware] Multer configurado com sucesso.');

    /**
     * Apaga um ficheiro do bucket R2/S3.
     * @param {string} fileKey - A key completa do ficheiro (incluindo pasta, se houver).
     */
    deleteFileFromR2 = async (fileKey) => { // <<< Atribui à variável declarada fora >>>
        if (!fileKey) {
            logger.warn('[UploadMiddleware-delete] Tentativa de apagar ficheiro com key vazia.');
            return;
        }
        if (!s3Client) { // Verifica se o cliente S3 foi inicializado
             logger.error('[UploadMiddleware-delete] Cliente S3 não inicializado. Não é possível apagar.');
             throw new Error('Cliente S3 não inicializado.');
        }
        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
        });

        try {
            logger.info(`[UploadMiddleware-delete] Tentando apagar ficheiro do R2: ${fileKey}`);
            await s3Client.send(command);
            logger.info(`[UploadMiddleware-delete] Ficheiro ${fileKey} apagado com sucesso do R2.`);
        } catch (error) {
            logger.error(`[UploadMiddleware-delete] Erro ao apagar ficheiro ${fileKey} do R2:`, error);
            // Decide se relança o erro ou apenas regista
            // throw error; // Descomente se quiser que a falha ao apagar cause erro na operação principal
        }
    };
    console.log('[UploadMiddleware] Função deleteFileFromR2 DEFINIDA.'); // <<< LOG 5 >>>
    logger.info('[UploadMiddleware] Função deleteFileFromR2 definida.');


} catch (error) {
    // Captura erros durante a inicialização do S3Client ou Multer
    console.error('[UploadMiddleware] ERRO CRÍTICO DURANTE A CONFIGURAÇÃO:', error); // <<< LOG DE ERRO >>>
    logger.error('[UploadMiddleware] ERRO CRÍTICO DURANTE A CONFIGURAÇÃO:', error);
    // Mesmo que haja erro, exporta as variáveis (que podem ser undefined)
    // para que o erro 'reading single' apareça onde é usado, em vez de um erro de importação.
}

// Exporta o 'upload' configurado e a função de apagar
console.log('[UploadMiddleware] Exportando: upload é do tipo', typeof upload, 'deleteFileFromR2 é do tipo', typeof deleteFileFromR2); // <<< LOG 6 >>>
logger.info(`[UploadMiddleware] Exportando: upload (tipo ${typeof upload}), deleteFileFromR2 (tipo ${typeof deleteFileFromR2})`);
module.exports = { upload, deleteFileFromR2 };
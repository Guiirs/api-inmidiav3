// middlewares/uploadMiddleware.js
const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const crypto = require('crypto');
const logger = require('../config/logger');
const path = require('path'); 

// Configuração do cliente S3 (para R2)
let s3Client = null;
let upload = null; // Inicializa com null
let deleteFileFromR2 = null; // Inicializa com null

// 1. Verifica se as variáveis de ambiente necessárias estão presentes
const isR2ConfigComplete = process.env.R2_ENDPOINT && 
                           process.env.R2_ACCESS_KEY_ID && 
                           process.env.R2_SECRET_ACCESS_KEY && 
                           process.env.R2_BUCKET_NAME;

if (isR2ConfigComplete) {
    try {
        logger.info('[UploadMiddleware] Tentando configurar S3Client...'); 
        s3Client = new S3Client({
            endpoint: process.env.R2_ENDPOINT,
            region: 'auto',
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });
        logger.info('[UploadMiddleware] Cliente S3/R2 configurado com sucesso.');

        // Configuração do Multer-S3
        logger.info('[UploadMiddleware] Tentando configurar Multer...'); 
        upload = multer({ 
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
        logger.info('[UploadMiddleware] Multer configurado com sucesso.');

        /**
         * Apaga um ficheiro do bucket R2/S3.
         * @param {string} fileKey - A key completa do ficheiro (incluindo pasta, se houver).
         */
        deleteFileFromR2 = async (fileKey) => { 
             if (!fileKey) {
                 logger.warn('[UploadMiddleware-delete] Tentativa de apagar ficheiro com key vazia.');
                 return;
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
                 throw error; 
             }
        };
    } catch (error) {
        // 2. Em caso de ERRO de configuração (o que está a acontecer)
        logger.error('[UploadMiddleware] ERRO CRÍTICO DURANTE A CONFIGURAÇÃO. Forçando Falha Segura:', error); 
        
        // Atribui uma função stub (simulada) para 'upload' para que a rota possa iniciar
        upload = { 
            single: (fieldName) => (req, res, next) => {
                logger.error(`[UploadMiddleware-FAILSAFE] Upload de ${fieldName} abortado. Serviço indisponível.`);
                req.file = null; // Garante que req.file é nulo
                // Não lança erro fatal aqui, apenas registra e continua o fluxo sem o arquivo.
                next(); 
            },
        };
         deleteFileFromR2 = async (fileKey) => {
             logger.warn(`[UploadMiddleware-FAILSAFE] Tentativa de exclusão do R2 ignorada para ${fileKey}. Serviço não inicializado.`);
             throw new Error('Serviço de exclusão de ficheiros (R2) não inicializado.');
         };
    }
} else {
    // 3. Caso as ENV Vars estejam faltando no início (STUB)
     logger.error('[UploadMiddleware] ERRO CRÍTICO: Variáveis de ambiente R2 incompletas no início. Uploads desativados.');
     upload = { 
         single: (fieldName) => (req, res, next) => {
             logger.warn(`[UploadMiddleware-STUB] Upload de ${fieldName} falhou: Variáveis R2 em falta. Continuando o fluxo...`);
             req.file = null;
             next();
         },
     };
     deleteFileFromR2 = async (fileKey) => {
         logger.warn(`[UploadMiddleware-STUB] Tentativa de exclusão do R2 ignorada para ${fileKey}.`);
         throw new Error('Serviço de exclusão de ficheiros (R2) não inicializado.');
     };
}

// 4. Exporta o 'upload' configurado e a função de apagar
module.exports = { upload, deleteFileFromR2 };
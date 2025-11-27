// @ts-nocheck
import multer from 'multer';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import crypto from 'crypto';
import logger from '../config/logger';
import path from 'path';
import fs from 'fs';

// Configuração do cliente S3 (para R2)
let s3Client: S3Client | null = null;
let upload: any = null;
let deleteFileFromR2: ((fileKey: string) => Promise<void>) | null = null;
let uploadFileToR2: ((localFilePath: string, targetKey: string) => Promise<void>) | null = null;

// Verifica se as variáveis de ambiente necessárias estão presentes
const isR2ConfigComplete =
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME;

if (isR2ConfigComplete) {
  try {
    logger.info('[UploadMiddleware] Tentando configurar S3Client...');
    s3Client = new S3Client({
      endpoint: process.env.R2_ENDPOINT!,
      region: 'auto',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    logger.info('[UploadMiddleware] Cliente S3/R2 configurado com sucesso.');

    // Configuração do Multer-S3
    logger.info('[UploadMiddleware] Tentando configurar Multer...');
    upload = multer({
      storage: multerS3({
        s3: s3Client,
        bucket: process.env.R2_BUCKET_NAME!,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req: any, file: any, cb: any) {
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
      fileFilter: (req: any, file: any, cb: any) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          logger.warn(`[UploadMiddleware] Tipo de ficheiro inválido rejeitado: ${file.mimetype}`);
          cb(new Error('Tipo de ficheiro inválido. Apenas imagens são permitidas.'), false);
        }
      },
    });
    logger.info('[UploadMiddleware] Multer configurado com sucesso.');

    /**
     * Apaga um ficheiro do bucket R2/S3.
     */
    deleteFileFromR2 = async (fileKey: string): Promise<void> => {
      if (!fileKey) {
        logger.warn('[UploadMiddleware-delete] Tentativa de apagar ficheiro com key vazia.');
        return;
      }
      const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileKey,
      });

      try {
        logger.info(`[UploadMiddleware-delete] Tentando apagar ficheiro do R2: ${fileKey}`);
        await s3Client!.send(command);
        logger.info(`[UploadMiddleware-delete] Ficheiro ${fileKey} apagado com sucesso do R2.`);
      } catch (error) {
        logger.error(`[UploadMiddleware-delete] Erro ao apagar ficheiro ${fileKey} do R2:`, error);
        throw error;
      }
    };

    /**
     * Faz upload de um arquivo local para o R2/S3.
     */
    uploadFileToR2 = async (localFilePath: string, targetKey: string): Promise<void> => {
      if (!s3Client) {
        throw new Error('Cliente S3/R2 não inicializado. Verifique as variáveis de ambiente R2.');
      }
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`Arquivo local não encontrado: ${localFilePath}`);
      }

      const fileStream = fs.createReadStream(localFilePath);

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: targetKey,
        Body: fileStream as any,
      });

      try {
        logger.info(`[UploadMiddleware-upload] Iniciando upload de ${localFilePath} para R2 key: ${targetKey}`);
        await s3Client.send(command);
        logger.info(`[UploadMiddleware-upload] Upload de ${targetKey} concluído com sucesso.`);
      } catch (error) {
        logger.error(`[UploadMiddleware-upload] Erro ao fazer upload do arquivo ${targetKey}:`, error);
        throw error;
      }
    };
  } catch (error) {
    logger.error('[UploadMiddleware] ERRO CRÍTICO DURANTE A CONFIGURAÇÃO. Forçando Falha Segura:', error);

    upload = {
      single: (fieldName: string) => (req: any, res: any, next: any) => {
        logger.error(`[UploadMiddleware-FAILSAFE] Upload de ${fieldName} abortado. Serviço indisponível.`);
        req.file = null;
        next();
      },
    };
    deleteFileFromR2 = async (fileKey: string): Promise<void> => {
      logger.warn(`[UploadMiddleware-FAILSAFE] Tentativa de exclusão do R2 ignorada para ${fileKey}. Serviço não inicializado.`);
      throw new Error('Serviço de exclusão de ficheiros (R2) não inicializado.');
    };
    uploadFileToR2 = async (localFilePath: string, targetKey: string): Promise<void> => {
      logger.error(`[UploadMiddleware-FAILSAFE] Tentativa de upload R2 ignorada para ${targetKey}. Serviço não inicializado.`);
      throw new Error('Serviço de upload de ficheiros (R2) não inicializado.');
    };
  }
} else {
  logger.error('[UploadMiddleware] ERRO CRÍTICO: Variáveis de ambiente R2 incompletas no início. Uploads desativados.');
  upload = {
    single: (fieldName: string) => (req: any, res: any, next: any) => {
      logger.warn(`[UploadMiddleware-STUB] Upload de ${fieldName} falhou: Variáveis R2 em falta. Continuando o fluxo...`);
      req.file = null;
      next();
    },
  };
  deleteFileFromR2 = async (fileKey: string): Promise<void> => {
    logger.warn(`[UploadMiddleware-STUB] Tentativa de exclusão do R2 ignorada para ${fileKey}.`);
    throw new Error('Serviço de exclusão de ficheiros (R2) não inicializado.');
  };
  uploadFileToR2 = async (localFilePath: string, targetKey: string): Promise<void> => {
    logger.error(`[UploadMiddleware-STUB] Tentativa de upload R2 ignorada para ${targetKey}. Serviço não inicializado.`);
    throw new Error('Serviço de upload de ficheiros (R2) não inicializado.');
  };
}

export { upload, deleteFileFromR2, uploadFileToR2 };

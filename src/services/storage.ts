// src/services/storage.ts
// @ts-nocheck
import fs from 'fs/promises';
const fsSync = require('fs');
const path = require('path');
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import logger from '../config/logger';

const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

let s3Client: any = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && AWS_REGION) {
  s3Client = new S3Client({ region: AWS_REGION });
}

async function uploadBuffer(buffer: Buffer, key: string, contentType: string = 'application/pdf') {
  if (s3Client && S3_BUCKET) {
    try {
      const cmd = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
      });
      await s3Client.send(cmd);
      const url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
      return { url, key };
    } catch (err: any) {
      logger.error('[Storage] erro ao enviar para S3:', err.message);
      throw err;
    }
  }

  const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'pigen');
  if (!fsSync.existsSync(uploadsDir)) await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, key.replace(/[^a-zA-Z0-9_.-]/g, '_'));
  await fs.writeFile(filePath, buffer);
  return { url: null, key: filePath };
}

async function uploadFilePath(filePath: string, key: string, contentType: string = 'application/pdf') {
  const buffer = await fs.readFile(filePath);
  return uploadBuffer(buffer, key, contentType);
}

export { uploadBuffer, uploadFilePath };


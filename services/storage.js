const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../config/logger');

const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

let s3Client = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && AWS_REGION) {
  s3Client = new S3Client({ region: AWS_REGION });
}

async function uploadBuffer(buffer, key, contentType = 'application/pdf') {
  if (s3Client && S3_BUCKET) {
    try {
      const cmd = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
      });
      await s3Client.send(cmd);
      // Construct URL (public bucket assumed)
      const url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
      return { url, key };
    } catch (err) {
      logger.error('[Storage] erro ao enviar para S3:', err.message);
      throw err;
    }
  }

  // Fallback: save locally under uploads/pigen
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'pigen');
  if (!fsSync.existsSync(uploadsDir)) await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, key.replace(/[^a-zA-Z0-9_.-]/g, '_'));
  await fs.writeFile(filePath, buffer);
  return { url: null, key: filePath };
}

async function uploadFilePath(filePath, key, contentType = 'application/pdf') {
  const buffer = await fs.readFile(filePath);
  return uploadBuffer(buffer, key, contentType);
}

module.exports = { uploadBuffer, uploadFilePath };

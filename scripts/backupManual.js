// scripts/backupManual.js
require('dotenv').config(); // Carrega o .env
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger'); // Reutiliza seu logger existente

// 1. Obter a URI do .env
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    logger.error('[Backup Manual] MONGODB_URI não encontrada. Verifique seu arquivo .env.');
    process.exit(1);
}

// 2. Definir caminhos
const BACKUP_DIR = path.join(__dirname, '..', 'backups'); // Pasta /backups na raiz do projeto
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const localFileName = `bkp_manual_${timestamp}.gz`;
const localFilePath = path.join(BACKUP_DIR, localFileName);

// 3. Garantir que a pasta de backups exista
try {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        logger.info(`[Backup Manual] Pasta de backups local criada em: ${BACKUP_DIR}`);
    }
} catch (err) {
    logger.error(`[Backup Manual] Falha ao criar diretório de backup ${BACKUP_DIR}: ${err.message}`);
    process.exit(1);
}

// 4. Criar o comando mongodump local
// (Removemos "docker exec mongo")
const command = `mongodump --uri="${MONGODB_URI}" --archive --gzip > "${localFilePath}"`;

logger.info('[Backup Manual] Iniciando backup manual...');
logger.debug(`[Backup Manual] Executando: mongodump --uri="***" --archive --gzip > "${localFilePath}"`);

// 5. Executar o comando
exec(command, (error, stdout, stderr) => {
    if (error) {
        logger.error(`[Backup Manual] Falha ao executar mongodump: ${error.message}`);
        logger.error(`[Backup Manual] Stderr: ${stderr}`);
        
        // Verifica se o erro foi porque o mongodump não está instalado/no PATH
        if (stderr.includes('command not found') || stderr.includes('não é reconhecido')) {
             logger.error('------------------------------------------------------------------');
             logger.error('[Backup Manual] ERRO CRÍTICO: `mongodump` não foi encontrado.');
             logger.error('[Backup Manual] Por favor, instale o MongoDB Database Tools e garanta');
             logger.error('[Backup Manual] que ele esteja no PATH do seu sistema.');
             logger.error('------------------------------------------------------------------');
        }
        return;
    }

    if (stderr) {
        // mongodump frequentemente usa stderr para logs de progresso, mesmo em sucesso
        logger.info(`[Backup Manual] Log do mongodump: ${stderr}`);
    }

    logger.info('-------------------------------------------------');
    logger.info(`[Backup Manual] Backup concluído com sucesso!`);
    logger.info(`[Backup Manual] Arquivo salvo em: ${localFilePath}`);
    logger.info('-------------------------------------------------');
});
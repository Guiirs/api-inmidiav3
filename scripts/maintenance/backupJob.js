// scripts/backupJob.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
// Importa a função de upload que acabamos de criar
const { uploadFileToR2 } = require('../middlewares/uploadMiddleware'); 

// --- Configurações do Backup (Baseadas nos seus arquivos) ---

// O nome do DB (de config/config.js e docker-compose.yml)
const DB_NAME = process.env.MONGODB_URI.split('/').pop().split('?')[0] || 'inmidia_dev'; 
// O nome do container (de docker-compose.yml)
const CONTAINER_NAME = 'mongo'; 
// Pasta de backups local (deve estar no .gitignore)
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
// Pasta de destino no R2 (pode ser o que quiser)
const R2_BACKUP_FOLDER = process.env.R2_FOLDER_NAME ? `${process.env.R2_FOLDER_NAME}/db-backups` : 'inmidia-db-backups';

/**
 * Executa o backup completo do MongoDB, compacta, envia para o R2 e limpa o local.
 */
const performBackup = async () => {
    logger.info('[CRON Backup] Iniciando tarefa de backup do MongoDB...');
    
    // 1. Garante que a pasta de backup local exista
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            logger.info(`[CRON Backup] Pasta de backups local criada em: ${BACKUP_DIR}`);
        }
    } catch (err) {
        logger.error(`[CRON Backup] Falha crítica ao criar diretório de backup ${BACKUP_DIR}: ${err.message}`);
        return;
    }

    // 2. Define os nomes dos arquivos
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const localFileName = `bkp_${DB_NAME}_${timestamp}.gz`;
    const localFilePath = path.join(BACKUP_DIR, localFileName);
    const r2FileKey = `${R2_BACKUP_FOLDER}/${localFileName}`;

    // 3. Monta o comando `mongodump`
    // Este comando executa o mongodump DENTRO do container 'mongo' e
    // redireciona (pipe) a saída compactada (stdout) para um arquivo no HOST (localFilePath)
    const command = `docker exec ${CONTAINER_NAME} mongodump --db=${DB_NAME} --archive --gzip`;

    logger.debug(`[CRON Backup] Executando comando: ${command.split(' ')[0]} ... > ${localFilePath}`);

    // 4. Executa o comando
    const child = exec(command, async (error, stdout, stderr) => {
        if (error) {
            logger.error(`[CRON Backup] Falha ao executar mongodump: ${error.message}`);
            logger.error(`[CRON Backup] Stderr: ${stderr}`);
            return;
        }
        
        // O backup é salvo no 'localFilePath' pelo pipe de stdout
        logger.info(`[CRON Backup] Backup local concluído com sucesso: ${localFilePath}`);

        // 5. Faz o Upload para o R2/S3
        try {
            await uploadFileToR2(localFilePath, r2FileKey);
            logger.info(`[CRON Backup] Upload para R2 concluído: ${r2FileKey}`);

            // 6. Limpa o arquivo local APÓS o upload
            fs.unlink(localFilePath, (err) => {
                if (err) {
                    logger.warn(`[CRON Backup] Falha ao limpar arquivo local ${localFilePath}: ${err.message}`);
                } else {
                    logger.info(`[CRON Backup] Arquivo local ${localFilePath} limpo com sucesso.`);
                }
            });

        } catch (uploadError) {
            logger.error(`[CRON Backup] Falha ao fazer upload para R2: ${uploadError.message}`);
            logger.warn(`[CRON Backup] O arquivo local ${localFilePath} NÃO será apagado devido à falha no upload.`);
        }
    });

    // Precisamos capturar o stdout do docker exec e salvá-lo no arquivo
    const fileWriteStream = fs.createWriteStream(localFilePath);
    child.stdout.pipe(fileWriteStream);

    fileWriteStream.on('error', (err) => {
         logger.error(`[CRON Backup] Erro ao escrever o arquivo de backup local: ${err.message}`);
    });
};

module.exports = performBackup;
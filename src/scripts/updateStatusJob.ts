// src/scripts/updateStatusJob.ts
import logger from '../config/logger';
import Placa from '../models/Placa';
import Aluguel from '../models/Aluguel';
import * as PIService from '../services/piService';
import * as PISyncService from '../services/piSyncService';

/**
 * Lógica da tarefa agendada (Cron Job) para atualizar o status das placas E PIs.
 */
const updatePlacaStatusJob = async (): Promise<void> => {
    logger.info('[CRON JOB] Iniciando tarefas agendadas (Placas e PIs)...');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera hora, minuto, segundo, ms para comparar apenas a data

    // --- TAREFA 1: Atualizar Status das Placas (Baseado em Aluguéis) ---
    logger.info('[CRON JOB] Iniciando a verificação de status de ALUGUEIS/PLACAS...');
    try {
        // --- LÓGICA 1: TORNAR PLACAS INDISPONÍVEIS (Aluguel ativo hoje) ---
        const placasComAluguelAtivoIds = await Aluguel.distinct('placa', {
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        }).exec();

        if (placasComAluguelAtivoIds.length > 0) {
            const updateIndisponivelResult = await Placa.updateMany(
                {
                    _id: { $in: placasComAluguelAtivoIds }, 
                    disponivel: true                      
                },
                { $set: { disponivel: false } }
            );
            if (updateIndisponivelResult.modifiedCount > 0) {
                 logger.info(`[CRON JOB] Marcadas ${updateIndisponivelResult.modifiedCount} placas como INDISPONÍVEIS (aluguel iniciado/ativo).`);
            }
        }

        // --- LÓGICA 2: TORNAR PLACAS DISPONÍVEIS (Nenhum aluguel ativo hoje) ---
        const placasIndisponiveisIds = await Placa.distinct('_id', {
            disponivel: false
        });

        if (placasIndisponiveisIds.length > 0) {
            const placasIndisponiveisAindaAtivasIds = await Aluguel.distinct('placa', {
                placa: { $in: placasIndisponiveisIds }, 
                data_inicio: { $lte: hoje },
                data_fim: { $gte: hoje }
            }).exec();

            const placasParaDisponibilizarIds = placasIndisponiveisIds.filter(id =>
                !placasIndisponiveisAindaAtivasIds.some((activeId: any) => activeId.equals(id))
            );

            if (placasParaDisponibilizarIds.length > 0) {
                 const updateDisponivelResult = await Placa.updateMany(
                    { _id: { $in: placasParaDisponibilizarIds } },
                    { $set: { disponivel: true } }
                );
                 if (updateDisponivelResult.modifiedCount > 0) {
                     logger.info(`[CRON JOB] Marcadas ${updateDisponivelResult.modifiedCount} placas como DISPONÍVEIS (nenhum aluguel ativo).`);
                 }
            }
        } else {
            logger.info('[CRON JOB] Nenhuma placa indisponível encontrada para verificar.');
        }

        logger.info('[CRON JOB] Verificação de status (PLACAS) concluída.');

    } catch (error: any) {
        logger.error(`[CRON JOB] Erro ao executar a tarefa de atualização de status (PLACAS): ${error.message}`, error);
    }
    
    // --- [MELHORIA] TAREFA 2: Atualizar Status de PIs Vencidas ---
    logger.info('[CRON JOB] Iniciando a verificação de status de PIs (Propostas Internas)...');
    try {
        // Chama o método estático que criamos no PIService
        const piServiceAny = PIService as any;
        if (piServiceAny.updateVencidas) {
            await piServiceAny.updateVencidas(); 
        }
        logger.info('[CRON JOB] Verificação de status (PIs) concluída.');
    } catch (error: any) {
         logger.error(`[CRON JOB] Erro ao executar a tarefa de atualização de status (PIs): ${error.message}`, error);
    }

    // --- [NOVO] TAREFA 3: Validar e Sincronizar PIs com Aluguéis ---
    logger.info('[CRON JOB] Iniciando validação e sincronização PI ↔ Aluguéis...');
    try {
        const piSyncServiceAny = PISyncService as any;
        if (piSyncServiceAny.syncPIsWithAlugueis && piSyncServiceAny.cleanOrphanAlugueis) {
            await piSyncServiceAny.syncPIsWithAlugueis();
            await piSyncServiceAny.cleanOrphanAlugueis();
        }
        logger.info('[CRON JOB] Validação e sincronização (PI ↔ Aluguéis) concluída.');
    } catch (error: any) {
        logger.error(`[CRON JOB] Erro ao executar validação PI ↔ Aluguéis: ${error.message}`, error);
    }
};

/**
 * Inicia os cron jobs no servidor
 */
const iniciarCronJobs = (): void => {
    // Executa imediatamente na inicialização
    updatePlacaStatusJob();

    // Configura para executar a cada 10 minutos
    const INTERVALO_10_MIN = 10 * 60 * 1000; // 10 minutos em milissegundos
    
    setInterval(async () => {
        logger.info('[CRON JOB] ⏰ Executando verificação agendada (a cada 10 minutos)...');
        await updatePlacaStatusJob();
    }, INTERVALO_10_MIN);

    logger.info(`[CRON JOB] ✅ Cron jobs configurados! Próxima execução em 10 minutos.`);

    // [NOVO] Agenda relatórios diários do WhatsApp
    if (process.env.WHATSAPP_ENABLED === 'true') {
        try {
            const { scheduleWhatsAppReports } = require('./whatsappDailyReport');
            scheduleWhatsAppReports();
            logger.info('[CRON JOB] ✅ WhatsApp daily reports scheduled');
        } catch (error: any) {
            logger.warn(`[CRON JOB] Erro ao agendar relatórios WhatsApp: ${error.message}`);
        }
    } else {
        logger.info('[CRON JOB] WhatsApp desabilitado (WHATSAPP_ENABLED não está como true)');
    }
};

export default iniciarCronJobs;

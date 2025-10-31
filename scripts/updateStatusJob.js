// scripts/updateStatusJob.js
const logger = require('../config/logger'); // Logger existente
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Aluguel = require('../models/Aluguel'); // Modelo Aluguel Mongoose

// [MELHORIA] Importa o PIService para a nova verificação de status
const PIService = require('../services/piService'); 

/**
 * Lógica da tarefa agendada (Cron Job) para atualizar o status das placas E PIs.
 */
const updatePlacaStatusJob = async () => {
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
                !placasIndisponiveisAindaAtivasIds.some(activeId => activeId.equals(id))
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

    } catch (error) {
        logger.error(`[CRON JOB] Erro ao executar a tarefa de atualização de status (PLACAS): ${error.message}`, error);
    }
    
    // --- [MELHORIA] TAREFA 2: Atualizar Status de PIs Vencidas ---
    logger.info('[CRON JOB] Iniciando a verificação de status de PIs (Propostas Internas)...');
    try {
        // Chama o método estático que criamos no PIService
        await PIService.updateVencidas(); 
        logger.info('[CRON JOB] Verificação de status (PIs) concluída.');
    } catch (error) {
         logger.error(`[CRON JOB] Erro ao executar a tarefa de atualização de status (PIs): ${error.message}`, error);
    }
};

module.exports = updatePlacaStatusJob;
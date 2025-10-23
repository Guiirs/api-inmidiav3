// scripts/updateStatusJob.js
const logger = require('../config/logger'); //

/**
 * Lógica da tarefa agendada (Cron Job) para atualizar o status das placas.
 * @param {object} db - A instância do Knex (base de dados).
 */
const updatePlacaStatusJob = async (db) => {
    logger.info('[CRON JOB] Iniciando a verificação de status de alugueis...');
    const hoje = new Date().toISOString().split('T')[0]; // Data de hoje, ex: '2025-10-20'

    try {
        // --- LÓGICA 1: TORNAR PLACAS INDISPONÍVEIS (Aluguel começou hoje) ---
        
        // 1. Encontra todas as placas que deveriam estar 'disponivel: true'
        //    mas que têm um aluguel que começa ou está ativo hoje.
        const placasParaIndisponibilizar = await db('placas')
            .select('placas.id')
            .join('alugueis', 'placas.id', 'alugueis.placa_id')
            .where('placas.disponivel', true) // Que estão marcadas como disponíveis
            .andWhere('alugueis.data_inicio', '<=', hoje) // Cujo aluguel começou
            .andWhere('alugueis.data_fim', '>=', hoje)   // E ainda não terminou
            .distinct('placas.id');
        
        if (placasParaIndisponibilizar.length > 0) {
            const ids = placasParaIndisponibilizar.map(p => p.id);
            logger.info(`[CRON JOB] Marcando ${ids.length} placas como INDISPONÍVEIS (aluguel iniciado). IDs: ${ids.join(', ')}`);
            await db('placas').whereIn('id', ids).update({ disponivel: false });
        }

        // --- LÓGICA 2: TORNAR PLACAS DISPONÍVEIS (Aluguel terminou) ---

        // 1. Encontra todas as placas que estão 'disponivel: false'
        const placasIndisponiveis = await db('placas')
            .select('id')
            .where('disponivel', false);
        
        if (placasIndisponiveis.length === 0) {
            logger.info('[CRON JOB] Nenhuma placa indisponível encontrada. Encerrando.');
            return;
        }

        const placasIndisponiveisIds = placasIndisponiveis.map(p => p.id);

        // 2. Dessas placas, descobre quais ainda têm alugueis ativos ou futuros
        const placasAindaReservadas = await db('alugueis')
            .whereIn('placa_id', placasIndisponiveisIds)
            .andWhere('data_fim', '>=', hoje) // Que terminam hoje ou no futuro
            .distinct('placa_id');
        
        const placasAindaReservadasIds = new Set(placasAindaReservadas.map(p => p.placa_id));

        // 3. Determina quais placas devem voltar a ser 'disponiveis: true'
        const placasParaDisponibilizarIds = placasIndisponiveisIds.filter(id => 
            !placasAindaReservadasIds.has(id)
        );

        if (placasParaDisponibilizarIds.length > 0) {
            logger.info(`[CRON JOB] Marcando ${placasParaDisponibilizarIds.length} placas como DISPONÍVEIS (alugueis expirados). IDs: ${placasParaDisponibilizarIds.join(', ')}`);
            await db('placas').whereIn('id', placasParaDisponibilizarIds).update({ disponivel: true });
        }

        logger.info('[CRON JOB] Verificação de status concluída.');

    } catch (error) {
        logger.error(`[CRON JOB] Erro ao executar a tarefa de atualização de status: ${error.message}`);
    }
};

module.exports = updatePlacaStatusJob;
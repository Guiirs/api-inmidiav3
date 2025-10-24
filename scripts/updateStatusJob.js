// scripts/updateStatusJob.js
const logger = require('../config/logger'); // Logger existente
const Placa = require('../models/Placa'); // Modelo Placa Mongoose
const Aluguel = require('../models/Aluguel'); // Modelo Aluguel Mongoose
const mongoose = require('mongoose'); // Necessário para ObjectId, se aplicável (não diretamente aqui)

/**
 * Lógica da tarefa agendada (Cron Job) para atualizar o status das placas com Mongoose.
 * @param {object} db - Parâmetro 'db' não é mais necessário. Removido.
 */
const updatePlacaStatusJob = async () => {
    logger.info('[CRON JOB - Mongoose] Iniciando a verificação de status de alugueis...');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera hora, minuto, segundo, ms para comparar apenas a data

    try {
        // --- LÓGICA 1: TORNAR PLACAS INDISPONÍVEIS (Aluguel ativo hoje) ---

        // 1. Encontra IDs de placas que têm um aluguel ativo hoje
        const placasComAluguelAtivoIds = await Aluguel.distinct('placa', {
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        }).exec();

        // 2. Marca essas placas como indisponíveis (disponivel: false),
        //    mas *apenas* se elas estiverem atualmente marcadas como disponíveis.
        if (placasComAluguelAtivoIds.length > 0) {
            const updateIndisponivelResult = await Placa.updateMany(
                {
                    _id: { $in: placasComAluguelAtivoIds }, // Placas com aluguel ativo
                    disponivel: true                      // Que ainda estão marcadas como disponíveis
                },
                { $set: { disponivel: false } }
            );
            if (updateIndisponivelResult.modifiedCount > 0) {
                 logger.info(`[CRON JOB - Mongoose] Marcadas ${updateIndisponivelResult.modifiedCount} placas como INDISPONÍVEIS (aluguel iniciado/ativo).`);
            }
        }

        // --- LÓGICA 2: TORNAR PLACAS DISPONÍVEIS (Nenhum aluguel ativo hoje) ---

        // 1. Encontra IDs de todas as placas que estão atualmente indisponíveis
        const placasIndisponiveisIds = await Placa.distinct('_id', {
            disponivel: false
        });

        if (placasIndisponiveisIds.length === 0) {
            logger.info('[CRON JOB - Mongoose] Nenhuma placa indisponível encontrada para verificar.');
             logger.info('[CRON JOB - Mongoose] Verificação de status concluída.');
            return; // Sai se não houver placas indisponíveis
        }

        // 2. Dentre as indisponíveis, encontra os IDs daquelas que AINDA TÊM aluguel ativo hoje
        //    (Reutiliza a lógica do passo 1, mas filtrando apenas pelas indisponíveis)
        const placasIndisponiveisAindaAtivasIds = await Aluguel.distinct('placa', {
            placa: { $in: placasIndisponiveisIds }, // Apenas entre as indisponíveis
            data_inicio: { $lte: hoje },
            data_fim: { $gte: hoje }
        }).exec();

        // 3. Determina quais placas indisponíveis NÃO estão na lista de ativas (devem voltar a ser disponíveis)
        const placasParaDisponibilizarIds = placasIndisponiveisIds.filter(id =>
            !placasIndisponiveisAindaAtivasIds.some(activeId => activeId.equals(id)) // Compara ObjectIds corretamente
        );

        // 4. Marca essas placas como disponíveis (disponivel: true)
        if (placasParaDisponibilizarIds.length > 0) {
             const updateDisponivelResult = await Placa.updateMany(
                { _id: { $in: placasParaDisponibilizarIds } },
                { $set: { disponivel: true } }
            );
             if (updateDisponivelResult.modifiedCount > 0) {
                 logger.info(`[CRON JOB - Mongoose] Marcadas ${updateDisponivelResult.modifiedCount} placas como DISPONÍVEIS (nenhum aluguel ativo).`);
             }
        }

        logger.info('[CRON JOB - Mongoose] Verificação de status concluída.');

    } catch (error) {
        logger.error(`[CRON JOB - Mongoose] Erro ao executar a tarefa de atualização de status: ${error.message}`, error);
    }
};

module.exports = updatePlacaStatusJob;
// services/aluguelService.js
const mongoose = require('mongoose'); // Necessário para transações e ObjectId
const Aluguel = require('../models/Aluguel'); // Modelo Aluguel Mongoose
const Placa = require('../models/Placa');     // Modelo Placa Mongoose
const Cliente = require('../models/Cliente'); // Modelo Cliente (para populate)
const logger = require('../config/logger'); // Importa o logger

class AluguelService {
    constructor() {}

    /**
     * Obtém todos os alugueis para uma placa específica, retornando objetos simples.
     * @param {string} placa_id - ObjectId da placa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com os dados dos alugueis (populados com cliente).
     * @throws {Error} - Lança erro com status 500 em caso de falha na DB.
     */
    async getAlugueisByPlaca(placa_id, empresa_id) {
        logger.info(`[AluguelService] Buscando alugueis para placa ${placa_id} na empresa ${empresa_id}.`);
        try {
            const alugueis = await Aluguel.find({ placa: placa_id, empresa: empresa_id })
                                          .populate('cliente', 'nome logo_url') // Popula dados do cliente
                                          .sort({ data_inicio: -1 }) // Ordena pelos mais recentes primeiro
                                          .lean() // Retorna objetos simples
                                          .exec();
            logger.info(`[AluguelService] Encontrados ${alugueis.length} alugueis para placa ${placa_id}.`);
            return alugueis;
        } catch (error) {
            logger.error(`[AluguelService] Erro Mongoose/DB ao buscar alugueis por placa: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao buscar histórico de alugueis: ${error.message}`);
            serviceError.status = 500;
            throw serviceError;
        }
    }

    /**
     * Cria um novo aluguel (reserva) para uma placa, usando transação.
     * @param {object} aluguelData - Dados do aluguel (placa_id, cliente_id, data_inicio, data_fim).
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento do novo aluguel criado.
     * @throws {Error} - Lança erro com status 400, 409 ou 500.
     */
    async createAluguel(aluguelData, empresa_id) {
        logger.info(`[AluguelService] Tentando criar aluguel para empresa ${empresa_id}.`);
        logger.debug(`[AluguelService] Dados recebidos: ${JSON.stringify(aluguelData)}`);
        const { placa_id, cliente_id, data_inicio, data_fim } = aluguelData;

        // Validação das datas
        let inicioDate, fimDate;
        try {
            inicioDate = new Date(data_inicio);
            fimDate = new Date(data_fim);
            // Verifica se as datas são válidas após a conversão
            if (isNaN(inicioDate.getTime()) || isNaN(fimDate.getTime())) {
                throw new Error('Formato de data inválido.');
            }
        } catch (dateError) {
            const error = new Error(`Datas inválidas fornecidas: ${dateError.message}`);
            error.status = 400;
            logger.warn(`[AluguelService] Falha ao criar aluguel: ${error.message}`);
            throw error;
        }

        if (fimDate <= inicioDate) {
            const error = new Error('A data final deve ser posterior à data inicial.');
            error.status = 400;
            logger.warn(`[AluguelService] Falha ao criar aluguel: ${error.message}`);
            throw error;
        }

        const session = await mongoose.startSession();
        logger.debug('[AluguelService] Iniciando transação Mongoose para criar aluguel.');
        session.startTransaction();

        try {
            // Verifica conflitos de datas DENTRO da transação para maior consistência
            logger.debug(`[AluguelService] Verificando conflitos de datas para placa ${placa_id} no período ${data_inicio} a ${data_fim}.`);
            const conflictingAluguel = await Aluguel.findOne({
                placa: placa_id,
                empresa: empresa_id,
                $or: [ // Verifica sobreposição
                    { data_inicio: { $lt: fimDate }, data_fim: { $gt: inicioDate } }
                ]
            }).lean().session(session).exec(); // Executa dentro da sessão

            if (conflictingAluguel) {
                const error = new Error(`Esta placa (ID: ${placa_id}) já está reservada total ou parcialmente no período solicitado.`);
                error.status = 409; // Conflict
                logger.warn(`[AluguelService] Falha ao criar aluguel: ${error.message}`);
                throw error; // Abortará a transação
            }
            logger.debug(`[AluguelService] Nenhum conflito de datas encontrado.`);

            // Cria o aluguel
            logger.debug(`[AluguelService] Tentando salvar novo aluguel no DB.`);
            const [novoAluguelDoc] = await Aluguel.create([{
                placa: placa_id, cliente: cliente_id, data_inicio: inicioDate,
                data_fim: fimDate, empresa: empresa_id
            }], { session });
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} criado na transação.`);


            // Verifica se está ativo hoje para atualizar a placa
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            const isAtivoHoje = (inicioDate <= hoje && fimDate >= hoje);

            if (isAtivoHoje) {
                logger.debug(`[AluguelService] Aluguel ${novoAluguelDoc._id} está ativo hoje. Atualizando placa ${placa_id} para indisponível.`);
                const placaUpdateResult = await Placa.updateOne(
                    { _id: placa_id, empresa: empresa_id },
                    { $set: { disponivel: false } },
                    { session }
                );
                 if (placaUpdateResult.matchedCount === 0) {
                     // Isso indicaria um problema sério (placa não encontrada após verificação implícita)
                     throw new Error(`Placa ${placa_id} não encontrada para atualização de status durante a criação do aluguel.`);
                 }
                 logger.debug(`[AluguelService] Placa ${placa_id} marcada como indisponível.`);
            } else {
                 logger.debug(`[AluguelService] Aluguel ${novoAluguelDoc._id} não está ativo hoje. Status da placa ${placa_id} não alterado.`);
            }

            logger.debug(`[AluguelService] Commitando transação ${novoAluguelDoc._id}.`);
            await session.commitTransaction();
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} criado com sucesso e transação commitada.`);

            // Retorna o documento populado após o commit (fora da transação)
            const aluguelPopuladodo = await Aluguel.findById(novoAluguelDoc._id)
                                                  .populate('cliente', 'nome logo_url')
                                                  .lean() // Retorna objeto simples
                                                  .exec();
            return aluguelPopuladodo; // Mapeamento _id -> id deve ocorrer globalmente

        } catch (error) {
            logger.warn(`[AluguelService] Abortando transação devido a erro: ${error.message}`);
            await session.abortTransaction();

            // Log detalhado do erro
            logger.error(`[AluguelService] Erro Mongoose/DB ao criar aluguel (transação abortada): ${error.message}`, { stack: error.stack, code: error.code });

            // Relança erros específicos (400, 409) ou um erro 500 genérico
            if (error.status === 400 || error.status === 409) {
                throw error;
            } else {
                 const serviceError = new Error(`Erro interno ao criar aluguel: ${error.message}`);
                 serviceError.status = 500;
                 throw serviceError;
            }
        } finally {
            logger.debug('[AluguelService] Finalizando sessão Mongoose.');
            session.endSession();
        }
    }

    /**
     * Apaga um aluguel (cancela uma reserva) e atualiza o status da placa se necessário, usando transação.
     * @param {string} aluguel_id - ObjectId do aluguel a ser apagado.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<{success: boolean, message: string}>} - Confirmação de sucesso.
     * @throws {Error} - Lança erro com status 404 ou 500.
     */
    async deleteAluguel(aluguel_id, empresa_id) {
        logger.info(`[AluguelService] Tentando apagar aluguel ${aluguel_id} para empresa ${empresa_id}.`);
        const session = await mongoose.startSession();
        logger.debug('[AluguelService] Iniciando transação Mongoose para apagar aluguel.');
        session.startTransaction();

        try {
            // 1. Encontra o aluguel para obter o ID da placa (dentro da transação)
            logger.debug(`[AluguelService] Buscando aluguel ${aluguel_id} na transação.`);
            const aluguel = await Aluguel.findOne({ _id: aluguel_id, empresa: empresa_id })
                                         .select('placa data_inicio data_fim') // Seleciona campos necessários
                                         .lean() // Objeto simples é suficiente aqui
                                         .session(session).exec();
            if (!aluguel) {
                const error = new Error('Aluguel não encontrado.');
                error.status = 404;
                logger.warn(`[AluguelService] Falha ao apagar aluguel: ${error.message}`);
                throw error; // Abortará a transação
            }
            const placaId = aluguel.placa; // É um ObjectId
            logger.debug(`[AluguelService] Aluguel ${aluguel_id} encontrado, associado à placa ${placaId}.`);

            // 2. Apaga o aluguel (dentro da transação)
            logger.debug(`[AluguelService] Apagando aluguel ${aluguel_id} do DB.`);
            const deleteResult = await Aluguel.deleteOne({ _id: aluguel_id }).session(session);
            if (deleteResult.deletedCount === 0) {
                 // Segurança extra, mas findOne já deveria ter falhado se não existisse
                 throw new Error('Aluguel não encontrado durante a exclusão na transação.');
            }
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado na transação.`);

            // 3. Verifica se o aluguel apagado *estava* ativo hoje
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            const eraAtivoHoje = (new Date(aluguel.data_inicio) <= hoje && new Date(aluguel.data_fim) >= hoje);

            // 4. Se era ativo, verifica se há OUTROS alugueis ativos HOJE para a mesma placa (dentro da transação)
            let outroAluguelAtivo = null;
            if (eraAtivoHoje) {
                 logger.debug(`[AluguelService] Aluguel apagado ${aluguel_id} estava ativo. Verificando outros alugueis ativos para placa ${placaId}.`);
                 outroAluguelAtivo = await Aluguel.findOne({
                    placa: placaId,
                    empresa: empresa_id,
                    _id: { $ne: aluguel_id }, // Exclui o aluguel que acabou de ser apagado (embora já não exista)
                    data_inicio: { $lte: hoje },
                    data_fim: { $gte: hoje }
                 }).lean().session(session).exec(); // Executa dentro da sessão
            }

            // 5. Se o aluguel apagado era ativo E NÃO há mais nenhum ativo, torna a placa disponível (dentro da transação)
            if (eraAtivoHoje && !outroAluguelAtivo) {
                logger.debug(`[AluguelService] Nenhum outro aluguel ativo encontrado para placa ${placaId}. Marcando como disponível.`);
                const placaUpdateResult = await Placa.updateOne(
                    { _id: placaId, empresa: empresa_id },
                    { $set: { disponivel: true } },
                    { session }
                );
                 if (placaUpdateResult.matchedCount === 0) {
                     // Isso indicaria um problema (placa não encontrada)
                     throw new Error(`Placa ${placaId} não encontrada para atualização de status durante a exclusão do aluguel.`);
                 }
                 logger.debug(`[AluguelService] Placa ${placaId} marcada como disponível.`);
            } else if (eraAtivoHoje && outroAluguelAtivo) {
                 logger.debug(`[AluguelService] Outro aluguel ativo (ID: ${outroAluguelAtivo._id}) encontrado para placa ${placaId}. Mantendo como indisponível.`);
            } else {
                 logger.debug(`[AluguelService] Aluguel apagado ${aluguel_id} não estava ativo hoje. Status da placa ${placaId} não alterado.`);
            }


            logger.debug(`[AluguelService] Commitando transação para aluguel ${aluguel_id}.`);
            await session.commitTransaction();
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado com sucesso e transação commitada.`);

            return { success: true, message: 'Aluguel cancelado com sucesso.' };

        } catch (error) {
            logger.warn(`[AluguelService] Abortando transação de exclusão devido a erro: ${error.message}`);
            await session.abortTransaction();

            // Log detalhado do erro
            logger.error(`[AluguelService] Erro Mongoose/DB ao apagar aluguel (transação abortada): ${error.message}`, { stack: error.stack, code: error.code });

             // Relança erros específicos (404) ou um erro 500 genérico
            if (error.status === 404) {
                 throw error;
            } else {
                 const serviceError = new Error(`Erro interno ao cancelar aluguel: ${error.message}`);
                 serviceError.status = 500;
                 throw serviceError;
            }
        } finally {
            logger.debug('[AluguelService] Finalizando sessão Mongoose.');
            session.endSession();
        }
    }
}

module.exports = AluguelService; // Exporta a classe
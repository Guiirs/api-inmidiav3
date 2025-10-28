// services/aluguelService.js
const mongoose = require('mongoose'); // Necessário para transações e ObjectId
const Aluguel = require('../models/Aluguel'); // Modelo Aluguel Mongoose
const Placa = require('../models/Placa');     // Modelo Placa Mongoose
const Cliente = require('../models/Cliente'); // Modelo Cliente (para populate)
const logger = require('../config/logger'); // Importa o logger

// Verifica se está em ambiente de teste (JEST_WORKER_ID é definido pelo Jest)
const isTestEnvironment = process.env.JEST_WORKER_ID !== undefined;
const useTransactions = !isTestEnvironment; // Desativa transações APENAS em teste

if (!useTransactions) {
    // Adiciona um log mais visível para confirmar a desativação
    console.warn('\n[[[ ALERTA DE TESTE: Transações Mongoose DESABILITADAS ]]]\n');
    logger.warn('[AluguelService] TRANSAÇÕES MONGOOSE DESABILITADAS (Ambiente de Teste Detectado via JEST_WORKER_ID)');
}

class AluguelService {
    constructor() {}

    /**
     * Obtém todos os alugueis para uma placa específica, retornando objetos simples.
     * @param {string} placa_id - ObjectId da placa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com os dados dos alugueis (populados com cliente).
     * @throws {Error} - Lança erro com status 400 (ID inválido) ou 500 (Erro interno).
     */
    async getAlugueisByPlaca(placa_id, empresa_id) {
        logger.info(`[AluguelService] Iniciando getAlugueisByPlaca para placa ${placa_id} na empresa ${empresa_id}.`);
        if (!placa_id || !mongoose.Types.ObjectId.isValid(placa_id)) {
             const error = new Error(`ID da placa inválido fornecido: ${placa_id}`);
             error.status = 400; // Bad Request
             logger.error(`[AluguelService] ${error.message}`);
             throw error;
        }

        try {
            let alugueisDocs; // Mudar nome para indicar que são documentos Mongoose
            try {
                logger.debug('[AluguelService] Executando Aluguel.find()...');
                // <<< CORREÇÃO (Populate): Remover .lean() daqui >>>
                alugueisDocs = await Aluguel.find({ placa: placa_id, empresa: empresa_id })
                                            .populate('cliente', 'nome logo_url') // Popula nome e logo
                                            .sort({ data_inicio: -1 })
                                            // .lean() // REMOVIDO! Precisamos dos Mongoose docs para toJSON funcionar corretamente com populate
                                            .exec();
                logger.info(`[AluguelService] Query concluída. ${alugueisDocs.length} alugueis encontrados para placa ${placa_id}.`);
            } catch (dbError) {
                logger.error(`[AluguelService] ERRO DURANTE A QUERY MONGOOSE: ${dbError.message}`, { stack: dbError.stack });
                throw dbError; // Relança para o catch externo
            }

            try {
                logger.debug('[AluguelService] Iniciando conversão para JSON e mapeamento...');
                // <<< CORREÇÃO (Populate): Usar toJSON() em cada documento >>>
                const alugueis = alugueisDocs.map(doc => {
                    const obj = doc.toJSON(); // Aplica a transformação global (_id -> id, remove __v)

                    // Adiciona cliente_nome após a transformação toJSON
                    // A transformação toJSON deve ter mapeado cliente._id para cliente.id se populado
                    obj.cliente_nome = obj.cliente?.nome || 'Cliente Apagado';

                    // Garante que o campo cliente seja null se não foi populado corretamente
                    // (toJSON pode retornar cliente como null ou um objeto sem 'id')
                    if (!obj.cliente || !obj.cliente.id) {
                        obj.cliente = null;
                    }
                    return obj;
                });
                // <<< FIM CORREÇÃO >>>
                logger.debug('[AluguelService] Mapeamento toJSON e cliente_nome concluído.');
                return alugueis; // Retorna os objetos simples transformados

            } catch (mapError) {
                logger.error(`[AluguelService] ERRO DURANTE O MAPEAMENTO toJSON: ${mapError.message}`, { stack: mapError.stack });
                throw mapError; // Relança para o catch externo
            }

        } catch (error) { // Catch externo (pega erros da query ou do mapeamento)
            logger.error(`[AluguelService] Erro final em getAlugueisByPlaca: ${error.message}`, { stack: error.stack });
            const serviceError = new Error(`Erro interno ao buscar histórico de alugueis: ${error.message}`);
            serviceError.status = error.status || 500; // Usa 400 se veio da validação, senão 500
            throw serviceError;
        }
    }

    /**
     * Cria um novo aluguel (reserva) para uma placa, usando transação (exceto em testes).
     * @param {object} aluguelData - Dados do aluguel (placa_id, cliente_id, data_inicio, data_fim).
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento do novo aluguel criado (populado e com id mapeado).
     * @throws {Error} - Lança erro com status 400, 404, 409 ou 500.
     */
    async createAluguel(aluguelData, empresa_id) {
        logger.info(`[AluguelService] Tentando criar aluguel para empresa ${empresa_id}.`);
        logger.debug(`[AluguelService] Dados recebidos: ${JSON.stringify(aluguelData)}`);
        const { placa_id, cliente_id, data_inicio, data_fim } = aluguelData;

        // Validação das datas (Usando UTC para zerar horas)
        let inicioDate, fimDate;
        try {
            inicioDate = new Date(data_inicio); inicioDate.setUTCHours(0, 0, 0, 0);
            fimDate = new Date(data_fim); fimDate.setUTCHours(0, 0, 0, 0);
            if (isNaN(inicioDate.getTime()) || isNaN(fimDate.getTime())) {
                throw new Error('Formato de data inválido.');
            }
        } catch (dateError) {
             const error = new Error(`Datas inválidas fornecidas: ${dateError.message}`);
             error.status = 400; logger.warn(`[AluguelService] Falha: ${error.message}`); throw error;
        }

        // Comparação segura usando getTime()
        if (fimDate.getTime() <= inicioDate.getTime()) {
             const error = new Error('A data final deve ser posterior à data inicial.');
             error.status = 400; logger.warn(`[AluguelService] Falha: ${error.message}`); throw error;
        }

        const session = useTransactions ? await mongoose.startSession() : null;
        if (session) {
            logger.debug('[AluguelService] Iniciando transação Mongoose para criar aluguel.');
            session.startTransaction();
        } else {
            logger.debug('[AluguelService] Transações desabilitadas (ambiente de teste).');
        }

        try {
            // <<< CORREÇÃO (Conflito): Lógica de verificação de sobreposição >>>
            logger.debug(`[AluguelService] Verificando conflitos para placa ${placa_id} entre ${inicioDate.toISOString()} e ${fimDate.toISOString()}`);
            // Condição: Existe algum aluguel onde o início é ANTES do fim do novo, E o fim é DEPOIS do início do novo?
            const conflictingAluguel = await Aluguel.findOne({
                placa: placa_id,
                empresa: empresa_id,
                data_inicio: { $lt: fimDate },     // Início Existente < Fim Novo
                data_fim: { $gt: inicioDate }       // Fim Existente > Início Novo
            }).lean().session(session).exec(); // Lean aqui é ok, só para verificar existência

            if (conflictingAluguel) {
                logger.warn(`[AluguelService] CONFLITO DETECTADO! Aluguel existente ID ${conflictingAluguel._id} (${conflictingAluguel.data_inicio.toISOString()} - ${conflictingAluguel.data_fim.toISOString()}) conflita com novo período.`);
                const error = new Error(`Esta placa (ID: ${placa_id}) já está reservada total ou parcialmente no período solicitado.`);
                error.status = 409; // Conflict
                throw error; // Lança o erro para o catch
            }
            logger.debug(`[AluguelService] Nenhum conflito encontrado.`);
            // <<< FIM CORREÇÃO >>>

            // Cria o aluguel
            logger.debug(`[AluguelService] Tentando salvar novo aluguel no DB.`);
            const createOptions = session ? { session } : {};
            const [novoAluguelDoc] = await Aluguel.create([{
                placa: placa_id, cliente: cliente_id,
                data_inicio: inicioDate, // Usa data UTC zerada
                data_fim: fimDate,       // Usa data UTC zerada
                empresa: empresa_id
            }], createOptions);
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} criado ${session ? 'na transação' : ''}.`);

            // Verifica se está ativo HOJE (comparando datas UTC zeradas)
            const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
            const isAtivoHoje = (inicioDate.getTime() <= hoje.getTime() && fimDate.getTime() >= hoje.getTime());

            if (isAtivoHoje) {
                logger.debug(`[AluguelService] Aluguel ${novoAluguelDoc._id} ATIVO hoje. Atualizando placa ${placa_id} para indisponível.`);
                const updateOptions = session ? { session } : {};
                const placaUpdateResult = await Placa.updateOne(
                    { _id: placa_id, empresa: empresa_id },
                    { $set: { disponivel: false } },
                    updateOptions
                );
                 if (placaUpdateResult.matchedCount === 0) {
                     const placaError = new Error(`Placa ${placa_id} não encontrada para atualização de status durante a criação do aluguel.`);
                     placaError.status = 404; // Not Found
                     logger.error(`[AluguelService] ${placaError.message}`);
                     throw placaError; // Lança erro 404
                 }
                 logger.debug(`[AluguelService] Placa ${placa_id} marcada como indisponível.`);
            } else {
                 const motivo = inicioDate.getTime() > hoje.getTime() ? 'começa no futuro' : 'já terminou';
                 logger.debug(`[AluguelService] Aluguel ${novoAluguelDoc._id} NÃO ativo hoje (${motivo}). Status da placa ${placa_id} não alterado.`);
            }

            // Commita condicionalmente
            if (session) {
                logger.debug(`[AluguelService] Commitando transação ${novoAluguelDoc._id}.`);
                await session.commitTransaction();
            }
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} processado com sucesso.`);

            // Busca novamente SEM lean para poder usar toJSON e ter certeza que o populate funcionou
            const aluguelCriado = await Aluguel.findById(novoAluguelDoc._id)
                                                  .populate('cliente', 'nome logo_url')
                                                  .exec(); // Sem .lean()

             if (aluguelCriado) {
                 const obj = aluguelCriado.toJSON(); // Aplica toJSON
                 obj.cliente_nome = obj.cliente?.nome || 'Cliente Apagado';
                 if (!obj.cliente || !obj.cliente.id) obj.cliente = null; // Garante null se não populado
                 return obj;
             } else {
                 // Isso não deveria acontecer após a criação bem-sucedida
                 logger.error(`[AluguelService] ERRO INESPERADO: Aluguel ${novoAluguelDoc._id} não encontrado após criação/commit.`);
                 throw new Error('Erro ao buscar aluguel recém-criado.'); // Lança 500
             }

        } catch (error) {
             // Aborta condicionalmente
             if (session && session.inTransaction()) {
                 logger.warn(`[AluguelService] Abortando transação devido a erro: ${error.message}`);
                 await session.abortTransaction();
             }
             logger.error(`[AluguelService] Erro ao criar aluguel: ${error.message}`, { stack: error.stack, status: error.status });
             // Relança erros específicos ou um erro 500 genérico
             if (error.status === 400 || error.status === 409 || error.status === 404) {
                 throw error;
             } else {
                 const serviceError = new Error(`Erro interno ao criar aluguel: ${error.message}`);
                 serviceError.status = 500;
                 throw serviceError;
             }
        } finally {
            // Finaliza sessão condicionalmente
            if (session) {
                logger.debug('[AluguelService] Finalizando sessão Mongoose.');
                await session.endSession();
            }
         }
    }

    /**
     * Apaga um aluguel (cancela uma reserva) e atualiza o status da placa se necessário, usando transação (exceto em testes).
     * @param {string} aluguel_id - ObjectId do aluguel a ser apagado.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<{success: boolean, message: string}>} - Confirmação de sucesso.
     * @throws {Error} - Lança erro com status 404 ou 500.
     */
    async deleteAluguel(aluguel_id, empresa_id) {
        logger.info(`[AluguelService] Tentando apagar aluguel ${aluguel_id} para empresa ${empresa_id}.`);
        const session = useTransactions ? await mongoose.startSession() : null;
        if (session) {
            logger.debug('[AluguelService] Iniciando transação Mongoose para apagar aluguel.');
            session.startTransaction();
        } else {
            logger.debug('[AluguelService] Transações desabilitadas (ambiente de teste).');
        }

        try {
            // 1. Encontra o aluguel (lean é ok aqui pois só precisamos do ID da placa e datas)
            logger.debug(`[AluguelService] Buscando aluguel ${aluguel_id}...`);
            const aluguel = await Aluguel.findOne({ _id: aluguel_id, empresa: empresa_id })
                                         .select('placa data_inicio data_fim')
                                         .lean().session(session).exec(); // Passa session
            if (!aluguel) {
                 const error = new Error('Aluguel não encontrado.'); error.status = 404;
                 logger.warn(`[AluguelService] Falha: ${error.message}`); throw error;
            }
            const placaId = aluguel.placa; // Guarda o ObjectId da placa
            logger.debug(`[AluguelService] Aluguel ${aluguel_id} encontrado, placa ${placaId}.`);

            // 2. Apaga o aluguel
            logger.debug(`[AluguelService] Apagando aluguel ${aluguel_id} do DB.`);
            const deleteOptions = session ? { session } : {};
            const deleteResult = await Aluguel.deleteOne({ _id: aluguel_id }, deleteOptions);
            if (deleteResult.deletedCount === 0) {
                 // Erro inesperado, pois o aluguel foi encontrado antes
                 throw new Error('Aluguel não encontrado durante a exclusão.');
            }
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado ${session ? 'na transação' : ''}.`);

            // 3. Verifica se era ativo hoje (com horas zeradas UTC)
            const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
            const inicioAluguel = new Date(aluguel.data_inicio); inicioAluguel.setUTCHours(0,0,0,0);
            const fimAluguel = new Date(aluguel.data_fim); fimAluguel.setUTCHours(0,0,0,0);
            const eraAtivoHoje = (inicioAluguel.getTime() <= hoje.getTime() && fimAluguel.getTime() >= hoje.getTime());

            // 4. Se era ativo, verifica outros ativos para a MESMA placaId
            let outroAluguelAtivo = null;
            if (eraAtivoHoje) {
                 logger.debug(`[AluguelService] Verificando outros alugueis ativos para placa ${placaId}...`);
                 outroAluguelAtivo = await Aluguel.findOne({
                    placa: placaId, // <<< Usa o placaId guardado
                    empresa: empresa_id,
                    data_inicio: { $lte: hoje },
                    data_fim: { $gte: hoje }
                 }).lean().session(session).exec(); // Lean ok
            }

            // 5. Atualiza placa se necessário
            if (eraAtivoHoje && !outroAluguelAtivo) {
                logger.debug(`[AluguelService] Nenhum outro aluguel ativo. Marcando placa ${placaId} como disponível.`);
                 const updateOptions = session ? { session } : {};
                const placaUpdateResult = await Placa.updateOne(
                    { _id: placaId, empresa: empresa_id }, // <<< Usa o placaId guardado
                    { $set: { disponivel: true } },
                    updateOptions
                );
                 // Trata placa não encontrada como aviso, não erro fatal
                 if (placaUpdateResult.matchedCount === 0) {
                      logger.warn(`[AluguelService] Placa ${placaId} não encontrada para atualização após deletar aluguel ${aluguel_id}. Pode já ter sido deletada.`);
                 } else if (placaUpdateResult.modifiedCount > 0) { // Loga apenas se realmente modificou
                     logger.debug(`[AluguelService] Placa ${placaId} marcada como disponível.`);
                 }
            } else if (eraAtivoHoje && outroAluguelAtivo) {
                 logger.debug(`[AluguelService] Outro aluguel ativo (ID: ${outroAluguelAtivo._id}) encontrado para placa ${placaId}. Mantendo placa indisponível.`);
            } else {
                 logger.debug(`[AluguelService] Aluguel apagado ${aluguel_id} não estava ativo hoje. Status da placa ${placaId} não alterado.`);
            }

            // Commita condicionalmente
            if (session) {
                logger.debug(`[AluguelService] Commitando transação delete ${aluguel_id}.`);
                await session.commitTransaction();
            }
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado com sucesso.`);

            return { success: true, message: 'Aluguel cancelado com sucesso.' };

        } catch (error) {
             // Aborta condicionalmente
             if (session && session.inTransaction()) {
                 logger.warn(`[AluguelService] Abortando transação delete devido a erro: ${error.message}`);
                 await session.abortTransaction();
             }
             logger.error(`[AluguelService] Erro ao apagar aluguel: ${error.message}`, { stack: error.stack, status: error.status });
             // Relança erros específicos ou 500
             if (error.status === 404) {
                 throw error;
             } else {
                 const serviceError = new Error(`Erro interno ao cancelar aluguel: ${error.message}`);
                 serviceError.status = 500;
                 throw serviceError;
             }
        } finally {
             // Finaliza sessão condicionalmente
             if (session) {
                 logger.debug('[AluguelService] Finalizando sessão Mongoose.');
                 await session.endSession();
             }
         }
    }
}

module.exports = AluguelService;
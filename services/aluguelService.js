// services/aluguelService.js
const mongoose = require('mongoose'); 
const Aluguel = require('../models/Aluguel');     // Modelo Aluguel (corrigido no Passo 01)
const Placa = require('../models/Placa');     
const Cliente = require('../models/Cliente'); // Modelo Cliente (para populate)
const logger = require('../config/logger'); 
const AppError = require('../utils/AppError'); // [MELHORIA] Importa AppError
const notificationService = require('./notificationService'); // [NOVO] Notificações WebSocket
const webhookService = require('./webhookService'); // [NOVO] Webhooks
const sseController = require('../controllers/sseController'); // [NOVO] SSE

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
     * @param {string} placaId - ObjectId da placa.
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<Array<object>>} - Array com os dados dos alugueis (populados com cliente).
     * @throws {AppError} - Lança erro com status 500 (Erro interno) ou delega 400 (ID inválido).
     */
    async getAlugueisByPlaca(placaId, empresa_id) {
        logger.info(`[AluguelService] Iniciando getAlugueisByPlaca para placa ${placaId} na empresa ${empresa_id}.`);
        
        // [MELHORIA] Removida verificação de mongoose.Types.ObjectId.isValid(). 
        // A rota (Passo 06) já valida, ou o errorHandler captura o CastError (400).

        try {
            logger.debug('[AluguelService] Executando Aluguel.find()...');
            
            // Campos no model corrigido: 'placa' e 'cliente'
            const alugueisDocs = await Aluguel.find({ placa: placaId, empresa: empresa_id })
                                            .populate('cliente', 'nome logo_url') 
                                            .sort({ data_inicio: -1 })
                                            .exec(); 
            logger.info(`[AluguelService] Query concluída. ${alugueisDocs.length} alugueis encontrados para placa ${placaId}.`);
            
            logger.debug('[AluguelService] Iniciando conversão para JSON e mapeamento...');
            
            // Usa o toJSON para aplicar a transformação global (_id -> id, remove __v)
            const alugueis = alugueisDocs.map(doc => {
                const obj = doc.toJSON();

                // Adiciona cliente_nome após a transformação toJSON (lógica mantida)
                obj.cliente_nome = obj.cliente?.nome || 'Cliente Apagado'; 

                // Garante que o campo cliente seja null se não foi populado corretamente
                if (!obj.cliente || !obj.cliente.id) {
                    obj.cliente = null;
                }
                return obj;
            });

            logger.debug('[AluguelService] Mapeamento toJSON e cliente_nome concluído.');
            return alugueis; 

        } catch (error) { 
            logger.error(`[AluguelService] Erro final em getAlugueisByPlaca: ${error.message}`, { stack: error.stack });
            // [MELHORIA] Relança AppErrors ou lança 500
            if (error instanceof AppError) throw error; 
            throw new AppError(`Erro interno ao buscar histórico de alugueis: ${error.message}`, 500);
        }
    }

    /**
     * Cria um novo aluguel (reserva) para uma placa, usando transação (exceto em testes).
     * @param {object} aluguelData - Dados do aluguel (placa_id, cliente_id, data_inicio, data_fim).
     * @param {string} empresa_id - ObjectId da empresa.
     * @returns {Promise<object>} - O documento do novo aluguel criado (populado e com id mapeado).
     * @throws {AppError} - Lança erro com status 400, 404, 409 ou 500.
     */
    async createAluguel(aluguelData, empresa_id) {
        logger.info(`[AluguelService] Tentando criar aluguel para empresa ${empresa_id}.`);
        const { placa_id, cliente_id, data_inicio, data_fim } = aluguelData;

        // Validação das datas (Convertida para AppError)
        let inicioDate, fimDate;
        try {
            inicioDate = new Date(data_inicio); inicioDate.setUTCHours(0, 0, 0, 0);
            fimDate = new Date(data_fim); fimDate.setUTCHours(0, 0, 0, 0);

            if (isNaN(inicioDate.getTime()) || isNaN(fimDate.getTime())) {
                throw new AppError('Formato de data inválido.', 400); 
            }
        } catch (dateError) {
             if (dateError instanceof AppError) throw dateError;
             throw new AppError(`Datas inválidas fornecidas.`, 400); 
        }

        // Comparação de datas (Convertida para AppError)
        if (fimDate.getTime() <= inicioDate.getTime()) {
             throw new AppError('A data final deve ser posterior à data inicial.', 400);
        }

        const session = useTransactions ? await mongoose.startSession() : null;
        if (session) {
            logger.debug('[AluguelService] Iniciando transação Mongoose para criar aluguel.');
            session.startTransaction();
        } else {
            logger.debug('[AluguelService] Transações desabilitadas (ambiente de teste).');
        }

        try {
            // Lógica de verificação de sobreposição (mantida)
            logger.debug(`[AluguelService] Verificando conflitos para placa ${placa_id}...`);
            
            const conflictingAluguel = await Aluguel.findOne({
                placa: placa_id,
                empresa: empresa_id,
                data_inicio: { $lt: fimDate },
                data_fim: { $gt: inicioDate }
            }).lean().session(session).exec();

            if (conflictingAluguel) {
                logger.warn(`[AluguelService] CONFLITO DETECTADO! Aluguel existente ID ${conflictingAluguel._id} conflita com novo período.`);
                // [MELHORIA] Usa AppError
                throw new AppError(`Esta placa (ID: ${placa_id}) já está reservada total ou parcialmente no período solicitado.`, 409);
            }
            logger.debug(`[AluguelService] Nenhum conflito encontrado.`);

            // Cria o aluguel 
            logger.debug(`[AluguelService] Tentando salvar novo aluguel no DB.`);
            const createOptions = session ? { session } : {};
            const [novoAluguelDoc] = await Aluguel.create([{
                placa: placa_id, 
                cliente: cliente_id,
                data_inicio: inicioDate, 
                data_fim: fimDate,       
                empresa: empresa_id
            }], createOptions);
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} criado ${session ? 'na transação' : ''}.`);

            // Verificação de status de placa (mantida)
            const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
            const isAtivoHoje = (inicioDate.getTime() <= hoje.getTime() && fimDate.getTime() >= hoje.getTime());

            // REMOVIDO: A lógica de atualização do campo 'disponivel' foi removida.
            // O campo 'disponivel' agora é usado APENAS para manutenção manual.
            // O status de aluguel é determinado dinamicamente pela existência de aluguéis ativos.

            // Commita condicionalmente
            if (session) {
                logger.debug(`[AluguelService] Commitando transação ${novoAluguelDoc._id}.`);
                await session.commitTransaction();
            }
            logger.info(`[AluguelService] Aluguel ${novoAluguelDoc._id} processado com sucesso.`);

            // Busca e formata o resultado (usando toJSON)
            const aluguelCriado = await Aluguel.findById(novoAluguelDoc._id)
                                                  .populate('cliente', 'nome logo_url')
                                                  .populate('placa', 'numero_placa')
                                                  .exec(); 

             if (aluguelCriado) {
                 const obj = aluguelCriado.toJSON(); 
                 obj.cliente_nome = obj.cliente?.nome || 'Cliente Apagado';
                 if (!obj.cliente || !obj.cliente.id) obj.cliente = null;
                 
                 // [NOVO] Dispara notificações em tempo real
                 try {
                     const notificacaoData = {
                         aluguel_id: obj.id,
                         placa: obj.placa?.numero_placa || placa_id,
                         cliente: obj.cliente_nome,
                         data_inicio: obj.data_inicio,
                         data_fim: obj.data_fim
                     };

                     // WebSocket
                     notificationService.notifyEmpresa(
                         empresa_id,
                         notificationService.TYPES.ALUGUEL_CRIADO,
                         notificacaoData
                     );

                     // SSE
                     sseController.notificarEmpresa(
                         empresa_id,
                         'aluguel_criado',
                         notificacaoData
                     );

                     // Webhook
                     webhookService.disparar(
                         empresa_id,
                         'aluguel_criado',
                         notificacaoData
                     ).catch(err => logger.error(`[AluguelService] Erro ao disparar webhook: ${err.message}`));

                     logger.info(`[AluguelService] Notificações disparadas para aluguel ${obj.id}`);
                 } catch (notifError) {
                     logger.error(`[AluguelService] Erro ao enviar notificações: ${notifError.message}`);
                     // Não falha a operação se notificação falhar
                 }
                 
                 return obj;
             } else {
                 logger.error(`[AluguelService] ERRO INESPERADO: Aluguel ${novoAluguelDoc._id} não encontrado após criação/commit.`);
                 throw new AppError('Erro ao buscar aluguel recém-criado.', 500);
             }

        } catch (error) {
             if (session && session.inTransaction()) {
                 logger.warn(`[AluguelService] Abortando transação devido a erro: ${error.message}`);
                 await session.abortTransaction();
             }
             logger.error(`[AluguelService] Erro ao criar aluguel: ${error.message}`, { stack: error.stack, status: error.status });
             
             // [MELHORIA] Relança AppErrors específicos ou lança 500
             if (error instanceof AppError) throw error; 
             throw new AppError(`Erro interno ao criar aluguel: ${error.message}`, 500);
        } finally {
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
     * @throws {AppError} - Lança erro com status 404 ou 500.
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
            // 1. Encontra o aluguel 
            logger.debug(`[AluguelService] Buscando aluguel ${aluguel_id}...`);
            const aluguel = await Aluguel.findOne({ _id: aluguel_id, empresa: empresa_id })
                                         .select('placa data_inicio data_fim')
                                         .lean().session(session).exec();
            if (!aluguel) {
                 // [MELHORIA] Usa AppError
                 throw new AppError('Aluguel não encontrado.', 404);
            }
            const placaId = aluguel.placa;
            logger.debug(`[AluguelService] Aluguel ${aluguel_id} encontrado, placa ${placaId}.`);

            // 2. Apaga o aluguel
            logger.debug(`[AluguelService] Apagando aluguel ${aluguel_id} do DB.`);
            const deleteOptions = session ? { session } : {};
            const deleteResult = await Aluguel.deleteOne({ _id: aluguel_id }, deleteOptions);
            if (deleteResult.deletedCount === 0) {
                 throw new AppError('Falha ao apagar o aluguel.', 500);
            }
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado ${session ? 'na transação' : ''}.`);

            // 3. Verifica se era ativo hoje (com horas zeradas UTC)
            const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
            const inicioAluguel = new Date(aluguel.data_inicio); inicioAluguel.setUTCHours(0,0,0,0);
            const fimAluguel = new Date(aluguel.data_fim); fimAluguel.setUTCHours(0,0,0,0);
            const eraAtivoHoje = (inicioAluguel.getTime() <= hoje.getTime() && fimAluguel.getTime() >= hoje.getTime());

            // REMOVIDO: A lógica de verificação e atualização do campo 'disponivel' foi removida.
            // O campo 'disponivel' agora é usado APENAS para manutenção manual.
            // O status de aluguel é determinado dinamicamente pela existência de aluguéis ativos.

            // Commita condicionalmente
            if (session) {
                logger.debug(`[AluguelService] Commitando transação delete ${aluguel_id}.`);
                await session.commitTransaction();
            }
            logger.info(`[AluguelService] Aluguel ${aluguel_id} apagado com sucesso.`);

            return { success: true, message: 'Aluguel cancelado com sucesso.' };

        } catch (error) {
             if (session && session.inTransaction()) {
                 logger.warn(`[AluguelService] Abortando transação delete devido a erro: ${error.message}`);
                 await session.abortTransaction();
             }
             logger.error(`[AluguelService] Erro ao apagar aluguel: ${error.message}`, { stack: error.stack, status: error.status });
             
             // [MELHORIA] Relança AppErrors específicos ou lança 500
             if (error instanceof AppError) throw error;
             throw new AppError(`Erro interno ao cancelar aluguel: ${error.message}`, 500);
        } finally {
             if (session) {
                 logger.debug('[AluguelService] Finalizando sessão Mongoose.');
                 await session.endSession();
             }
         }
    }
}

module.exports = AluguelService;